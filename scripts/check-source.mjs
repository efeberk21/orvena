import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
let env = {};
for (const file of ['.env', '.env.local', '.local/vercel.env']) {
  try { env = { ...env, ...parse(await readFile(file, 'utf8')) }; } catch {}
}
const secrets = Object.entries(env).filter(([key, value]) => /PRIVATE_KEY|TOKEN|SECRET|PASSWORD/.test(key) && value.length >= 24).map(([, value]) => value);
const files = new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean));
for (const file of files) {
  if (/^\.env($|\.)/.test(file) && file !== '.env.example') throw new Error(`Environment file would be published: ${file}`);
  const content = await readFile(file, 'utf8');
  if (secrets.some(secret => content.includes(secret) || /^0x/.test(secret) && content.includes(secret.slice(2)))) throw new Error(`Configured secret found in publishable source: ${file}`);
  if (/gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) throw new Error(`Credential-shaped data found: ${file}`);
}
console.log(`Checked ${files.size} publishable files; configured secrets and environment files are excluded.`);
