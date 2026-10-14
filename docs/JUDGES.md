# Try Orvena as a judge

The product is the approval contract and SDK. The live web applications demonstrate human review and a separate publisher consuming the receipt. No shared credentials are needed.

## No passkey required: check recorded consent

1. Open [the public verifier](https://orvena-ashy.vercel.app/verify).
2. Paste the JSON from [recorded-receipt.json](../examples/recorded-receipt.json), or download it and use **Or import the receipt file**. This file contains only the receipt, so it can be imported directly.
3. Enter the expected approver for this public example:

```text
0xb0bE7f01e2280d9Fd669d3c45057591f552b8e10
```

4. Paste this exact content, with no extra leading/trailing whitespace (also in [recorded-content.txt](../examples/recorded-content.txt)):

```text
Our new support hours start on Monday. You can reach our team between 09:00 and 18:00. Existing requests will continue to receive a response.
```

5. Click **Verify current approval**. Expected: **Approval revoked — do not publish**. The user revoked this receipt in the actual recorded flow.
6. Change **Monday** to **Tuesday** and verify again. Expected: **Content changed — do not publish**. Content mismatch is evaluated before revocation.

For this fixture, the expected address is pinned from our independently recorded transaction evidence. A real application must derive the authorized approver from its own trusted policy, never blindly from the submitted receipt.

The same read works in Node after installing/building the workspace:

```bash
node examples/verify-approval.mjs examples/recorded-receipt.json examples/recorded-content.txt 0xb0bE7f01e2280d9Fd669d3c45057591f552b8e10
```

Expected JSON status: `revoked`. The verifier deliberately exits with code **1** for every non-valid result, including this fixture. It reads Monad directly without the Orvena API.

## Full flow with your own passkey

Use a browser/provider with WebAuthn PRF and user verification support. The recorded Windows device worked on the final HTTPS origin; that does not establish support on every device. If your provider cannot supply PRF, use the read-only path above and [live technical video](https://youtu.be/xs9y3Z6uXaM).

1. Open [Orvena's approval account](https://orvena-ashy.vercel.app/#app), create a passkey and complete your device prompt. Creating the account does not approve content.
2. Review the draft. Click **Approve this version with passkey** and confirm again. First approval registers the public key and the sponsor pays testnet gas.
3. Copy your approval account address and download the receipt. Verify original text + receipt + that independently selected address: `valid`. Change a word or whitespace: `content-mismatch`.
4. Open [the separate publisher](https://orvena-publisher.vercel.app). Import the receipt and exact text, or request approval through its popup. Allow the popup. The demo publication step accepts only a current `valid` result.
5. Return to Orvena, choose **Revoke**, then **Revoke with passkey** and confirm the fresh device challenge. Recheck original content: `revoked`.

Sponsorship is testnet-only, capped and may become unavailable when exhausted. Reads require no gas or sponsor. Passkeys stay bound to their original RP/domain; a localhost credential does not transfer to this HTTPS origin.

## Evidence and scope

- [Actual device flow](../deployments/physical-passkey-10143.json): approval and revocation hashes, public receipt and exact text. Both receipts were independently confirmed successful on Monad; the SDK confirmed current revoked state.
- [Public HTTPS integration](../deployments/approval-integration-vercel-10143.json): 12 checks, four actual testnet transactions, **synthetic** P256 assertions.
- [Technical demo](https://youtu.be/xs9y3Z6uXaM), 2:33; [pitch](https://youtu.be/7hhqMcqZgyI), 1:48. Both silent and unlisted, with readable explanations.

The draft is prepared; no live AI model is connected. Consent concerns exact bytes, not accuracy, authorship, model provenance or legal identity. Our publisher is a project-owned integration, not customer traction. Revocation cannot recall earlier distribution. A real publisher must perform the current check on its authoritative backend.
