import { readFile, writeFile } from 'node:fs/promises';
import { createPublicClient, http } from 'viem';
const client = createPublicClient({ transport: http('http://127.0.0.1:8545', { retryCount: 0 }) });
if (await client.getChainId() !== 31337) throw new Error('Start the local chain first: npm run chain');
const deployment = JSON.parse(await readFile(new URL('../deployments/31337.json', import.meta.url), 'utf8'));
const approvals = JSON.parse(await readFile(new URL('../deployments/approvals-31337.json', import.meta.url), 'utf8'));
if (!await client.getCode({ address: approvals.approvals }) || approvals.registry.toLowerCase() !== deployment.registry.toLowerCase()) throw new Error('Local approvals deployment is missing or uses another registry.');
if (!await client.getCode({ address: deployment.registry })) throw new Error('Local deployment is missing; run npm run deploy:local.');
// Public Hardhat development key. Never use on a public chain or with real funds.
const localEnv = `# LOCAL EVM ONLY. Loaded only by npm run dev:local / Vite --mode sandbox.\nVITE_CHAIN_ID=31337\nVITE_REGISTRY_ADDRESS=${deployment.registry}\nREGISTRY_ADDRESS=${deployment.registry}\nMONAD_RPC_URL=http://127.0.0.1:8545\nVITE_MONAD_RPC_URL=http://127.0.0.1:8545\nVITE_RP_ID=localhost\nVITE_WEB_PORT=5174\nRELAYER_PORT=3002\nAPP_ORIGIN=http://localhost:5174\nRELAYER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d\nRELAYER_BUDGET_MON=1\nRELAYER_STATE_FILE=.local/relayer-31337.json\n`;
await writeFile(new URL('../.env.sandbox', import.meta.url), `${localEnv}VITE_REGISTRY_BLOCK=${deployment.block || '0'}\nVITE_APPROVALS_ADDRESS=${approvals.approvals}\nAPPROVALS_ADDRESS=${approvals.approvals}\n`);
console.log(`Local registry ready: ${deployment.registry}. Local UI: http://localhost:5174; testnet UI remains at :5173.`);
