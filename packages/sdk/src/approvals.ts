import { createPublicClient, defineChain, encodeAbiParameters, http, isAddress, isAddressEqual, keccak256, stringToHex, type Address, type Hex, type PublicClient } from 'viem';
import { approvalsAbi } from './approvals-abi.js';
export { approvalsAbi } from './approvals-abi.js';
export const approvalProtocol = 'orvena.approval.v1';
export const zeroApprovalId = `0x${'0'.repeat(64)}` as Hex;
const bytes32 = (value: unknown): value is Hex => typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
const commitmentDomain = keccak256(stringToHex('orvena.content.v1'));
export type ApprovalPackage = { schema: 'orvena.approval.v1'; chainId: number; contract: Address; owner: Address; approvalId: Hex; salt: Hex };
export type ContentApproval = { owner: Address; commitment: Hex; parentId: Hex; approvedAt: bigint; revokedAt: bigint };
export type ApprovalStatus = 'valid' | 'content-mismatch' | 'wrong-approver' | 'revoked' | 'not-found';
export type ApprovalVerification = { status: ApprovalStatus; approval?: ContentApproval };
export type ApprovalReader = {
  client: PublicClient; address: Address; chainId: number;
  getApproval(id: Hex): Promise<ContentApproval>;
  getNonce(owner: Address): Promise<bigint>;
  approvalChallenge(owner: Address, commitment: Hex, parentId: Hex, deadline: bigint): Promise<Hex>;
  revocationChallenge(owner: Address, id: Hex, deadline: bigint): Promise<Hex>;
  verifyApproval(input: { content: string; approvalPackage: unknown; expectedOwner: Address }): Promise<ApprovalVerification>;
};

/** Exact UTF-8 bytes: do not trim or normalize approved content. Keep the random salt offchain. */
export function contentCommitment(content: string, salt: Hex): Hex {
  if (typeof content !== 'string' || new TextEncoder().encode(content).length > 20000 || !bytes32(salt)) throw new Error('Content must be at most 20,000 UTF-8 bytes and salt must be 32 bytes.');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(content)) throw new Error('Content contains invisible control or bidirectional override characters.');
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes' }], [commitmentDomain, salt, stringToHex(content)]));
}
export function parseApprovalPackage(input: unknown): ApprovalPackage {
  const value = typeof input === 'string' ? JSON.parse(input) : input;
  if (!value || value.schema !== approvalProtocol || ![10143, 31337].includes(value.chainId) || !isAddress(value.contract) || !isAddress(value.owner) || /^0x0{40}$/i.test(value.owner) || !bytes32(value.approvalId) || !bytes32(value.salt)) throw new Error('Invalid Orvena approval package.');
  return { schema: approvalProtocol, chainId: value.chainId, contract: value.contract, owner: value.owner, approvalId: value.approvalId, salt: value.salt };
}
/** Pure decision logic; the reader supplies fresh, authoritative contract state. */
export function evaluateApproval(approval: ContentApproval, content: string, proof: ApprovalPackage, expectedOwner: Address): ApprovalVerification {
  if (!isAddress(expectedOwner) || /^0x0{40}$/i.test(expectedOwner)) throw new Error('Specify the approver trusted by your application.');
  if (approval.approvedAt === 0n) return { status: 'not-found' };
  if (!isAddressEqual(expectedOwner, approval.owner) || !isAddressEqual(proof.owner, approval.owner)) return { status: 'wrong-approver', approval };
  if (contentCommitment(content, proof.salt).toLowerCase() !== approval.commitment.toLowerCase()) return { status: 'content-mismatch', approval };
  if (approval.revokedAt !== 0n) return { status: 'revoked', approval };
  return { status: 'valid', approval };
}
export function createApprovalReader({ address, rpcUrl, chainId = 10143 }: { address: Address; rpcUrl?: string; chainId?: number }): ApprovalReader {
  if (!isAddress(address) || ![10143, 31337].includes(chainId)) throw new Error('Configure a trusted approval contract and supported chain.');
  const chain = defineChain({ id: chainId, name: chainId === 10143 ? 'Monad Testnet' : 'Local EVM', nativeCurrency: { name: 'Test MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl || (chainId === 10143 ? 'https://testnet-rpc.monad.xyz' : 'http://127.0.0.1:8545')] } } });
  const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 10000 }) });
  const getApproval = (id: Hex) => client.readContract({ address, abi: approvalsAbi, functionName: 'getApproval', args: [id] });
  return {
    client, address, chainId, getApproval,
    getNonce: (owner: Address) => client.readContract({ address, abi: approvalsAbi, functionName: 'nonces', args: [owner] }),
    approvalChallenge: (owner: Address, commitment: Hex, parentId: Hex, deadline: bigint) => client.readContract({ address, abi: approvalsAbi, functionName: 'approvalChallenge', args: [owner, commitment, parentId, deadline] }),
    revocationChallenge: (owner: Address, id: Hex, deadline: bigint) => client.readContract({ address, abi: approvalsAbi, functionName: 'revocationChallenge', args: [owner, id, deadline] }),
    async verifyApproval({ content, approvalPackage, expectedOwner }: { content: string; approvalPackage: unknown; expectedOwner: Address }): Promise<ApprovalVerification> {
      const proof = parseApprovalPackage(approvalPackage);
      if (proof.chainId !== chainId || !isAddressEqual(proof.contract, address)) throw new Error('Approval package targets a different chain or contract.');
      if (await client.getChainId() !== chainId) throw new Error('RPC network mismatch.');
      return evaluateApproval(await getApproval(proof.approvalId), content, proof, expectedOwner);
    },
  };
}

/** Call directly from a user click. No key or content is sent to a custody service. */
export async function requestContentApproval(options: { approvalUrl: string; content: string; expectedOwner?: Address; parentId?: Hex }): Promise<ApprovalPackage> {
  contentCommitment(options.content, zeroApprovalId); // Validate length before opening a window.
  if (options.expectedOwner && !isAddress(options.expectedOwner)) throw new Error('Invalid expected approver.');
  if (options.parentId && !bytes32(options.parentId)) throw new Error('Invalid parent approval.');
  const url = new URL(options.approvalUrl);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Approval URL must use HTTPS or localhost.');
  const origin = url.origin, id = crypto.randomUUID();
  url.pathname = '/approve'; url.search = ''; url.hash = ''; url.searchParams.set('request', id);
  const popup = window.open(url.href, `orvena-${id}`, 'popup,width=740,height=880');
  if (!popup) throw new Error('Allow popups for the passkey approval window.');
  return new Promise((resolve, reject) => {
    let sent = false, settled = false;
    const finish = (error?: Error, proof?: ApprovalPackage) => {
      if (settled) return; settled = true;
      window.removeEventListener('message', receive); clearInterval(closed); clearTimeout(timeout); clearTimeout(handshake);
      if (error) reject(error); else resolve(proof!);
    };
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== popup || event.data?.protocol !== approvalProtocol || event.data.id !== id) return;
      if (event.data.type === 'ready' && !sent) { sent = true; popup.postMessage({ protocol: approvalProtocol, type: 'request', id, content: options.content, expectedOwner: options.expectedOwner, parentId: options.parentId }, origin); return; }
      if (!sent || event.data.type !== 'response') return;
      if (event.data.error) { finish(new Error(String(event.data.error))); return; }
      try { const proof = parseApprovalPackage(event.data.result); if (options.expectedOwner && !isAddressEqual(proof.owner, options.expectedOwner)) throw new Error('Wrong approver returned.'); finish(undefined, proof); } catch (error) { finish(error instanceof Error ? error : new Error('Invalid approval response.')); }
    };
    window.addEventListener('message', receive);
    const closed = window.setInterval(() => { if (popup.closed) finish(new Error('Approval window was closed.')); }, 500);
    const handshake = window.setTimeout(() => { if (!sent) { finish(new Error('Approval window did not connect. Use Chrome or Edge and allow popups.')); popup.close(); } }, 15000);
    const timeout = window.setTimeout(() => { finish(new Error('Approval request expired.')); popup.close(); }, 5 * 60 * 1000);
  });
}
