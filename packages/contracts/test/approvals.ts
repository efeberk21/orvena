import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { p256 } from '@noble/curves/nist.js';
import { concatHex, hashTypedData, hexToBytes, sha256, stringToHex, toHex } from 'viem';
import { contentCommitment, createApprovalReader, hashProfile, registryDomain, registryTypes, zeroApprovalId } from '../../sdk/src/index.js';
const secret = new Uint8Array(32); secret[31] = 3;
const publicKey = p256.getPublicKey(secret, false);
const input = { name: 'Approver', bio: '', avatar: zeroApprovalId, qx: toHex(publicKey.slice(1, 33)), qy: toHex(publicKey.slice(33)), rpIdHash: sha256(stringToHex('localhost')), origin: 'http://localhost:5173' };
const commitment = contentCommitment('AI drafted this public announcement.', toHex(17n, { size: 32 }));
async function fixture() {
  const connection = await network.create();
  const registry = await connection.viem.deployContract('OrvenaRegistry');
  const approvals = await connection.viem.deployContract('OrvenaApprovals', [registry.address]);
  const client = await connection.viem.getPublicClient();
  const [owner, other] = await connection.viem.getWalletClients();
  const deadline = (await client.getBlock()).timestamp + 600n;
  const domain = registryDomain(await client.getChainId(), registry.address);
  const sig = await owner.signTypedData({ domain, types: registryTypes, primaryType: 'CreateProfile', message: { owner: owner.account.address, profileHash: hashProfile(input), nonce: 0n, deadline } });
  await registry.write.createProfile([owner.account.address, input, deadline, sig]);
  return { connection, registry, approvals, client, owner, other, deadline };
}
function assertion(challenge: `0x${string}`, overrides: { key?: Uint8Array; flags?: number; rp?: string; origin?: string; type?: string } = {}) {
  const json = JSON.stringify({ type: overrides.type || 'webauthn.get', challenge: Buffer.from(hexToBytes(challenge)).toString('base64url'), origin: overrides.origin || input.origin, crossOrigin: false });
  const data = concatHex([sha256(stringToHex(overrides.rp || 'localhost')), toHex(overrides.flags ?? 5, { size: 1 }), '0x00000000']);
  const sig = p256.sign(hexToBytes(sha256(concatHex([data, sha256(stringToHex(json))]))), overrides.key || secret, { prehash: false, lowS: true });
  return { auth: { r: toHex(sig.slice(0, 32)), s: toHex(sig.slice(32)), challengeIndex: BigInt(json.indexOf('"challenge"')), typeIndex: BigInt(json.indexOf('"type"')), authenticatorData: data, clientDataJSON: json }, originIndex: BigInt(json.indexOf('"origin"')) };
}
describe('Content-bound WebAuthn approvals', () => {
  it('creates a relayed approval with no prior verifiedAt flag and rejects replay', async () => {
    const f = await fixture();
    assert.equal((await f.registry.read.getProfile([f.owner.account.address])).verifiedAt, 0n);
    const id = await f.approvals.read.approvalChallenge([f.owner.account.address, commitment, zeroApprovalId, f.deadline]);
    const p = assertion(id);
    const args = [f.owner.account.address, commitment, zeroApprovalId, f.deadline, p.auth, p.originIndex] as const;
    const hash = await f.approvals.write.approveContent(args, { account: f.other.account });
    assert.equal((await f.client.waitForTransactionReceipt({ hash })).status, 'success');
    const record = await f.approvals.read.getApproval([id]);
    assert.equal(record.commitment, commitment); assert.ok(record.approvedAt > 0n);
    assert.equal(record.revokedAt, 0n);
    await assert.rejects(f.approvals.write.approveContent(args));
  });
  it('rejects changed content, parent, owner, deadline, wrong key/RP/origin/type, and missing user verification', async () => {
    const f = await fixture();
    const id = await f.approvals.read.approvalChallenge([f.owner.account.address, commitment, zeroApprovalId, f.deadline]);
    const p = assertion(id);
    const wrongKey = new Uint8Array(32); wrongKey[31] = 9;
    for (const overrides of [{ key: wrongKey }, { flags: 1 }, { flags: 4 }, { flags: 0x15 }, { rp: 'evil.example' }, { origin: 'https://evil.example' }, { type: 'webauthn.create' }]) {
      const bad = assertion(id, overrides);
      await assert.rejects(f.approvals.write.approveContent([f.owner.account.address, commitment, zeroApprovalId, f.deadline, bad.auth, bad.originIndex]));
    }
    await assert.rejects(f.approvals.write.approveContent([f.owner.account.address, toHex(99n, { size: 32 }), zeroApprovalId, f.deadline, p.auth, p.originIndex]));
    await assert.rejects(f.approvals.write.approveContent([f.other.account.address, commitment, zeroApprovalId, f.deadline, p.auth, p.originIndex]));
    await assert.rejects(f.approvals.write.approveContent([f.owner.account.address, commitment, zeroApprovalId, f.deadline + 1n, p.auth, p.originIndex]));
    await assert.rejects(f.approvals.write.approveContent([f.owner.account.address, commitment, toHex(99n, { size: 32 }), f.deadline, p.auth, p.originIndex]));
    await assert.rejects(f.approvals.write.approveContent([f.owner.account.address, commitment, zeroApprovalId, 0n, p.auth, p.originIndex]));
    assert.equal(await f.approvals.read.nonces([f.owner.account.address]), 0n);
  });
  it('rejects assertions bound to another chain, contract or action', async () => {
    const f = await fixture();
    const types = { ApproveContent: [{ name: 'owner', type: 'address' }, { name: 'commitment', type: 'bytes32' }, { name: 'parentId', type: 'bytes32' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] } as const;
    for (const domain of [{ name: 'OrvenaApprovals', version: '1', chainId: 1, verifyingContract: f.approvals.address }, { name: 'OrvenaApprovals', version: '1', chainId: await f.client.getChainId(), verifyingContract: f.other.account.address }]) {
      const p = assertion(hashTypedData({ domain, types, primaryType: 'ApproveContent', message: { owner: f.owner.account.address, commitment, parentId: zeroApprovalId, nonce: 0n, deadline: f.deadline } }));
      await assert.rejects(f.approvals.write.approveContent([f.owner.account.address, commitment, zeroApprovalId, f.deadline, p.auth, p.originIndex]));
    }
    const p = assertion(await f.registry.read.proofChallenge([f.owner.account.address, f.deadline]));
    await assert.rejects(f.approvals.write.approveContent([f.owner.account.address, commitment, zeroApprovalId, f.deadline, p.auth, p.originIndex]));
  });
  it('requires a new content-bound passkey assertion to revoke; old approvals remain historical', async () => {
    const f = await fixture();
    const id = await f.approvals.read.approvalChallenge([f.owner.account.address, commitment, zeroApprovalId, f.deadline]);
    const p = assertion(id);
    await f.approvals.write.approveContent([f.owner.account.address, commitment, zeroApprovalId, f.deadline, p.auth, p.originIndex]);
    await assert.rejects(f.approvals.write.revokeApproval([id, f.deadline, p.auth, p.originIndex]));
    const revoke = assertion(await f.approvals.read.revocationChallenge([f.owner.account.address, id, f.deadline]));
    await f.approvals.write.revokeApproval([id, f.deadline, revoke.auth, revoke.originIndex]);
    const stored = await f.approvals.read.getApproval([id]);
    assert.ok(stored.revokedAt >= stored.approvedAt); assert.equal(stored.commitment, commitment);
    await assert.rejects(f.approvals.write.revokeApproval([id, f.deadline, revoke.auth, revoke.originIndex]));
    const nextCommitment = contentCommitment('Revised announcement.', toHex(22n, { size: 32 }));
    const nextId = await f.approvals.read.approvalChallenge([f.owner.account.address, nextCommitment, id, f.deadline]);
    const next = assertion(nextId);
    await assert.rejects(f.approvals.write.approveContent([f.owner.account.address, nextCommitment, zeroApprovalId, f.deadline, next.auth, next.originIndex]));
    await f.approvals.write.approveContent([f.owner.account.address, nextCommitment, id, f.deadline, next.auth, next.originIndex]);
    assert.equal((await f.approvals.read.getApproval([nextId])).parentId, id);
  });
});
