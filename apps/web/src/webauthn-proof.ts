import { hexToBytes, toHex, type Hex } from 'viem';

export function decodeDerSignature(input: Uint8Array) {
  if (input[0] !== 0x30 || input[1] !== input.length - 2) throw new Error('Invalid P256 signature encoding.');
  let offset = 2;
  function integer(): Hex {
    if (input[offset++] !== 0x02) throw new Error('Invalid P256 signature integer.');
    const length = input[offset++];
    if (!length || length > 33 || offset + length > input.length) throw new Error('Invalid P256 signature length.');
    let value = input.slice(offset, offset + length); offset += length;
    if (value[0] & 0x80) throw new Error('Invalid negative P256 signature integer.');
    if (value.length > 1 && value[0] === 0 && !(value[1] & 0x80)) throw new Error('Invalid non-canonical signature integer.');
    if (value[0] === 0 && value.length > 1) value = value.slice(1);
    if (value.length > 32) throw new Error('Invalid P256 signature scalar.');
    const padded = new Uint8Array(32); padded.set(value, 32 - value.length); return toHex(padded);
  }
  const r = integer(); const rawS = integer();
  if (offset !== input.length) throw new Error('Invalid trailing P256 signature data.');
  const order = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
  const scalar = BigInt(rawS);
  if (BigInt(r) === 0n || BigInt(r) >= order || scalar === 0n || scalar >= order) throw new Error('Invalid P256 signature scalar.');
  // WebAuthn providers may return high-S signatures; OZ requires the equivalent low-S form.
  const s = toHex(scalar > order / 2n ? order - scalar : scalar, { size: 32 });
  return { r, s };
}
export function encodeAssertion(response: { signature: ArrayBuffer; authenticatorData: ArrayBuffer; clientDataJSON: ArrayBuffer }, challenge: Hex, origin: string) {
  const clientDataJSON = new TextDecoder('utf-8', { fatal: true }).decode(response.clientDataJSON);
  const parsed = JSON.parse(clientDataJSON);
  const expectedChallenge = btoa(String.fromCharCode(...hexToBytes(challenge))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (parsed.type !== 'webauthn.get' || parsed.challenge !== expectedChallenge || parsed.origin !== origin || parsed.crossOrigin === true) throw new Error('The passkey assertion does not match this request.');
  // OZ expects byte offsets at the full serialized field, not JavaScript character offsets.
  function fieldIndex(field: string, value: string): bigint {
    const token = `"${field}":${JSON.stringify(value)}`;
    const index = clientDataJSON.indexOf(token);
    if (index < 0) throw new Error('This browser uses an unsupported client-data serialization.');
    return BigInt(new TextEncoder().encode(clientDataJSON.slice(0, index)).length);
  }
  return {
    auth: { ...decodeDerSignature(new Uint8Array(response.signature)), authenticatorData: toHex(new Uint8Array(response.authenticatorData)), clientDataJSON, challengeIndex: fieldIndex('challenge', expectedChallenge), typeIndex: fieldIndex('type', 'webauthn.get') },
    originIndex: fieldIndex('origin', origin),
  };
}
export async function requestPasskeyProof(credentialId: string, rpId: string, challenge: Hex) {
  const id = Uint8Array.from(atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const credential = await navigator.credentials.get({ publicKey: { challenge: new Uint8Array(hexToBytes(challenge)), rpId, allowCredentials: [{ type: 'public-key', id }], userVerification: 'required', timeout: 60000 } }) as PublicKeyCredential | null;
  if (!credential || credential.id !== credentialId) throw new Error('Passkey confirmation was cancelled or used another credential.');
  return encodeAssertion(credential.response as AuthenticatorAssertionResponse, challenge, window.location.origin);
}
