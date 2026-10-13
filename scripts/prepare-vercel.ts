import { config } from 'dotenv';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, formatEther, http, parseEther, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from '@orvena/sdk';

config({ path: '.env', quiet: true });
const origin = process.argv[2];
if (!origin || !/^https:\/\/[^/]+$/.test(origin)) throw new Error('Provide the final stable HTTPS origin.');
const envPath = '.local/vercel.env';
try { await access(envPath); throw new Error('A dedicated sponsor already exists. Reuse it; do not automatically refill or replace it.'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error('Testnet deployer is not configured.');
const transport = http(process.env.MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0]);
const client = createPublicClient({ chain: monadTestnet, transport });
if (await client.getChainId() !== 10143) throw new Error('Funding is restricted to Monad testnet.');
const deployer = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex);
const secret = generatePrivateKey();
const sponsor = privateKeyToAccount(secret);
const value = parseEther('1');
if (await client.getBalance({ address: deployer.address }) < value + parseEther('0.05')) throw new Error('Insufficient test MON for a separate bounded sponsor.');
await mkdir('.local', { recursive: true });
const entries = {
  VITE_CHAIN_ID: '10143',
  VITE_REGISTRY_ADDRESS: '0x105a31bbd4ddb181ade5b0ce7835df27b93a182f',
  REGISTRY_ADDRESS: '0x105a31bbd4ddb181ade5b0ce7835df27b93a182f',
  VITE_APPROVALS_ADDRESS: '0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba',
  APPROVALS_ADDRESS: '0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba',
  APP_ORIGIN: origin,
  RELAYER_PRIVATE_KEY: secret,
  RELAYER_BUDGET_MON: '1'
};
// Persist the new test-only secret before transferring, never print it.
await writeFile(envPath, Object.entries(entries).map(([key, val]) => `${key}=${val}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
const wallet = createWalletClient({ account: deployer, chain: monadTestnet, transport });
const hash = await wallet.sendTransaction({ to: sponsor.address, value });
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status !== 'success') throw new Error('Dedicated testnet sponsor funding reverted.');
await writeFile('deployments/vercel-sponsor-10143.json', JSON.stringify({ chainId: 10143, address: sponsor.address, initialFundingTestMON: formatEther(value), fundingHash: hash, origin, fundedAt: new Date().toISOString(), note: 'Dedicated bounded testnet sponsor. No automatic refill.' }, null, 2) + '\n');
console.log(`Dedicated sponsor ${sponsor.address} funded with ${formatEther(value)} test MON; secret stored only in ignored local configuration.`);
