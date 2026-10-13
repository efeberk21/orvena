import { readFile } from 'node:fs/promises';
import { createApprovalReader } from '@orvena/sdk';
const [receiptFile, contentFile, expectedOwner] = process.argv.slice(2);
if (!receiptFile || !contentFile || !expectedOwner) throw new Error('Usage: node examples/verify-approval.mjs receipt.json content.txt 0xTRUSTED_APPROVER');
// Pin the deployment independently, rather than trusting the supplied receipt.
const reader = createApprovalReader({ address: '0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba', chainId: 10143 });
const verdict = await reader.verifyApproval({ approvalPackage: await readFile(receiptFile, 'utf8'), content: await readFile(contentFile, 'utf8'), expectedOwner });
console.log(JSON.stringify(verdict, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2));
if (verdict.status !== 'valid') process.exitCode = 1;
