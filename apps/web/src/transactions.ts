import { encodeFunctionData, formatEther, isHex, sha256, stringToHex, type Hex } from 'viem';
import { hashProfile, registryAbi, registryDomain, registryTypes, zeroApprovalId } from '@orvena/sdk';
import { approvalsAddress, chainId, explorerUrl, requireRegistry } from './chain';
import { rpId, type IdentitySession } from './auth';
export type TransactionStage = 'preparing' | 'signing' | 'submitted' | 'confirmed';
export type TransactionReceipt = { hash: Hex; label: string; fee: string; elapsedMs: number; block: string; explorer: string | null };
export type Progress = (stage: TransactionStage, hash?: Hex) => void;
export async function relay(data: Hex, label: string, started: number, progress: Progress, target: 'registry' | 'approvals' = 'registry'): Promise<TransactionReceipt> {
  const response = await fetch('/api/relay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, target }) });
  let result: { hash?: Hex; error?: string };
  try { result = await response.json(); } catch { throw new Error('The gas sponsor returned an invalid response.'); }
  if (!response.ok || !result.hash) throw new Error(result.error || 'Gas sponsorship is temporarily unavailable.');
  if (!isHex(result.hash) || result.hash.length !== 66) throw new Error('Invalid sponsor transaction hash.');
  progress('submitted', result.hash);
  const { reader } = requireRegistry();
  const receipt = await reader.client.waitForTransactionReceipt({ hash: result.hash, timeout: 120000 });
  if (receipt.status !== 'success') throw new Error(`Transaction reverted: ${result.hash}`);
  const tx = await reader.client.getTransaction({ hash: result.hash });
  const address = target === 'approvals' ? approvalsAddress : requireRegistry().address;
  if (!address || tx.to?.toLowerCase() !== address.toLowerCase() || tx.input.toLowerCase() !== data.toLowerCase() || tx.value !== 0n) throw new Error('Sponsor transaction differs from your signed request.');
  progress('confirmed', result.hash);
  return { hash: result.hash, label, fee: formatEther(receipt.gasUsed * receipt.effectiveGasPrice), elapsedMs: performance.now() - started, block: receipt.blockNumber.toString(), explorer: explorerUrl ? `${explorerUrl}/tx/${result.hash}` : null };
}
export async function registerApprovalKey(session: IdentitySession, progress: Progress) {
  if (!session.isActive() || !session.metadata) throw new Error('The registration key is unavailable. Existing registered passkeys can still be recovered; first-time registration needs the original creation metadata.');
  const started = performance.now(); progress('preparing');
  const { reader, address } = requireRegistry();
  if (await reader.client.getChainId() !== chainId) throw new Error('RPC network mismatch.');
  const [nonce, block] = await Promise.all([reader.getNonce(session.account.address), reader.client.getBlock()]);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = (chainId === 31337 && now > block.timestamp ? now : block.timestamp) + 300n;
  const input = { name: 'Orvena approver', bio: '', avatar: zeroApprovalId, qx: session.metadata.qx, qy: session.metadata.qy, rpIdHash: sha256(stringToHex(rpId)), origin: window.location.origin };
  const signature = await session.account.signTypedData({ domain: registryDomain(chainId, address), types: registryTypes, primaryType: 'CreateProfile', message: { owner: session.account.address, profileHash: hashProfile(input), nonce, deadline } });
  if (!session.isActive()) throw new Error('Session ended. Sign in again.');
  return relay(encodeFunctionData({ abi: registryAbi, functionName: 'createProfile', args: [session.account.address, input, deadline, signature] }), 'Approval key registered', started, progress);
}
