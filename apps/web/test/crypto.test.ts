import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync, sign, verify, createHash } from 'node:crypto';
import { toViemAccount } from '@category-labs/mera/viem';
import { toHex } from 'viem';
import { deriveSigningSession } from '../src/derivation';
import { decodeDerSignature, encodeAssertion } from '../src/webauthn-proof';

test('the same PRF reconstructs the same account without metadata; expiry ends signing', async () => {
  const firstInput = new Uint8Array(32).fill(7);
  const secondInput = firstInput.slice();
  const a = deriveSigningSession(firstInput);
  const b = deriveSigningSession(secondInput);
  assert.equal(toViemAccount(a).address, toViemAccount(b).address);
  assert.deepEqual(firstInput, new Uint8Array(32));
  assert.deepEqual(secondInput, new Uint8Array(32));
  a.end(); b.end();
  await assert.rejects(a.signDigest(new Uint8Array(32)));
});
test('DER conversion preserves signature validity and normalizes high-S for OZ', () => {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const data = Buffer.from('orvena proof');
  const der = sign('sha256', data, keys.privateKey);
  const { r, s } = decodeDerSignature(der);
  assert.equal(r.length, 66); assert.equal(s.length, 66);
  assert.ok(verify('sha256', data, { key: keys.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(r.slice(2) + s.slice(2), 'hex')));
  const order = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
  const high = Buffer.concat([Buffer.from([0x30, 0x26, 2, 1, 1, 2, 0x21, 0]), Buffer.from(toHex(order - 1n, { size: 32 }).slice(2), 'hex')]);
  assert.equal(decodeDerSignature(high).s, toHex(1n, { size: 32 }));
  assert.throws(() => decodeDerSignature(Buffer.concat([der, Buffer.from([0])])));
  assert.throws(() => decodeDerSignature(new Uint8Array([0x30, 6, 2, 1, 0x80, 2, 1, 1])));
});
test('client-data converter validates challenge, type, origin and crossOrigin', () => {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const challenge = toHex(createHash('sha256').update('fresh challenge').digest());
  const payload = { type: 'webauthn.get', challenge: Buffer.from(challenge.slice(2), 'hex').toString('base64url'), origin: 'http://localhost:5173', crossOrigin: false };
  function response(json: object) {
    const encoded = new TextEncoder().encode(JSON.stringify(json));
    const sig = sign('sha256', encoded, keys.privateKey);
    return { signature: Uint8Array.from(sig).buffer, authenticatorData: new Uint8Array(37).buffer, clientDataJSON: encoded.buffer };
  }
  const result = encodeAssertion(response(payload), challenge, payload.origin);
  assert.equal(result.auth.typeIndex, 1n);
  for (const altered of [{ ...payload, type: 'webauthn.create' }, { ...payload, origin: 'https://evil.example' }, { ...payload, challenge: 'wrong' }, { ...payload, crossOrigin: true }]) assert.throws(() => encodeAssertion(response(altered), challenge, payload.origin));
});
