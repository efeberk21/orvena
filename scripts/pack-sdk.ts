import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const destination = new URL('../.local/packages/', import.meta.url);
await mkdir(destination, { recursive: true });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run npm run pack:sdk.');
const child = spawn(process.execPath, [npmCli, 'pack', '--workspace', '@orvena/sdk', '--pack-destination', '.local/packages'], { stdio: 'inherit' });
process.exitCode = await new Promise<number>(resolve => child.on('exit', code => resolve(code || 0)));
