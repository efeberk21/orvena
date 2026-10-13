import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const stage = resolve('.local/publisher-deploy');
const files = new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean));
for (const file of files) {
  if (file.startsWith('api/') || file === 'vercel.json' || file.startsWith('.env')) continue;
  const destination = resolve(stage, file);
  if (!destination.startsWith(stage + '\\') && !destination.startsWith(stage + '/')) throw new Error('Invalid staging path.');
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(file, destination);
}
await writeFile(resolve(stage, 'vercel.json'), JSON.stringify({
  framework: null, installCommand: 'npm ci',
  buildCommand: 'npm run build -w @orvena/sdk && npm run build -w @orvena/dapp',
  outputDirectory: 'apps/dapp/dist',
  headers: [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }, { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }] }]
}, null, 2) + '\n');
console.log('Staged separate publisher from publishable source files only; no API or environment secrets.');
