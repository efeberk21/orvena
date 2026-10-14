# Current status

Completed: content-bound WebAuthn/P256 approve/revoke contract, owner-linked revisions, nonce/domain/deadline protection; SDK request/verify; salted commitments and downloadable receipts; fixed-target sponsor; main approval account, public verifier, developer guide and separate-origin publisher.

Monad testnet contract: 0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba. Deployment metadata: deployments/approvals-10143.json. Twenty-three automated tests passed. Four real sponsored testnet transactions and twelve integration checks are in deployments/approval-integration-10143.json. P256 assertions were synthetic, not physical passkeys.

Removed generic wallet/WC/Notes features and dependencies. Original styles and all lock-animation modules are unchanged; feature text/links updated. Pre-pivot source snapshot is .local/before-approval-pivot, excluding environment files.

Device and video delivery complete: real user-confirmed Windows device passkey creation, approval and revocation on the final HTTPS origin. Evidence: deployments/physical-passkey-10143.json. Silent technical demo (153 seconds): https://youtu.be/xs9y3Z6uXaM. Silent pitch (108 seconds): https://youtu.be/7hhqMcqZgyI. Both are published unlisted. Our publisher is integration feasibility, not third-party traction. The portal entry was submitted for Trust, Identity & AI Infrastructure on 14 October 2026; its confirmed status is **Ready for judging**. Screenshot: submission/submitted.png.

TRACK-PLAN.md maps the product to all five criteria. Implementation completion is distinct from public delivery and recorded-device evidence.

Final verification: typecheck, contract compilation, 23 automated tests and production builds passed for all application workspaces. The packed SDK was installed in a separate consumer and verified actual testnet revocation and changed-content state without the Orvena API. Windows background demo launcher: scripts/start-demo.ps1; web :5173, publisher :5180, sponsor :3001. Server signing secrets were absent from the built browser assets.


Public delivery: https://orvena-ashy.vercel.app and the separate SDK publisher https://orvena-publisher.vercel.app are deployed on Vercel. Health and every SPA route are accessible without authentication. Four sponsored transactions and twelve integration checks through HTTPS are recorded in deployments/approval-integration-vercel-10143.json. Chrome showed revoked and changed-content states. The bundled server also passed its adapter tests with Node ESM require support disabled, matching the platform restriction. Physical authenticator approve/revoke is now complete and recorded separately from these synthetic integration checks. The existing navbar mark is the logo; its 512px PNG export meets the portal requirements. Efeberk Zorlukol is the solo developer.
