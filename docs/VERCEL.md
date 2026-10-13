# Vercel deployment

Import the repository with the repository root as the root directory. `vercel.json` builds all workspaces, publishes `apps/web/dist`, and serves the shared protocol API as a Node 24 function. SPA rewrites preserve approval, verification and developer routes. Use a stable HTTPS domain: passkeys are bound to its hostname, not to changing preview domains.

Set these environment variables on the production deployment:

| Variable | Value |
| --- | --- |
| VITE_CHAIN_ID | 10143 |
| VITE_REGISTRY_ADDRESS / REGISTRY_ADDRESS | 0x105a31bbd4ddb181ade5b0ce7835df27b93a182f |
| VITE_APPROVALS_ADDRESS / APPROVALS_ADDRESS | 0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba |
| APP_ORIGIN | The exact stable HTTPS origin, without a trailing slash |
| RELAYER_PRIVATE_KEY | A new dedicated Monad testnet sponsor secret; never a VITE variable |
| RELAYER_BUDGET_MON | Maximum allowed balance of this dedicated sponsor (default 0.1 test MON) |

Do not upload a deployer key or reuse an account holding other funds. Keep production secrets out of preview deployments. Verification requires no sponsor secret. `/api/health` exposes public configuration and readiness, never the key.

The filesystem budget ledger used by the persistent local server is not durable on serverless instances. This deployment instead uses a dedicated prefunded testnet account: total sponsored gas spending is bounded by its available funds. It refuses sponsorship if the account balance exceeds the configured cap. Funding it again extends its lifetime budget and must be deliberate.

Rate limits and nonce queues are per instance. Concurrent requests across instances can collide and return a relay error; the UI may retry after reading current chain state. Replay protection and consent are enforced by the contracts regardless of sponsor concurrency. The function waits for mining before returning so it does not depend on background execution after a response. A production-scale sponsor should use a durable shared nonce allocator and distributed rate limiting.

Verify health, all SPA routes, changed-content/revocation checks, and physical passkey registration/approval/revocation on the final domain. Synthetic P256 integration checks exercise onchain behavior but do not substitute for Windows Hello.
