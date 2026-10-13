import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { p256 } from '@noble/curves/nist.js';
import { concatHex, hexToBytes, keccak256, sha256, stringToHex, toHex } from 'viem';
import { createRegistryReader, hashProfile, hashProfileUpdate, registryDomain, registryTypes } from '../../sdk/src/index.js';

const secret = new Uint8Array(32); secret[31] = 1;
const publicKey = p256.getPublicKey(secret, false);
const input = { name: 'Efe', bio: 'Building on Monad', avatar: keccak256(stringToHex('efe')), qx: toHex(publicKey.slice(1, 33)), qy: toHex(publicKey.slice(33)), rpIdHash: sha256(stringToHex('localhost')), origin: 'http://localhost:5173' };
async function fixture() {
  const connection = await network.create();
  const registry = await connection.viem.deployContract('OrvenaRegistry');
  const client = await connection.viem.getPublicClient();
  const [owner, other] = await connection.viem.getWalletClients();
  const deadline = (await client.getBlock()).timestamp + 600n;
  const domain = registryDomain(await client.getChainId(), registry.address);
  const signature = await owner.signTypedData({ domain, types: registryTypes, primaryType: 'CreateProfile', message: { owner: owner.account.address, profileHash: hashProfile(input), nonce: 0n, deadline } });
  return { connection, registry, client, owner, other, deadline, domain, signature };
}
async function existing() {
  const f = await fixture();
  await f.registry.write.createProfile([f.owner.account.address, input, f.deadline, f.signature]);
  return f;
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function proof(f: Fixture, overrides: { origin?: string; rp?: string; flags?: number; challenge?: `0x${string}`; key?: Uint8Array } = {}) {
  const challenge = overrides.challenge || await f.registry.read.proofChallenge([f.owner.account.address, f.deadline]);
  const json = JSON.stringify({ type: 'webauthn.get', challenge: Buffer.from(hexToBytes(challenge)).toString('base64url'), origin: overrides.origin || input.origin, crossOrigin: false });
  const data = concatHex([sha256(stringToHex(overrides.rp || 'localhost')), toHex(overrides.flags ?? 5, { size: 1 }), '0x00000000']);
  const digest = sha256(concatHex([data, sha256(stringToHex(json))]));
  const sig = p256.sign(hexToBytes(digest), overrides.key || secret, { prehash: false, lowS: true });
  return { auth: { r: toHex(sig.slice(0, 32)), s: toHex(sig.slice(32)), challengeIndex: BigInt(json.indexOf('"challenge"')), typeIndex: BigInt(json.indexOf('"type"')), authenticatorData: data, clientDataJSON: json }, originIndex: BigInt(json.indexOf('"origin"')) };
}
describe('OrvenaRegistry authorization', () => {
  it('creates a relayed profile without marking passkey control verified', async () => {
    const f = await fixture();
    const hash = await f.registry.write.createProfile([f.owner.account.address, input, f.deadline, f.signature], { account: f.other.account });
    assert.equal((await f.client.waitForTransactionReceipt({ hash })).status, 'success');
    const profile = await f.registry.read.getProfile([f.owner.account.address]);
    assert.equal(profile.name, 'Efe'); assert.equal(profile.verifiedAt, 0n);
    assert.equal(await f.registry.read.nonces([f.owner.account.address]), 1n);
  });
  it('rejects another signer and relayer field tampering', async () => {
    const f = await fixture();
    const bad = await f.other.signTypedData({ domain: f.domain, types: registryTypes, primaryType: 'CreateProfile', message: { owner: f.owner.account.address, profileHash: hashProfile(input), nonce: 0n, deadline: f.deadline } });
    await assert.rejects(f.registry.write.createProfile([f.owner.account.address, input, f.deadline, bad]));
    for (const altered of [{ ...input, name: 'Tampered' }, { ...input, origin: 'https://evil.example' }, { ...input, rpIdHash: sha256(stringToHex('evil.example')) }, { ...input, qx: toHex(1n, { size: 32 }) }]) {
      await assert.rejects(f.registry.write.createProfile([f.owner.account.address, altered, f.deadline, f.signature]));
    }
    assert.equal(await f.registry.read.nonces([f.owner.account.address]), 0n);
  });
  it('rejects expired signatures and signatures from another domain', async () => {
    const f = await fixture();
    const expired = (await f.client.getBlock()).timestamp - 1n;
    const signature = await f.owner.signTypedData({ domain: f.domain, types: registryTypes, primaryType: 'CreateProfile', message: { owner: f.owner.account.address, profileHash: hashProfile(input), nonce: 0n, deadline: expired } });
    await assert.rejects(f.registry.write.createProfile([f.owner.account.address, input, expired, signature]));
    for (const domain of [{ ...f.domain, chainId: 1 }, { ...f.domain, verifyingContract: f.other.account.address }]) {
      const wrong = await f.owner.signTypedData({ domain, types: registryTypes, primaryType: 'CreateProfile', message: { owner: f.owner.account.address, profileHash: hashProfile(input), nonce: 0n, deadline: f.deadline } });
      await assert.rejects(f.registry.write.createProfile([f.owner.account.address, input, f.deadline, wrong]));
    }
  });
  it('updates a profile, preserves registration context and rejects replay', async () => {
    const f = await existing();
    const signature = await f.owner.signTypedData({ domain: f.domain, types: registryTypes, primaryType: 'UpdateProfile', message: { owner: f.owner.account.address, profileHash: hashProfileUpdate('Efe 2', 'Updated', input.avatar), nonce: 1n, deadline: f.deadline } });
    const args = [f.owner.account.address, 'Efe 2', 'Updated', input.avatar, f.deadline, signature] as const;
    await f.registry.write.updateProfile(args);
    await assert.rejects(f.registry.write.updateProfile(args));
    const profile = await f.registry.read.getProfile([f.owner.account.address]);
    assert.equal(profile.name, 'Efe 2'); assert.equal(profile.qx, input.qx); assert.equal(profile.origin, input.origin);
  });
  it('records exact hashes; rejects changed data, replay and duplicate receipts', async () => {
    const f = await existing();
    const dataHash = keccak256(stringToHex('public sample'));
    const signature = await f.owner.signTypedData({ domain: f.domain, types: registryTypes, primaryType: 'RecordData', message: { owner: f.owner.account.address, dataHash, nonce: 1n, deadline: f.deadline } });
    await assert.rejects(f.registry.write.recordData([f.owner.account.address, keccak256(stringToHex('changed')), f.deadline, signature]));
    await f.registry.write.recordData([f.owner.account.address, dataHash, f.deadline, signature]);
    assert.equal((await f.registry.read.getRecord([f.owner.account.address, dataHash])).exists, true);
    assert.equal((await f.registry.read.getRecord([f.owner.account.address, keccak256(stringToHex('changed'))])).exists, false);
    await assert.rejects(f.registry.write.recordData([f.owner.account.address, dataHash, f.deadline, signature]));
  });
});
describe('WebAuthn P256 control proof', () => {
  it('accepts a real P256 assertion and rejects replay', async () => {
    const f = await existing(); const p = await proof(f);
    await f.registry.write.provePasskeyControl([f.owner.account.address, f.deadline, p.auth, p.originIndex]);
    assert.ok((await f.registry.read.getProfile([f.owner.account.address])).verifiedAt > 0n);
    await assert.rejects(f.registry.write.provePasskeyControl([f.owner.account.address, f.deadline, p.auth, p.originIndex]));
  });
  it('rejects wrong challenge, RP, origin, key and missing UP/UV', async () => {
    const f = await existing(); const wrongKey = new Uint8Array(32); wrongKey[31] = 2;
    for (const overrides of [{ challenge: toHex(123n, { size: 32 }) }, { rp: 'evil.example' }, { origin: 'https://evil.example' }, { flags: 1 }, { flags: 4 }, { key: wrongKey }]) {
      const p = await proof(f, overrides);
      await assert.rejects(f.registry.write.provePasskeyControl([f.owner.account.address, f.deadline, p.auth, p.originIndex]));
    }
    assert.equal(await f.registry.read.nonces([f.owner.account.address]), 1n);
  });
  it('rejects malformed assertion, wrong type and expired proof', async () => {
    const f = await existing(); const p = await proof(f);
    await assert.rejects(f.registry.write.provePasskeyControl([f.owner.account.address, f.deadline, { ...p.auth, authenticatorData: '0x' }, p.originIndex]));
    await assert.rejects(f.registry.write.provePasskeyControl([f.owner.account.address, f.deadline, { ...p.auth, clientDataJSON: p.auth.clientDataJSON.replace('webauthn.get', 'webauthn.create') }, p.originIndex]));
    await assert.rejects(f.registry.write.provePasskeyControl([f.owner.account.address, 0n, p.auth, p.originIndex]));
  });
});
