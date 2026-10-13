import 'dotenv/config';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { createPublicClient, concatHex, http, toHex } from 'viem';
import { monadTestnet } from '@orvena/sdk';

console.log(`Node ${process.versions.node}; expected Node 24 LTS.`);
const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0], { timeout: 10000, retryCount: 0 }) });
try {
  const chainId = await client.getChainId();
  if (chainId !== 10143) throw new Error(`Wrong network: chainId ${chainId}, expected 10143.`);
  console.log(`Monad testnet RPC reachable; chainId ${chainId}; block ${await client.getBlockNumber()}.`);
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const message = Buffer.from('orvena-p256-smoke-v1');
  const signature = sign('sha256', message, { key: pair.privateKey, dsaEncoding: 'ieee-p1363' });
  const pub = pair.publicKey.export({ format: 'jwk' });
  const input = concatHex([toHex(createHash('sha256').update(message).digest()), toHex(signature), toHex(Buffer.from(pub.x!, 'base64url')), toHex(Buffer.from(pub.y!, 'base64url'))]);
  const to = '0x0000000000000000000000000000000000000100';
  const good = await client.call({ to, data: input });
  const bad = await client.call({ to, data: concatHex([toHex(new Uint8Array(32)), `0x${input.slice(66)}`]) });
  if (good.data !== toHex(1n, { size: 32 }) || (bad.data && bad.data !== '0x' && bad.data !== toHex(0n, { size: 32 }))) throw new Error('P256 positive/negative vector check failed.');
  console.log('P256 0x0100: valid signature accepted; wrong message rejected (read-only eth_call).');
  console.log(`Registry: ${process.env.REGISTRY_ADDRESS ? 'configured (deployment not verified by this check)' : 'not deployed/configured yet'}.`);
  console.log(`Passkey RP: ${process.env.VITE_RP_ID || 'localhost'}; real device PRF check must run in the browser.`);
  console.log(`Deployer key: ${process.env.DEPLOYER_PRIVATE_KEY ? 'configured' : 'missing; required for testnet deployment'}.`);
  console.log(`Relayer key: ${process.env.RELAYER_PRIVATE_KEY ? 'configured' : 'missing; writes disabled'}.`);
} catch (error) {
  console.error(error instanceof Error && error.message.startsWith('Wrong network') ? error.message : 'RPC/P256 check failed. Check RPC availability and run doctor again.');
  process.exitCode = 1;
}
