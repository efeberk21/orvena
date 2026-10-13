import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'dotenv';
const root = new URL('../', import.meta.url);
let configured = {};
try { configured = parse(await readFile(new URL('.env', root), 'utf8')); } catch {}
const secrets = ['DEPLOYER_PRIVATE_KEY', 'RELAYER_PRIVATE_KEY'].map(key => configured[key]).filter(Boolean);
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) await scan(file);
    else if (/\.(js|html|css)$/.test(entry.name)) {
      const content = await readFile(file, 'utf8');
      if (secrets.some(secret => content.includes(secret) || content.includes(secret.slice(2)))) throw new Error(`Server signing key found in browser artifact: ${entry.name}`);
    }
  }
}
await scan(new URL('apps/web/dist/', root));
console.log(secrets.length ? 'Configured server signing keys are absent from the browser build.' : 'Browser build scanned; no local server keys configured for value comparison.');
