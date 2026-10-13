import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createPublicClient, http, keccak256 } from 'viem';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const children: ChildProcess[] = [];
const cli = process.env.npm_execpath;
if (!cli) throw new Error('Run this through npm run dev:local or scripts/run.ps1 dev:local.');
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) continue;
    if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill();
  }
}
process.on('SIGINT', stop); process.on('SIGTERM', stop);
function command(args: string[], background = false) {
  const child = spawn(process.execPath, [cli!, ...args], { cwd: root, env: { ...process.env, ORVENA_MODE: 'sandbox' }, stdio: background ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  children.push(child);
  if (background) { child.stdout?.on('data', () => {}); child.stderr?.on('data', () => {}); }
  return child;
}
async function run(args: string[]) {
  const child = command(args);
  await new Promise<void>((resolve, reject) => { child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Local setup command failed (${code}).`))); });
}
const client = createPublicClient({ transport: http('http://127.0.0.1:8545', { retryCount: 0, timeout: 1000 }) });
try {
  let active = false;
  try { const id = await client.getChainId(); if (id !== 31337) throw new Error('Port 8545 is serving another chain.'); active = true; } catch (error) { if (error instanceof Error && error.message.includes('another chain')) throw error; }
  if (!active) {
    command(['run', 'chain'], true);
    for (let attempt = 0; attempt < 30; attempt++) { try { if (await client.getChainId() === 31337) { active = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 500)); }
    if (!active) throw new Error('The local Hardhat chain did not start.');
  }
  await run(['run', 'compile']);
  await run(['run', 'build', '-w', '@orvena/sdk']);
  const artifact = JSON.parse(await readFile(new URL('../packages/contracts/artifacts/contracts/OrvenaRegistry.sol/OrvenaRegistry.json', import.meta.url), 'utf8'));
  let reuse = false;
  try { const metadata = JSON.parse(await readFile(new URL('../deployments/31337.json', import.meta.url), 'utf8')); reuse = metadata.creationBytecodeHash === keccak256(artifact.bytecode) && Boolean(await client.getCode({ address: metadata.registry })); } catch {}
  if (!reuse) await run(['run', 'deploy:local']);
  const approvalsArtifact = JSON.parse(await readFile(new URL('../packages/contracts/artifacts/contracts/OrvenaApprovals.sol/OrvenaApprovals.json', import.meta.url), 'utf8'));
  let reuseApprovals = false;
  try { const meta = JSON.parse(await readFile(new URL('../deployments/approvals-31337.json', import.meta.url), 'utf8')); const identity = JSON.parse(await readFile(new URL('../deployments/31337.json', import.meta.url), 'utf8')); reuseApprovals = meta.registry.toLowerCase() === identity.registry.toLowerCase() && meta.creationBytecodeHash === keccak256(approvalsArtifact.bytecode) && Boolean(await client.getCode({ address: meta.approvals })); } catch {}
  if (!reuseApprovals) await run(['run', 'deploy:approvals:local']);
  const setup = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url)), 'scripts/setup-local.ts'], { cwd: root, stdio: 'inherit' });
  await new Promise<void>((resolve, reject) => setup.on('exit', code => code === 0 ? resolve() : reject(new Error('Local environment setup failed.'))));
  const relayer = command(['run', 'dev', '-w', '@orvena/relayer']);
  const web = command(['run', 'dev', '-w', '@orvena/web', '--', '--mode', 'sandbox']);
  console.log('Local test mode: http://localhost:5174 — no faucet, public RPC, or explorer submissions.');
  await new Promise<void>(resolve => { relayer.on('exit', () => { stop(); resolve(); }); web.on('exit', () => { stop(); resolve(); }); });
} catch (error) { stop(); console.error(error instanceof Error ? error.message : 'Local setup failed.'); process.exitCode = 1; }
