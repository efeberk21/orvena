# Orvena: passkey-authorized content approvals for AI applications

AI drafts need portable evidence that the expected account approved the precise version. A platform-local approved flag does not bind downstream content or provide independent revocation verification.

Orvena is an immutable approval contract and TypeScript SDK on Monad. Fresh WebAuthn/P256 assertions bind salted exact-content commitments. Applications independently pin the deployment and trusted approver, detect content changes and read current consent. Revisions link earlier approvals but require new signatures. Drafts/salts stay offchain until user-directed sharing.

Mera reconstructs the EVM account for public-key enrollment. Every approve/revoke still requires a separate action-bound P256 assertion. Nonce, deadline, chain and contract protect against reuse; sponsor routing cannot alter signed fields or call arbitrary destinations. Readers work without that sponsor or the platform database.

Approval contract: 0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba. Twenty-three automated tests and a real four-transaction testnet integration demonstrate positive/negative behavior with synthetic P256 fixtures. Physical passkey checks remain separate. The publisher is our reference integration, not independent adoption.

First customers are developers of AI-assisted support responses and company publishing. They retain organizational authorization policy while integrating our consent/provenance/revocation primitive. Optional managed sponsorship/support can fund operations without centralizing verification.

Approval is registered-key consent to exact bytes, not accuracy, authorship, model provenance or legal identity. Protect the approval UI and recheck at publication. Revocation cannot erase earlier disclosure. Salt secrecy limits dictionary attacks, and receipts share salts. ERC-8004/BTX are not implemented or claimed. See TRACK-PLAN.md for all judging criteria.
