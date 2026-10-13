import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, formatEther, http, type Hex } from 'viem';
import { monadTestnet } from '@orvena/sdk';

const file = new URL('../.env', import.meta.url);
let content = await readFile(file, 'utf8');
const env = parse(content);
const addresses: Record<string, string> = {};
for (const name of ['DEPLOYER_PRIVATE_KEY', 'RELAYER_PRIVATE_KEY']) {
  const key = env[name] || generatePrivateKey();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error(`Invalid ${name}; update the local .env file.`);
  if (!env[name]) {
    const line = `${name}=${key}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
  }
  addresses[name.replace('_PRIVATE_KEY', '')] = privateKeyToAccount(key as Hex).address;
}
// Keys remain in the gitignored local environment file. Output only public addresses.
await writeFile(file, content, { mode: 0o600 });
const client = createPublicClient({ chain: monadTestnet, transport: http(env.MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0], { timeout: 10000, retryCount: 0 }) });
for (const [role, address] of Object.entries(addresses)) {
  const balance = await client.getBalance({ address: address as Hex });
  console.log(`${role}: ${address}; ${formatEther(balance)} test MON`);
}
