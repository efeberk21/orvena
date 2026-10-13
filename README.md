<p align="center"><img src="apps/web/public/logo.svg" width="72" alt="Orvena" /></p>
<h1 align="center">Orvena</h1>
<p align="center"><strong>AI can draft. Only you can approve.</strong><br/>Passkey-authorized content approvals, verified on Monad.</p>
<p align="center"><a href="docs/DEMO.md">Demo guide</a> · <a href="docs/INTEGRATION.md">SDK integration</a> · <a href="docs/SECURITY.md">Security</a> · <a href="https://testnet.monadscan.com/address/0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba">Monad contract</a></p>

## Why Orvena?

AI makes generating a draft easy. Applications still need to know which exact version an authorized person approved, whether it changed and whether that approval remains active. A login session or a screenshot of an approval cannot answer all three.

Orvena is a portable approval primitive: a user reviews a draft and approves its exact bytes with a fresh passkey assertion. Another application verifies the content, independently trusted approver and current revocation state on Monad before publishing. Changed content requires a new approval; revisions can link to earlier versions. The contract and SDK are the product, with reference web applications.

| Step | What happens |
| --- | --- |
| Draft | An AI application prepares content for human review. |
| Approve | A passkey signs an action-specific challenge; Monad verifies P256. |
| Carry | A portable JSON receipt travels with the content. |
| Verify | An application checks exact content, expected approver and current chain state. |
| Revoke or revise | The owner uses their passkey again; verifiers see the updated state. |

Built for **Monad Metropolis — Trust, Identity & AI Infrastructure**, using Monad's native P256 support and **Mera** for passkey account derivation.

## Try it

Open http://localhost:5173 and choose **Open app**. Create or unlock your passkey, review the prepared draft and approve. First approval registers the public credential key automatically. No profile form, faucet, wallet pairing or Reown account is needed. Download the receipt, then open **Verify** with the original content and independently trusted account address. Change a word, or revoke the approval and check again.

The publisher example runs at /example and separately at http://localhost:5180. It requests approval through the popup SDK and checks current state before publishing inside the demo. It uses a prepared AI draft; no live model is connected. This is our integration, not independent customer adoption.

No seed phrase, wallet extension or user-held gas balance is required. The public-key registry binds the account to its passkey; every approval and revocation requires a new assertion. The publisher example checks the portable receipt before its demo publication step.

## Run

Use Node 24 LTS. The Windows launcher selects the bundled runtime:

~~~powershell
.\scripts\run.ps1 install
.\scripts\run.ps1 compile
.\scripts\run.ps1 dev
~~~

On a new installation configure .env from .env.example. Do not overwrite an existing configured .env. Private keys are test-only server runtime secrets and must never use VITE_* names. Web :5173, loopback API :3001, separate publisher :5180. Use localhost or HTTPS for WebAuthn.

| Command | Purpose |
| --- | --- |
| npm run compile | Contracts and generated ABIs |
| npm run typecheck | TypeScript checks |
| npm test | Contract, crypto, SDK and sponsor-budget tests |
| npm run build | SDK, web, sponsor and publisher production builds |
| npm run dev:local | Isolated local EVM/app at :5174 |
| npm run test:local | Local HTTP protocol integration |
| npm run test:integration | Configured testnet HTTP integration; spends sponsored test MON |
| npm run deploy:approvals:testnet | Deploy using configured test-only deployer |
| npm run pack:sdk | Portable SDK tarball |
| npm run doctor | Chain and positive/negative native P256 checks |
| npm run verify:bundle | Check server signing secrets are absent from browser assets |
| npm start | Production web and API on one origin |
| npm run demo | Windows: launch the completed local app/API/publisher in hidden background processes |

## Deployment and evidence

Monad testnet 10143:

- Key registry: 0x105a31bbd4ddb181ade5b0ce7835df27b93a182f.
- Approval protocol: **0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba**.
- [Approval deployment](https://testnet.monadscan.com/tx/0x437467c367d0c641c61c14adcc863e4fdf69745bb8ca52cff64282f1f5406563).
- Public metadata: deployments/approvals-10143.json.
- Twenty-three passing automated tests, including the Vercel API adapter.
- Four actual sponsored testnet transactions: registration, approval, linked revision and revocation. Twelve integration checks are recorded in deployments/approval-integration-10143.json. Synthetic P256 assertions are not physical authenticator tests.

## Integration

~~~ts
import { requestContentApproval, createApprovalReader } from '@orvena/sdk';
const approvalPackage = await requestContentApproval({
  approvalUrl: ORVENA_ORIGIN, content, expectedOwner
});
const reader = createApprovalReader({
  address: '0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba', chainId: 10143
});
const result = await reader.verifyApproval({ content, approvalPackage, expectedOwner });
if (result.status !== 'valid') throw new Error(result.status);
// Publish the same exact bytes after this fresh check.
~~~

Pin the deployment and expected approver independently. Verification works without the Orvena server; requesting a passkey needs its original RP/domain. See docs/INTEGRATION.md and examples/verify-approval.mjs.

## Security and delivery boundaries

Approve/revoke signatures bind exact commitment/approval ID, action, owner, parent, nonce, deadline, chain and contract. P256 is verified onchain; earlier profile verification cannot substitute. There is no admin, upgrade or fund custody. The sponsor accepts only registration and approve/revoke at fixed destinations, with simulation and rate limits. The persistent server reserves fees in a durable ledger. Vercel uses a dedicated, prefunded testnet account with a balance cap; instance rate limits and nonce queues do not constitute a distributed budget or global queue. See [deployment instructions](docs/VERCEL.md).

Content and random salt remain offchain. Receipt JSON/links share the salt; keep them private for private content. Public salts weaken protection of guessable text. The browser caches receipt metadata, not content or private signing material.

Approval proves consent to exact bytes by a registered key. It does not prove accuracy, model source, authorship, legal identity or personhood. Your application sets organizational authority and enforces current approval at its actual publication boundary. Revocation cannot recall already shared content; cached valid results can become revoked. Protect the approval origin against malicious code.

Mera's PRF-derived EVM signing key briefly exists in browser memory for registration; the P256 credential key remains with the authenticator. Recovery requires the same credential and supported PRF/provider. Prior registry device tests do not validate this new flow. Physical passkey approve/revoke on the final HTTPS origin, public hosting, recorded videos and portal submission remain delivery steps.

See docs/SECURITY.md, docs/STATUS.md, docs/DEMO.md and docs/DEPLOYMENT-READY.md. No independent adoption or external audit is claimed.

