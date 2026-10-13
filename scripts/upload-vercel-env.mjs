import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { parse } from 'dotenv';

const npmCli = process.argv[2];
if (!npmCli) throw new Error('Provide the installed npm CLI path; run under Node 24.');
const config = parse(await readFile('.local/vercel.env', 'utf8'));
const allowed = ['VITE_CHAIN_ID', 'VITE_REGISTRY_ADDRESS', 'REGISTRY_ADDRESS', 'VITE_APPROVALS_ADDRESS', 'APPROVALS_ADDRESS', 'APP_ORIGIN', 'RELAYER_PRIVATE_KEY', 'RELAYER_BUDGET_MON'];
for (const name of allowed) {
  if (!config[name]) throw new Error(`Missing dedicated configuration: ${name}`);
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, 'exec', '--yes', '--package=vercel', '--', 'vercel', 'env', 'add', name, 'production', '--scope', 'efeberk', '--yes', '--force', name === 'RELAYER_PRIVATE_KEY' ? '--sensitive' : '--no-sensitive'], { stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', reject);
    child.on('close', resolve);
    child.stdin.on('error', () => {});
    // Secrets never appear in command arguments, logs or the browser bundle.
    child.stdin.end(config[name]);
  });
  if (code !== 0) throw new Error(`Vercel environment update failed for ${name}; exit ${code}.`);
  console.log(`Configured ${name} for production${name === 'RELAYER_PRIVATE_KEY' ? ' as an encrypted Secret' : ''}.`);
}
