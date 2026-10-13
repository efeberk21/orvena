import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const child = spawn(process.execPath, [fileURLToPath(new URL('../apps/relayer/dist/index.js', import.meta.url))], { env: { ...process.env, SERVE_WEB: '1' }, stdio: 'inherit' });
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
child.on('exit', code => { process.exitCode = code || 0; });
