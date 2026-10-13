import { readFile, readdir, writeFile } from 'node:fs/promises';
const deployment = JSON.parse(await readFile(new URL('../deployments/10143.json', import.meta.url), 'utf8'));
const directory = new URL('../packages/contracts/artifacts/build-info/', import.meta.url);
let build;
const source = 'project/contracts/OrvenaRegistry.sol';
for (const name of await readdir(directory)) {
  if (!name.endsWith('.json') || name.endsWith('.output.json')) continue;
  const candidate = JSON.parse(await readFile(new URL(name, directory), 'utf8'));
  if (candidate.input?.sources?.[source]) { build = candidate; break; }
}
if (!build) throw new Error('Compile OrvenaRegistry before verification.');
const compilerVersion = build.solcLongVersion.match(/^\d+\.\d+\.\d+\+commit\.[0-9a-f]+/)[0];
const response = await fetch(`https://sourcify.dev/server/v2/verify/10143/${deployment.registry}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stdJsonInput: build.input, compilerVersion, contractIdentifier: `${source}:OrvenaRegistry`, creationTransactionHash: deployment.transactionHash }), signal: AbortSignal.timeout(30000),
});
let result = await response.json();
if (!response.ok) { console.log(JSON.stringify(result)); process.exitCode = 1; }
else {
  const verificationId = result.verificationId;
  console.log(`Source verification job: ${verificationId}`);
  for (let attempt = 0; attempt < 8; attempt++) {
    const status = await fetch(`https://sourcify.dev/server/v2/verify/${verificationId}`, { signal: AbortSignal.timeout(10000) });
    result = await status.json();
    if (result.isJobCompleted || result.error) break;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  await writeFile(new URL('../deployments/verification-10143.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (!result.isJobCompleted || result.error || result.contract?.runtimeMatch !== 'exact_match' || result.contract?.creationMatch !== 'exact_match') process.exitCode = 1;
}
