import { rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const outputs = { sdk: resolve(root, 'packages/sdk/dist'), relayer: resolve(root, 'apps/relayer/dist') };
const workspace = process.argv[2], target = outputs[workspace];
if (!target || !target.startsWith(resolve(root) + sep) || !target.endsWith(sep + 'dist')) throw new Error('Refusing to clean outside a known generated workspace dist directory.');
// Prune removed modules without deleting the live SDK directory used by dev watchers.
const legacy = workspace === 'sdk' ? ['provider.js', 'provider.d.ts', 'sign-in.js', 'sign-in.d.ts'] : ['notes.js', 'sign-in.js'];
for (const name of legacy) await rm(resolve(target, name), { force: true });
