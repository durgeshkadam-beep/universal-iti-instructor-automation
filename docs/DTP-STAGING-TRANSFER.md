# Original DTP records: staging transfer

The operator confirmed the original shared DTP workspace contains saved trainee, practical and theory records. The transfer uses that shared workspace without merging legacy V14 records. Counts and record contents stay in the private operator workflow and are not published in this document. Individual roster accuracy still needs the instructor review.

## Fixed targets and safeguards

- Source: `universal-iti-auto-dk`, default database, read-only.
- Destination: `universal-iti-dk-staging`, default database, existing institute `brdbagiti-mumbai-01`.
- A dedicated destination workspace retains the original DTP workspace ID. An existing workspace or orphan subcollection at that path blocks transfer.
- All existing staging workspaces remain intact. Source owner email must match exactly one existing active staging Instructor member. No account, password, principal/admin role, invitation or student login is created.
- That Instructor's workspace list receives the DTP workspace first, retaining existing assignments. Other membership fields stay unchanged. After transfer, sign out and sign in as Instructor; choose Desktop Publishing Operator if the Trade selector is shown.
- Trainees, saved practical/theory plans, holidays, state and signatures are copied in memory. Credential fields are removed recursively. No private record export is written to disk or GitHub. Logs contain counts and a review fingerprint only.
- Standard native database metadata is checked before data access. Unknown collections, incomplete source plans, changed account, incorrect target/fingerprint and excessive transaction size stop the transfer.
- Writes use one transaction with create-only document operations. No source write handle is used. Existing source permissions and production rules remain unchanged.
- Post-commit readback verifies every copied document against its sanitized source content. A failed verification does not mean the transaction was rolled back. An apply-mode error conservatively reports the change status as unknown unless verification establishes that a commit occurred. Do not retry blindly or delete anything.

## Operator procedure

Use the existing authorized Google Cloud Shell account. Never paste tokens, keys or learner records into chat. CLI authorization must include read access to the original project and staging database access; Firebase Hosting authorization alone is insufficient.

First run only the preview:

```bash
node scripts/transfer-dtp-staging.js
```

Review its exact source, target, workspace and counts. Share only this counts/fingerprint summary. Preview does not write. An error is a blocker, not a reason to relax rules or create privileged accounts.

After confirming the exact staging destination and preview, the operator can explicitly apply that reviewed fingerprint:

```bash
node scripts/transfer-dtp-staging.js --apply --confirm-target universal-iti-dk-staging --expected-fingerprint REVIEWED_FINGERPRINT
```

The placeholder must be replaced by the preview's actual fingerprint. A new source/account change invalidates the preview. This is a data operation and does not require a Hosting deployment.

## Acceptance still required

A successful inventory is not a transfer. A successful transfer requires `mode: applied`, `dataChanged: true`, and verified document count, followed by browser checks of trainee count, saved demo/lesson content, institution/session details, calendar and printing. Original saved plans remain drafts unless independently verified as conducted/completed. No student accounts or new role privileges are imported; student onboarding and all-role live acceptance remain separate work.

Real-data transfer and browser acceptance have not yet been executed. Generative AI is not required to open the saved records.

## Validation for this change

Local validation passed: 11 focused native tests, a standalone Firestore Emulator transfer test, and the complete `npm run test:rules` Auth/Firestore/backend suites including the new transfer case. The emulator uses synthetic records only and verifies source preservation, account-change rejection, credential removal, unchanged Instructor role, retained Electrician workspace, complete readback and refusal to overwrite an imported workspace. No live data was copied during these tests. GitHub CI is tracked separately.
