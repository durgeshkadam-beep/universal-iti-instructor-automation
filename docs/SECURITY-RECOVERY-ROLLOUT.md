# Security and recovery rollout

## Current boundary

These changes are prepared on PR #16. They do not enable an Identity Platform upgrade, MFA enrollment, a billing plan, live restore, production rules or an account reset. The currently deployed release remains the previously verified source until a separate deployment is confirmed.

### Firebase MFA

The frontend now handles Firebase-native TOTP challenges from password sign-in, Google popup sign-in and redirect completion. It offers an enrolled authenticator choice, clears entered codes, and permits explicit cancellation. Only Firebase's successful resolver result can complete the pending sign-in; no Quick PIN, selected role or locally compared code substitutes for Firebase verification. Existing Google-only restrictions on production Admin/Principal password login remain.

This is **challenge support, not enforced privileged MFA**. Provider configuration, account enrollment, backend/rules enforcement and recovery must be validated together before a production policy can be enabled. Existing users without an enrolled factor are not silently enrolled or locked out by these frontend changes. SMS-only factors are reported as unsupported instead of bypassed.

Official requirements: [Firebase TOTP MFA](https://firebase.google.com/docs/auth/web/totp-mfa) requires Firebase Authentication with Identity Platform. Do not upgrade the project or promise a zero-cost MFA deployment without checking its configuration and billing terms. The current Firebase SDK supports TOTP, but the Auth Emulator does not establish hosted TOTP provider/enrollment acceptance.

Before enabling privileged enforcement:

1. Inventory actual owner and Principal identities, existing enrollment, verified deliverable recovery email and project provider configuration using authorised operator access. Account enrollment is not the same as a second-factor-authenticated session.
2. Prepare a second independently recoverable privileged operator; do not promote an Instructor as a shortcut. Any new privileged grant requires explicit approval.
3. Enroll and test the intended users on staging, including a new-browser challenge, expired code, lost-device recovery and token refresh. Never paste a setup secret, QR, OTP or recovery token in chat or the repository.
4. Enforce policy in Firestore rules and every privileged backend path using Firebase's verified second-factor claim. Client UI checks alone are insufficient, including when an owner selects an Instructor view. Review any legacy-cloud access separately.
5. Approve the exact target and rollback/recovery procedure before rollout. Removing a factor or disabling MFA is a sensitive operator action, not a client-side workaround.

Run `node scripts/inspect-security-readiness.js` from the existing authorised Cloud Shell for a read-only staging preflight. It inspects provider configuration and the root owner/active Principal identities, but prints only role and readiness booleans. It never prints emails, UIDs, phone numbers, setup secrets, enrollment IDs or tokens. Auth configuration permission failures are explicitly distinguished from Firestore rules. A successful preflight does not certify enforcement or recovery.

### Password and account recovery

Existing recovery accepts only a full potentially deliverable email for explicitly enabled production password login. Institute-only aliases and synthetic `.test` accounts require the authorised operator procedure. Google-only identities recover through their identity provider. A reset-email request does not prove delivery or successful password reset.

Account-existence failures retain a generic response. Disabled/misconfigured providers, network failures and throttling now report temporary unavailability instead of claiming an accepted request. No automatic real-account reset, password storage or privilege change is introduced.

## Encrypted Firestore database archive

`scripts/firestore-recovery.js` captures **all Firestore root collections and recursively nested documents**, including trainee records, attendance, marks, exams, answer keys, private learning plans, access-control records, legacy data and subcollections whose parent document is absent. It preserves Firestore timestamps, references within the source project, bytes, geographic coordinates and supported numeric values.

The only supported live export source is `universal-iti-dk-staging`. Production export and any live restore are intentionally unavailable in this tool. Firestore reads use the existing operator's gcloud access; Firebase CLI login alone is not sufficient.

The local archive uses AES-256-GCM with a fresh random nonce and a separate random 256-bit key. Both files require private parent directories outside the checkout and private file permissions. Creation is exclusive: no overwrite or symlink following. Export reopens/decrypts the written archive before returning success. Only safe summaries are printed.

This is **not a complete Firebase disaster-recovery backup**. It excludes Authentication identities/password hashes/MFA secrets, Cloud Storage/Drive file contents, IAM, deployed rules, indexes and external configuration. Those need separately authorised procedures and recovery tests. Do not export password hashes or expand IAM to obtain them as a routine workaround. Managed Firestore exports require billing; this tool does not enable that service. Its SDK reads still consume the project's Firestore read quota and can incur charges on a billed project.

The traversal is not a point-in-time snapshot. Pause application writes during an operator-approved backup window if cross-document consistency is needed. The archive labels `consistentSnapshot: false`; it must never be represented as a transactional snapshot. It stops at 100,000 documents or 100 MiB of plaintext and refuses unsupported values/references rather than silently dropping data.

### Operator export and local verification

Run on the existing authorised Cloud Shell. These commands create private files and read staging Firestore; they do not modify cloud records. Never upload the key or archive to this public repository or paste their contents in chat. Retain a secure independent copy of the key; losing it makes the archive unrecoverable. Store the archive and key separately in your approved secure storage.

```bash
mkdir -m 700 ~/eduskill-recovery-private
node scripts/firestore-recovery.js init-key \
  --key-file ~/eduskill-recovery-private/firestore.key
node scripts/firestore-recovery.js export \
  --confirm-project universal-iti-dk-staging \
  --key-file ~/eduskill-recovery-private/firestore.key \
  --output ~/eduskill-recovery-private/staging-firestore.enc
node scripts/firestore-recovery.js verify \
  --key-file ~/eduskill-recovery-private/firestore.key \
  --input ~/eduskill-recovery-private/staging-firestore.enc
```

Use unique archive filenames for later exports; existing files are not replaced. If a command fails, review only its safe summary. An incomplete private file may need operator review; do not repeatedly overwrite or delete recovery material.

### Restore rehearsal

Restore is permitted only into the fresh local Firestore Emulator project `demo-eduskill-recovery` at `127.0.0.1:<port>`. The archive must authenticate successfully and explicitly confirm the staging source. Existing destination data is rejected before writes; individual create operations also reject concurrent replacement. Every restored document is read back. A failure can leave a partial emulator restore; start a fresh emulator before retrying. No live restore or account/permission grant is offered.

Automated rehearsal uses synthetic data only through `npm run test:rules`. Do not load real trainee archives into automated CI, a shared emulator, a public artifact or an unapproved local machine. A real-record restore drill requires a private authorised environment and separate acceptance.

## Remaining acceptance

- Hosted MFA provider/enrollment, privileged claim enforcement and lost-device/account recovery are pending.
- An operator-run encrypted staging export and private restore drill are pending; synthetic emulator success does not prove that a real backup has been created.
- Complete Firebase recovery additionally requires Auth, files and external configuration recovery.
- Intended-device printing/download, Drive OAuth/upload, hosted approval workflows and offline conflict recovery require their own acceptance. Do not infer them from successful role routing or emulator tests.
