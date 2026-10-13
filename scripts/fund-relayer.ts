import 'dotenv/config';
import { createPublicClient, createWalletClient, formatEther, http, parseEther, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from '@orvena/sdk';
import { writeFile } from 'node:fs/promises';
if (!process.env.DEPLOYER_PRIVATE_KEY || !process.env.RELAYER_PRIVATE_KEY) throw new Error('Run prepare:testnet first.');
const deployer = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex);
const relayer = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as Hex);
const transport = http(process.env.MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0]);
const client = createPublicClient({ chain: monadTestnet, transport });
if (await client.getChainId() !== 10143) throw new Error('Funding is restricted to Monad testnet.');
const current = await client.getBalance({ address: relayer.address });
const target = parseEther('1');
if (current >= target) { console.log(`Relayer already funded: ${formatEther(current)} test MON.`); }
else {
  const value = target - current;
  if (await client.getBalance({ address: deployer.address }) < value + parseEther('0.1')) throw new Error('Deployer has insufficient test MON.');
  const wallet = createWalletClient({ account: deployer, chain: monadTestnet, transport });
  const hash = await wallet.sendTransaction({ to: relayer.address, value });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('Testnet funding transaction reverted.');
  await writeFile(new URL('../deployments/funding-10143.json', import.meta.url), JSON.stringify({ chainId: 10143, from: deployer.address, to: relayer.address, value: value.toString(), hash, block: receipt.blockNumber.toString() }, null, 2));
  console.log(`Relayer funded with ${formatEther(value)} test MON. Receipt: ${hash}`);
}
