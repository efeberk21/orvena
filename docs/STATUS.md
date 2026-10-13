# Current status

Completed: content-bound WebAuthn/P256 approve/revoke contract, owner-linked revisions, nonce/domain/deadline protection; SDK request/verify; salted commitments and downloadable receipts; fixed-target sponsor; main approval account, public verifier, developer guide and separate-origin publisher.

Monad testnet contract: 0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba. Deployment metadata: deployments/approvals-10143.json. Twenty automated tests passed. Four real sponsored testnet transactions and twelve integration checks are in deployments/approval-integration-10143.json. P256 assertions were synthetic, not physical passkeys.

Removed generic wallet/WC/Notes features and dependencies. Original styles and all lock-animation modules are unchanged; feature text/links updated. Pre-pivot source snapshot is .local/before-approval-pivot, excluding environment files.

Remaining delivery: physical-device approve/revoke on local and final HTTPS origin; public hosting; <=3 minute live demo; <=2 minute pitch; portal team/project/track selection and submission. Localhost is not the required public product link. Our publisher is integration feasibility, not third-party traction. Only real developer interest should be claimed.

TRACK-PLAN.md maps the product to all five criteria. Implementation completion is distinct from public delivery and recorded-device evidence.

Final verification: the combined typecheck/compile/20-test/production-build check passed for all application workspaces. The packed SDK was installed in a separate consumer and verified actual testnet revocation and changed-content state without the Orvena API. Windows background demo launcher: scripts/start-demo.ps1; web :5173, publisher :5180, sponsor :3001. Server signing secrets were absent from the built browser assets.

