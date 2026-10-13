# Five-minute integration

1. Run npm run pack:sdk. Install the tarball in a separate application.
2. Pin the approval contract 0x542ed99e33509dfecc7c4fc2d5293bf427cf91ba on Monad testnet 10143. Establish expectedOwner through your own trusted user/role system.
3. Call requestContentApproval({approvalUrl: ORVENA_ORIGIN, content, expectedOwner}) from a user click. Freeze the draft while approval is pending.
4. Keep/share the returned receipt with the intended content. The receipt shares its salt, which is not onchain.
5. At publication call reader.verifyApproval({content, approvalPackage, expectedOwner}). Fail closed unless valid. Read fresh chain state.

/developer contains complete copyable code. examples/verify-approval.mjs verifies receipt/content files from Node. The separate :5180 publisher demonstrates the popup at a different origin and its own publishing gate. It is our example, not independent adoption.

The browser example gates publication only inside its demo. A real service must perform the check at its authoritative publication boundary, usually server-side. A client that ignores the protocol can still publish; Orvena does not control arbitrary websites.

The contract proves account consent, not organizational role, legal identity, original authorship or model provenance. Your application supplies trusted approver policy. Errors and cached historical checks must not permit publication.

