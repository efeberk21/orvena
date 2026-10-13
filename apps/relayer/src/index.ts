import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { createPublicClient, createWalletClient, decodeFunctionData, defineChain, http, isAddress, isHex, parseEther, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { approvalsAbi, monadTestnet, registryAbi } from '@orvena/sdk';
import { BudgetLedger } from './budget.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
if (process.env.ORVENA_MODE === 'sandbox') config({ path: fileURLToPath(new URL('../../../.env.sandbox', import.meta.url)), override: true, quiet: true });
const rpcUrl = process.env.MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0];
const chainId = Number(process.env.VITE_CHAIN_ID || 10143);
const serverless = process.env.ORVENA_DEPLOYMENT === 'vercel';
if (serverless && (chainId !== 10143 || !process.env.APP_ORIGIN?.startsWith('https://'))) throw new Error('Public sponsor requires Monad testnet and a fixed HTTPS origin.');
if (![10143, 31337].includes(chainId)) throw new Error('Only Monad testnet and local development are supported.');
const localTesting = chainId === 31337 && process.env.ORVENA_MODE === 'sandbox' && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(rpcUrl).hostname);
const server = Fastify({ ajv: { customOptions: { removeAdditional: false } }, logger: { redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie', 'req.body'] }, bodyLimit: 70000, trustProxy: process.env.RELAYER_TRUST_PROXY === 'loopback' ? 'loopback' : false });
await server.register(rateLimit, { global: false });
server.addHook('onSend', async (_request, reply) => { reply.header('X-Frame-Options', 'DENY'); reply.header('Content-Security-Policy', "frame-ancestors 'none'"); });
const chain = chainId === 10143 ? monadTestnet : defineChain({ id: 31337, name: 'Local development', nativeCurrency: monadTestnet.nativeCurrency, rpcUrls: { default: { http: [rpcUrl] } } });
const registry = process.env.REGISTRY_ADDRESS;
const approvals = process.env.APPROVALS_ADDRESS;
const privateKey = process.env.RELAYER_PRIVATE_KEY;
if (privateKey && !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error('Invalid RELAYER_PRIVATE_KEY format.');
if (registry && !isAddress(registry)) throw new Error('Invalid REGISTRY_ADDRESS format.');
if (approvals && !isAddress(approvals)) throw new Error('Invalid APPROVALS_ADDRESS format.');
const account = privateKey && process.env.RELAYER_READ_ONLY !== '1' ? privateKeyToAccount(privateKey as Hex) : undefined;
const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 10000 }) });
const wallet = account ? createWalletClient({ account, chain, transport: http(rpcUrl) }) : undefined;
const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
const maxGas = BigInt(process.env.RELAYER_MAX_GAS || '1500000');
const budget = parseEther(process.env.RELAYER_BUDGET_MON || '0.1');
if (maxGas <= 0n || budget <= 0n) throw new Error('Relayer gas and budget must be positive.');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const ledger = new BudgetLedger(resolve(root, process.env.RELAYER_STATE_FILE || `.local/relayer-${chainId}.json`), `${chainId}:${account?.address.toLowerCase() || 'disabled'}`, budget);
if (account && !localTesting && !serverless) await ledger.load();
let queue: Promise<unknown> = Promise.resolve();

server.get('/api/health', async () => ({ service: 'orvena-relayer', chainId, origin, registry: registry || null, approvals: approvals || null, sponsorshipReady: Boolean(account && registry && approvals), budgetScope: localTesting ? 'local development; no sponsored-fund budget' : serverless ? 'dedicated prefunded testnet sponsor; balance bounded by configured cap' : 'persistent maximum-fee reservations', rateLimitEnabled: !localTesting, reservedWei: serverless ? null : ledger.used.toString() }));
server.post<{ Body: { data: string; target?: 'registry' | 'approvals' } }>('/api/relay', { config: { rateLimit: localTesting ? false : { max: 15, timeWindow: '1 minute' } }, schema: { body: { type: 'object', required: ['data'], additionalProperties: false, properties: { data: { type: 'string', pattern: '^0x[0-9a-fA-F]+$', maxLength: 16002 }, target: { type: 'string', enum: ['registry', 'approvals'] } } } } }, async (request, reply) => {
  if (request.headers.origin && request.headers.origin !== origin) return reply.code(403).send({ error: 'Origin not allowed.' });
  const target = request.body.target === 'approvals' ? approvals : registry;
  if (!wallet || !account || !target) return reply.code(503).send({ error: 'Gas sponsorship is not configured yet.' });
  const data = request.body.data;
  if (!isHex(data) || data.length % 2 !== 0) return reply.code(400).send({ error: 'Invalid calldata.' });
  try {
    const call = decodeFunctionData({ abi: request.body.target === 'approvals' ? approvalsAbi : registryAbi, data });
    const allowed = request.body.target === 'approvals' ? ['approveContent', 'revokeApproval'] : ['createProfile'];
    if (!allowed.includes(call.functionName)) return reply.code(400).send({ error: 'Unsupported protocol action.' });
  } catch { return reply.code(400).send({ error: 'Invalid protocol calldata.' }); }
  const work = queue.then(async () => {
    if (await client.getChainId() !== chainId) throw new Error('RPC chain mismatch.');
    if (!await client.getCode({ address: target as Address })) throw new Error('Protocol contract is not deployed.');
    const estimated = await client.estimateGas({ account, to: target as Address, data });
    const gas = estimated * 120n / 100n;
    if (gas > maxGas) throw new Error('Gas limit exceeded.');
    const fees = await client.estimateFeesPerGas();
    const worstCost = gas * fees.maxFeePerGas;
    if (serverless) {
      const balance = await client.getBalance({ address: account.address });
      if (balance > budget) throw new Error('Dedicated sponsor exceeds its configured funding cap.');
      if (balance < worstCost) throw new Error('Sponsor balance exhausted.');
    } else if (!localTesting) await ledger.reserve(worstCost);
    // Reserve before broadcasting, including ambiguous RPC failures. No arbitrary calls or value transfer.
    const nonce = await client.getTransactionCount({ address: account.address, blockTag: 'pending' });
    const hash = await wallet.sendTransaction({ to: target as Address, data, gas, nonce, ...fees });
    // A function must finish mining work before returning; background promises can be frozen.
    if (serverless) await client.waitForTransactionReceipt({ hash, timeout: 45000 });
    return { hash };
  });
  // Return the broadcast hash immediately; keep later sends serialized until this nonce is mined.
  queue = (serverless ? work : work.then(({ hash }) => client.waitForTransactionReceipt({ hash, timeout: 120000 }))).catch(() => {});
  try { return await work; }
  catch (error) {
    const reason = error instanceof Error ? error.name : 'UnknownError';
    const shortMessage = typeof (error as { shortMessage?: unknown }).shortMessage === 'string' ? (error as { shortMessage: string }).shortMessage.split('\n')[0] : 'Sponsor validation or broadcast failed';
    request.log.warn({ reason, summary: shortMessage }, 'Approval protocol relay failed');
    return reply.code(422).send({ error: 'Transaction could not be relayed. Check signature, nonce, deadline, RPC and sponsor budget.' });
  }
});
if (process.env.SERVE_WEB === '1') {
  const { default: fastifyStatic } = await import('@fastify/static');
  const webRoot = resolve(root, 'apps/web/dist');
  await access(resolve(webRoot, 'index.html'));
  await server.register(fastifyStatic, { root: webRoot, dotfiles: 'deny' });
  server.setNotFoundHandler((request, reply) => {
    const pathname = request.url.split('?')[0];
    if (request.method === 'GET' && ['/', '/approve', '/example', '/verify', '/developer', '/wallet'].includes(pathname)) return reply.sendFile('index.html', { cacheControl: false });
    return reply.code(404).send({ error: 'Route not found.' });
  });
}
if (!serverless) await server.listen({ port: Number(process.env.RELAYER_PORT || 3001), host: process.env.RELAYER_HOST || '127.0.0.1' });
export default server;
