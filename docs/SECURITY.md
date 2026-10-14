# Security model

OrvenaApprovals references the immutable key registry. Fresh WebAuthn/P256 assertions authorize every approve and revoke. Challenges bind action, owner, commitment/approval ID, parent version, nonce, deadline, chain and contract. One nonce stream prevents replay. A revision can reference only the same owner's earlier approval; a revoked predecessor remains historical.

Verification checks registered P256 key, RP hash and origin, challenge/type, user presence and user verification. OpenZeppelin uses native Monad P256 with local Solidity fallback. Earlier verifiedAt flags and EOA signatures cannot substitute for content consent. No admin, upgrade, arbitrary execution or fund custody exists.

Enrollment is owner-authorized by the original registry. First content approval proves actual control of its registered P256 key. Enrollment/name alone does not establish real-world identity or company authority.

Content is frozen and reviewed at the original approval origin, then salted and hashed locally. Popup communication binds opener, browser-reported origin, unique request ID and protocol. Private keys/PRF never cross the channel. Compromised approval code can misrepresent signed content: protect origin, code delivery and third-party script isolation in production.

Salts stay offchain until receipt sharing. Salts in public receipts weaken confidentiality of guessable content. Verification links put the receipt in a URL fragment rather than a server query. Recipients see shared content/receipt. LocalStorage holds public key and receipt metadata, not plaintext content or PRF; local access to receipt salts weakens confidentiality. This is not zero knowledge.

Mera reconstructs a software EVM signing key in memory for enrollment. The P256 credential key remains with the authenticator. Same-credential PRF/provider access and RP continuity determine recovery. Complete first registration before deleting creation metadata: normal assertions do not expose the registration public key. Registered keys can recover without that metadata.

Readers independently pin contract/chain and expected approver. They check exact content and fresh revocation state. RPC errors fail closed. Recheck at actual publication; state can change between a read and an external publish. Revocation cannot recall earlier disclosure. The browser publishing gate is a reference, not enforcement for other services.

Sponsor allows only createProfile at a fixed key registry and approveContent/revokeApproval at a fixed approval contract. ABI/schema/chain/code checks, simulation, gas bounds and origin filtering apply to both deployments. The persistent server uses rate limits, serialized nonces and durable maximum-fee reservations; run one process per ledger. Vercel instead uses a dedicated prefunded testnet wallet whose balance must not exceed its configured cap. Rate limits and nonce queues are per instance and concurrent requests can fail. Funding again increases the lifetime budget. See VERCEL.md. Synthetic users can consume sponsor budget; no Sybil protection is claimed.

Evidence: 23 automated tests and two testnet HTTP integrations, each with four actual transactions and twelve checks using synthetic P256 fixtures. Separate user-confirmed Windows device passkey creation, approval and revocation on the final HTTPS origin are recorded in deployments/physical-passkey-10143.json and the submitted technical video. That confirms this tested device/provider flow, not universal authenticator or cross-device compatibility. No external audit, legal signature validity, factual/model/authorship certification, personhood, universal recovery or independent customer adoption is claimed.

