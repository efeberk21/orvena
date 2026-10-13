# Testing

Use Node 24 via scripts/run.ps1. npm test runs twenty contract, cryptography, SDK and sponsor-budget tests. npm run typecheck and npm run build validate TypeScript/production outputs.

npm run dev:local starts/reuses EVM, deploys key/approval contracts and isolates app :5174 and sponsor :3002. npm run test:local runs HTTP integration. Local Hardhat keys must never hold public-chain funds.

npm run test:integration uses the configured Monad sponsor :3001. It performs registration/approval/revision/revoke and negative checks, then writes public evidence. It spends sponsored test MON; do not run repeatedly without checking budget. Assertions are synthetic, not physical authenticator tests.

Physical device: create/choose passkey, approve harmless draft, inspect real receipt, verify original bytes with an independently trusted owner, change content, revoke and reverify. Test linked revision. For a registered key, public-metadata deletion followed by discoverable login should retain the address. A second device requires same-credential PRF/provider access and separate validation at the same RP.

styles.css, components.css and all three visual modules were compared with the pre-pivot snapshot and were identical. IdentityStory changed only product text and links, preserving animation, timeline and geometry.

