import { readFile, writeFile, mkdir } from 'node:fs/promises';
const artifact = JSON.parse(await readFile(new URL('../artifacts/contracts/OrvenaRegistry.sol/OrvenaRegistry.json', import.meta.url), 'utf8'));
const destination = new URL('../../sdk/src/', import.meta.url);
await mkdir(destination, { recursive: true });
await writeFile(new URL('abi.ts', destination), `// Generated from OrvenaRegistry.sol. Run npm run compile to refresh.\nexport const registryAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`);
console.log('Registry ABI exported to @orvena/sdk.');
const approvalsArtifact = JSON.parse(await readFile(new URL('../artifacts/contracts/OrvenaApprovals.sol/OrvenaApprovals.json', import.meta.url), 'utf8'));
await writeFile(new URL('approvals-abi.ts', destination), `// Generated from OrvenaApprovals.sol. Run npm run compile to refresh.\nexport const approvalsAbi = ${JSON.stringify(approvalsArtifact.abi, null, 2)} as const;\n`);
console.log('Approvals ABI exported to @orvena/sdk.');
