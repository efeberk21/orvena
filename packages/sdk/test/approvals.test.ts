import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toHex } from 'viem';
import { approvalProtocol, contentCommitment, evaluateApproval, parseApprovalPackage, requestContentApproval, type ApprovalPackage } from '../src/approvals.js';
const owner = '0x0000000000000000000000000000000000000001';
const other = '0x0000000000000000000000000000000000000002';
const salt = toHex(11n, { size: 32 });
const proof: ApprovalPackage = { schema: approvalProtocol, chainId: 31337, contract: other, owner, salt, approvalId: toHex(2n, { size: 32 }) };
const record = { owner, commitment: contentCommitment('Approved draft.\n', salt), parentId: toHex(0n, { size: 32 }), approvedAt: 100n, revokedAt: 0n } as const;
test('exact bytes, salt, independently trusted approver and fresh revocation state control publication', () => {
  assert.equal(evaluateApproval(record, 'Approved draft.\n', proof, owner).status, 'valid');
  for (const text of ['Approved draft.', 'Approved draft.\r\n', 'Approved draft!\n']) assert.equal(evaluateApproval(record, text, proof, owner).status, 'content-mismatch');
  assert.equal(evaluateApproval(record, 'Approved draft.\n', { ...proof, salt: toHex(12n, { size: 32 }) }, owner).status, 'content-mismatch');
  assert.equal(evaluateApproval(record, 'Approved draft.\n', proof, other).status, 'wrong-approver');
  assert.equal(evaluateApproval(record, 'Approved draft.\n', { ...proof, owner: other }, owner).status, 'wrong-approver');
  assert.equal(evaluateApproval({ ...record, revokedAt: 110n }, 'Approved draft.\n', proof, owner).status, 'revoked');
  assert.equal(evaluateApproval({ ...record, approvedAt: 0n }, 'Approved draft.\n', proof, owner).status, 'not-found');
  assert.throws(() => evaluateApproval(record, 'Approved draft.\n', proof, '0x0000000000000000000000000000000000000000'));
});
test('receipt schema rejects malformed fields; unsafe visual controls and oversized UTF-8 content fail', () => {
  assert.deepEqual(parseApprovalPackage(JSON.stringify(proof)), proof);
  for (const value of [null, {}, { ...proof, schema: 'other' }, { ...proof, chainId: 1 }, { ...proof, salt: '0x12' }, { ...proof, approvalId: 'invalid' }, { ...proof, owner: 'bad' }]) assert.throws(() => parseApprovalPackage(value));
  assert.throws(() => contentCommitment('hidden\u202Etext', salt));
  assert.throws(() => contentCommitment('ü'.repeat(10001), salt));
  assert.notEqual(contentCommitment('A', salt), contentCommitment('A', toHex(12n, { size: 32 })));
});
test('approval bridge binds popup, origin, request ID, rejection and expected approver', async () => {
  const original = globalThis.window;
  let opened = '', sent: any;
  const listeners = new Set<(event: MessageEvent) => void>();
  const popup = { closed: false, postMessage: (data: any, origin: string) => { sent = { data, origin }; }, close() { this.closed = true; } };
  globalThis.window = { open: (url: string) => { opened = url; return popup; }, addEventListener: (_type: string, listener: any) => listeners.add(listener), removeEventListener: (_type: string, listener: any) => listeners.delete(listener), setInterval, setTimeout } as any;
  const emit = (origin: string, source: unknown, data: unknown) => listeners.forEach(listener => listener({ origin, source, data } as MessageEvent));
  try {
    const pending = requestContentApproval({ approvalUrl: 'http://localhost:5173', content: 'Draft', expectedOwner: owner });
    const id = new URL(opened).searchParams.get('request');
    const ready = { protocol: approvalProtocol, type: 'ready', id };
    emit('https://evil.example', popup, ready); emit('http://localhost:5173', {}, ready); emit('http://localhost:5173', popup, { ...ready, id: 'wrong' }); assert.equal(sent, undefined);
    emit('http://localhost:5173', popup, ready); assert.equal(sent.origin, 'http://localhost:5173'); assert.equal(sent.data.content, 'Draft');
    emit('https://evil.example', popup, { ...ready, type: 'response', result: proof }); assert.equal(listeners.size, 1);
    emit('http://localhost:5173', popup, { ...ready, type: 'response', result: proof }); assert.deepEqual(await pending, proof); assert.equal(listeners.size, 0);
    const rejected = requestContentApproval({ approvalUrl: 'http://localhost:5173', content: 'Draft' });
    const nextId = new URL(opened).searchParams.get('request'); emit('http://localhost:5173', popup, { ...ready, id: nextId }); emit('http://localhost:5173', popup, { protocol: approvalProtocol, id: nextId, type: 'response', error: 'User rejected.' }); await assert.rejects(rejected, /rejected/);
    const wrongOwner = requestContentApproval({ approvalUrl: 'http://localhost:5173', content: 'Draft', expectedOwner: owner });
    const lastId = new URL(opened).searchParams.get('request'); emit('http://localhost:5173', popup, { ...ready, id: lastId }); emit('http://localhost:5173', popup, { protocol: approvalProtocol, id: lastId, type: 'response', result: { ...proof, owner: other } }); await assert.rejects(wrongOwner, /Wrong approver/);
    await assert.rejects(requestContentApproval({ approvalUrl: 'http://evil.example', content: 'Draft' }), /HTTPS/);
  } finally { if (original) globalThis.window = original; else Reflect.deleteProperty(globalThis, 'window'); }
});
