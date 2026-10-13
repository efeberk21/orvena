# Deployment and submission

Contracts are on Monad testnet; web/sponsor are currently local. Preserve .env. Never include test-only server keys in VITE_* values or the frontend bundle.

Choose the final HTTPS domain before recording. Configure APP_ORIGIN and VITE_RP_ID, both REGISTRY_ADDRESS/VITE_REGISTRY_ADDRESS (0x105a31bbd4ddb181ade5b0ce7835df27b93a182f) and APPROVALS_ADDRESS/VITE_APPROVALS_ADDRESS (0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba).

Build with Node 24: npm run compile, npm run build, npm run verify:bundle. Run npm start behind HTTPS on one origin. Static serving exposes only apps/web/dist. Keep the sponsor loopback-bound, with correct proxy trust, persistent RELAYER_STATE_FILE, one process per ledger and conservative gas/budget limits. Provide a funded test-only RELAYER_PRIVATE_KEY at runtime.

Create a fresh passkey on the final RP; localhost passkeys do not migrate domains. Physically test exact content, mismatch, revoke, revision and recovery of a registered key. Judges create their own credential; no private keys or somebody else's passkeys are test login credentials. Retain sponsor capacity for their actions.

Routes: /, /approve, /verify, /example, /developer. Old /wallet bookmarks redirect to the app. Separate publishers configure VITE_ORVENA_APPROVAL_URL and enforce current SDK verification at the authoritative publication boundary.

Portal requirements: logo <=3 MB; accessible public GitHub; public live product link and instructions; working technical demo <=3 minutes; pitch <=2 minutes. Optional advertisement is not required. Team/project creation, track selection and submission must be verified. Deadline: 14 October 2026 06:59 Europe/Istanbul.

