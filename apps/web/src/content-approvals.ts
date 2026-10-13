import { approvalsAbi, approvalProtocol, contentCommitment, zeroApprovalId, type ApprovalPackage } from '@orvena/sdk';
import { encodeFunctionData, isAddressEqual, sha256, stringToHex, toHex, type Hex } from 'viem';
import { approvals, approvalsAddress, chainId, registry } from './chain';
import { rpId, type IdentitySession } from './auth';
import { relay, registerApprovalKey, type Progress } from './transactions';
import { requestPasskeyProof } from './webauthn-proof';

async function context(session: IdentitySession) {
  if (!session.isActive()) throw new Error('Sign in again to confirm this approval.');
  if (!approvals || !approvalsAddress || !registry) throw new Error('Deploy and configure the approval contract first.');
  if (await approvals.client.getChainId() !== chainId) throw new Error('RPC network mismatch.');
  const block = await approvals.client.getBlock();
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = (chainId === 31337 && now > block.timestamp ? now : block.timestamp) + 300n;
  return { reader: approvals, address: approvalsAddress, deadline };
}
async function ensureKey(session: IdentitySession, progress: Progress) {
  if (!registry) throw new Error('Identity registry is unavailable.');
  let profile = await registry.getProfile(session.account.address);
  if (!profile.exists) {
    // Register only the public key/context; no name/bio onboarding is required.
    await registerApprovalKey(session, progress);
    profile = await registry.getProfile(session.account.address);
  }
  if (profile.origin !== window.location.origin || profile.rpIdHash !== sha256(stringToHex(rpId))) throw new Error('This passkey was registered at another origin. Open its original Orvena site.');
}
export async function approveContent(session: IdentitySession, content: string, parentId: Hex, progress: Progress) {
  const started = performance.now();
  const salt = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const commitment = contentCommitment(content, salt);
  if (!content.length) throw new Error('Add the exact content you want to approve.');
  progress('preparing');
  const work = async () => {
    await context(session);
    await ensureKey(session, progress);
    const { reader, address, deadline } = await context(session);
    if (parentId !== zeroApprovalId) {
      const parent = await reader.getApproval(parentId);
      if (!parent.approvedAt || !isAddressEqual(parent.owner, session.account.address)) throw new Error('Previous version must be an approval from this account on this deployment.');
    }
    const id = await reader.approvalChallenge(session.account.address, commitment, parentId, deadline);
    progress('signing');
    const { auth, originIndex } = await requestPasskeyProof(session.credentialId, rpId, id);
    if (!session.isActive()) throw new Error('Your session expired. Please sign in and retry.');
    const data = encodeFunctionData({ abi: approvalsAbi, functionName: 'approveContent', args: [session.account.address, commitment, parentId, deadline, auth, originIndex] });
    const receipt = await relay(data, 'Content approved with passkey', started, progress, 'approvals');
    const approvalPackage: ApprovalPackage = { schema: approvalProtocol, chainId, contract: address, owner: session.account.address, approvalId: id, salt };
    if ((await reader.verifyApproval({ content, approvalPackage, expectedOwner: session.account.address })).status !== 'valid') throw new Error('The confirmed approval does not match this content.');
    return { approvalPackage, receipt };
  };
  return navigator.locks ? navigator.locks.request(`orvena-approval-${session.account.address}`, work) : work();
}
export async function revokeContent(session: IdentitySession, proof: ApprovalPackage, progress: Progress) {
  const started = performance.now(); progress('preparing');
  const work = async () => {
    const { reader, address, deadline } = await context(session);
    if (proof.chainId !== chainId || !isAddressEqual(proof.contract, address) || !isAddressEqual(proof.owner, session.account.address)) throw new Error('This approval belongs to another account or deployment.');
    const approval = await reader.getApproval(proof.approvalId);
    if (!isAddressEqual(approval.owner, session.account.address) || !approval.approvedAt) throw new Error('Approval not found for this account.');
    if (approval.revokedAt) throw new Error('This approval is already revoked.');
    await ensureKey(session, progress);
    progress('signing');
    const challenge = await reader.revocationChallenge(session.account.address, proof.approvalId, deadline);
    const { auth, originIndex } = await requestPasskeyProof(session.credentialId, rpId, challenge);
    const receipt = await relay(encodeFunctionData({ abi: approvalsAbi, functionName: 'revokeApproval', args: [proof.approvalId, deadline, auth, originIndex] }), 'Approval revoked with passkey', started, progress, 'approvals');
    if (!(await reader.getApproval(proof.approvalId)).revokedAt) throw new Error('Revocation was not recorded.');
    return receipt;
  };
  return navigator.locks ? navigator.locks.request(`orvena-approval-${session.account.address}`, work) : work();
}
