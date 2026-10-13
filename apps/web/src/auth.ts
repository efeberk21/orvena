import { createPasskeyWithPrfOutput, getPasskeyPrfOutput, type WebAuthnClient } from '@category-labs/mera';
export { authError } from './auth-errors';
import { toViemAccount } from '@category-labs/mera/viem';
import { deriveSigningSession } from './derivation';
import { toHex, type Hex } from 'viem';

export const rpId = import.meta.env.VITE_RP_ID || window.location.hostname;
export const metadataKey = 'orvena.credential.v1';
export type CredentialMetadata = { credentialId: string; qx: Hex; qy: Hex; createCeremonies: number };
export type IdentitySession = { account: ReturnType<typeof toViemAccount>; credentialId: string; metadata?: CredentialMetadata; expiresAt: number; isActive: () => boolean; end: () => void };

function checkBrowser() {
  if (!window.isSecureContext) throw new Error('Passkeys require HTTPS or localhost.');
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error('This browser does not support passkeys.');
  if (rpId !== window.location.hostname && !window.location.hostname.endsWith(`.${rpId}`)) throw new Error('The configured passkey domain does not match this page.');
}
function base64Bytes(value: string) { return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)); }
function bufferBytes(value: BufferSource): Uint8Array {
  return value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}
export function clearMetadata() { localStorage.removeItem(metadataKey); }
export function savedCredentialId(): string | undefined { try { const value = JSON.parse(localStorage.getItem(metadataKey) || 'null')?.credentialId; return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) ? value : undefined; } catch { return undefined; } }
function metadataFor(credentialId: string): CredentialMetadata | undefined {
  try { const data = JSON.parse(localStorage.getItem(metadataKey) || 'null'); return data?.credentialId === credentialId ? data : undefined; } catch { return undefined; }
}
function startSession(prfOutput: Uint8Array, credentialId: string, metadata?: CredentialMetadata): IdentitySession {
  const signing = deriveSigningSession(prfOutput);
  let ended = false;
  const account = toViemAccount(signing);
  const end = () => { if (!ended) { ended = true; signing.end(); clearTimeout(timer); window.removeEventListener('pagehide', end); } };
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const timer = window.setTimeout(end, 10 * 60 * 1000);
  window.addEventListener('pagehide', end);
  return { account, credentialId, metadata, expiresAt, isActive: () => !ended && Date.now() < expiresAt, end };
}

export async function createIdentity(): Promise<IdentitySession> {
  checkBrowser();
  let publicKey: { qx: Hex; qy: Hex } | undefined;
  let ceremonies = 0;
  // Mera's adapter exposes registration so we can capture the real credential's P256 SPKI.
  const webAuthnClient: WebAuthnClient = {
    async createCredential(request) {
      ceremonies++;
      const credential = await navigator.credentials.create({ publicKey: {
        rp: request.rp, user: request.user, challenge: request.challenge,
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
        attestation: 'none', timeout: 60000,
        extensions: { prf: { eval: { first: request.prfSalt } } },
      } }) as PublicKeyCredential | null;
      if (!credential) throw new Error('Passkey creation was cancelled.');
      const response = credential.response as AuthenticatorAttestationResponse;
      const spki = response.getPublicKey();
      if (!spki || response.getPublicKeyAlgorithm() !== -7) throw new Error('This credential cannot provide a P256 public key. Try a compatible browser.');
      const key = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
      const jwk = await crypto.subtle.exportKey('jwk', key);
      publicKey = { qx: toHex(base64Bytes(jwk.x!)), qy: toHex(base64Bytes(jwk.y!)) };
      const prf = credential.getClientExtensionResults().prf;
      return { credentialId: new Uint8Array(credential.rawId), transports: response.getTransports(), prfEnabled: prf?.enabled === true, ...(prf?.results?.first ? { prfOutput: bufferBytes(prf.results.first) } : {}) };
    },
    async getCredential(request) {
      ceremonies++;
      const credential = await navigator.credentials.get({ publicKey: {
        rpId: request.rpId, challenge: request.challenge, userVerification: 'required', timeout: 60000,
        ...(request.allowCredential ? { allowCredentials: [{ type: 'public-key', id: request.allowCredential.credentialId }] } : {}),
        extensions: { prf: { eval: { first: request.prfSalt } } },
      } }) as PublicKeyCredential | null;
      if (!credential) throw new Error('Passkey confirmation was cancelled.');
      const first = credential.getClientExtensionResults().prf?.results?.first;
      return { credentialId: new Uint8Array(credential.rawId), ...(first ? { prfOutput: bufferBytes(first) } : {}) };
    },
  };
  const result = await createPasskeyWithPrfOutput({ rp: { id: rpId, name: 'Orvena' }, user: { name: `orvena-${crypto.randomUUID().slice(0, 8)}`, displayName: 'Orvena approval account' }, webAuthnClient });
  if (!publicKey) { result.prfOutput.fill(0); throw new Error('Registration public key was unavailable.'); }
  const metadata = { credentialId: result.credentialId, ...publicKey, createCeremonies: ceremonies };
  result.prfSalt.fill(0);
  // Public metadata only. A storage failure must not strand an otherwise successful login.
  try { localStorage.setItem(metadataKey, JSON.stringify(metadata)); } catch { /* Storage is optional. */ }
  return startSession(result.prfOutput, result.credentialId, metadata);
}
export async function loginIdentity(credentialId?: string): Promise<IdentitySession> {
  checkBrowser();
  // Omit credential for discoverable recovery; approval can explicitly target the unlocked credential.
  const result = await getPasskeyPrfOutput({ rpId, timeout: 60000, ...(credentialId ? { credential: { credentialId } } : {}) });
  return startSession(result.prfOutput, result.credentialId, metadataFor(result.credentialId));
}
