# @orvena/sdk

Portable content approval on Monad. Run npm run pack:sdk from Orvena, then install .local/packages/orvena-sdk-0.1.0.tgz in another project. Not published on npm.

~~~ts
import { requestContentApproval, createApprovalReader } from '@orvena/sdk';
// Call directly from a user click. Your app independently sets expectedOwner.
const receipt = await requestContentApproval({
  approvalUrl: ORVENA_ORIGIN, content: exactDraft, expectedOwner,
  // parentId: previousApprovalId
});
const reader = createApprovalReader({
  address: '0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba', chainId: 10143
});
const result = await reader.verifyApproval({
  content: exactDraft, approvalPackage: receipt, expectedOwner
});
if (result.status !== 'valid') throw new Error(result.status);
~~~

API:

- createApprovalReader({address, chainId, rpcUrl?}): getApproval, getNonce, approvalChallenge, revocationChallenge, verifyApproval.
- requestContentApproval({approvalUrl, content, expectedOwner?, parentId?}): user-mediated popup returning ApprovalPackage. Verification still requires a trusted expectedOwner.
- parseApprovalPackage(input): validate/canonicalize JSON/object.
- contentCommitment(content, salt): keccak256 ABI-encoded version domain, 32-byte salt and exact UTF-8 bytes. No trimming/normalization; maximum 20,000 UTF-8 bytes, unsafe control/bidi override characters rejected.
- evaluateApproval: pure decision helper. State must come from the trusted reader.
- approvalsAbi, approvalProtocol, zeroApprovalId and typed package/verification exports.
- Registry reader/registration helpers support the existing key registry.

Statuses: valid, content-mismatch, wrong-approver, revoked, not-found. Wrong chain/contract or RPC errors throw. Never treat failure as valid. Read-only verification works in Node without a browser or Orvena API.

Receipts contain schema, chainId, contract, owner, approvalId and salt. No content/private keys. A receipt shares the salt: keep it private for private content. Independently pin contract and authorized approver; receipt fields do not establish trust or company identity.

The popup stays on Orvena's original passkey domain and binds opener, origin, request ID and protocol. PRF/key material never crosses postMessage. Current verification is not a permanent permit; recheck at publication. Revocation cannot erase already disclosed content.

