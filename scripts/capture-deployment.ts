import { readFile, writeFile } from 'node:fs/promises';
import { createPublicClient, http } from 'viem';
import { monadTestnet } from '@orvena/sdk';
const file = new URL('../deployments/10143.json', import.meta.url);
const metadata = JSON.parse(await readFile(file, 'utf8'));
const client = createPublicClient({ chain: monadTestnet, transport: http() });
const target = BigInt(Math.floor(Date.parse(metadata.deployedAt) / 1000));
const latest = await client.getBlockNumber();
let low = latest > 20000n ? latest - 20000n : 0n;
let high = latest;
while (low < high) {
  const middle = (low + high) / 2n;
  if ((await client.getBlock({ blockNumber: middle })).timestamp < target) low = middle + 1n;
  else high = middle;
}
for (let number = low > 20n ? low - 20n : 0n; number <= low + 3n && number <= latest; number++) {
  const block = await client.getBlock({ blockNumber: number, includeTransactions: true });
  for (const transaction of block.transactions) {
    if (transaction.from.toLowerCase() !== metadata.deployer.toLowerCase() || transaction.to !== null) continue;
    const receipt = await client.getTransactionReceipt({ hash: transaction.hash });
    if (receipt.contractAddress?.toLowerCase() !== metadata.registry.toLowerCase()) continue;
    await writeFile(file, JSON.stringify({ ...metadata, transactionHash: transaction.hash, block: number.toString(), gasUsed: receipt.gasUsed.toString(), effectiveGasPrice: receipt.effectiveGasPrice.toString() }, null, 2));
    console.log(`Deployment receipt verified: ${transaction.hash}`);
    process.exit(0);
  }
}
throw new Error('Deployment transaction not found near the recorded deployment time.');
