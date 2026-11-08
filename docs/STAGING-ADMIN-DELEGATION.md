# Staging Admin and Principal view for an existing Google account

The user explicitly requested Admin and Principal access for one named existing Google account. `scripts/grant-staging-admin.js` requires the explicitly approved email as a private CLI argument and is limited to the staging project. Production grants, new Auth accounts, password/email changes and root-owner transfer are not supported.

## Resulting authority

- The same existing Firebase UID and active membership are used. The saved Instructor role, display name and workspace assignments remain.
- A server-managed `institutes/{institute}/systemAdmins/{uid}` grant and an owner-style membership allow the existing Admin/Principal/Instructor view selector. Firebase rules and backend independently require the matching verified Google identity and active grant/member. A password-provider token cannot acquire the delegated administrative authority.
- The existing root owner, official Principal identifier and all five demo identities remain. Opening Principal view is application access; it does not change an employment designation or replace the institute's recorded Principal.
- Client roles, a member `owner` flag alone, a Quick PIN or a public email allowlist cannot grant this authority. Even the existing root Admin cannot create/edit these delegation documents through the client. Provisioning/revocation requires an authorised operator.
- This grant does not enroll or enforce MFA. Recovery and TOTP enrollment remain separate acceptance gates.

## Reviewed prototype rules

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for server-managed admin delegation without client-side self-promotion. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

The new grant schema requires UID/email, active Google-only authority, schema version and bounded actor/time fields. Own-UID reads are allowed; client list/create/update/delete are denied. The existing root owner's immutability and current student/workspace isolation are preserved. Existing queries/validators are retained rather than rebuilt; this is not a claim of complete production schema certification.

Attack checks cover public and foreign-UID reads, client grant creation/update/deletion, forged member-owner status, wrong UID/email, password-provider tokens, unverified email, disabled member/grant, root-owner replacement and revocation during a backend leave-review transaction. Existing positive root/demo flows and actual delegated Google Admin/Principal views require emulator/browser acceptance before release.

Local validation passed all emulator suites, including these delegation attacks and the existing attendance/exam/leave/student-isolation suites. The full browser suite passed 64 desktop/mobile cases, including real Google-provider Auth Emulator sessions opening both Admin and Principal views with one retained Instructor UID and unchanged root. The dependency audit reported zero advisories. The first local native attempt found the retained V15 rules snapshot was stale; the snapshot was synchronised to the same reviewed rules without relaxing the invariant. A missing local Java 21/Chromium environment was restored before the emulator/browser runs. Local Docker remains unavailable; container smoke requires CI.

## Operator sequence

1. Use the tested development commit in the existing authorised Cloud Shell and run `node scripts/grant-staging-admin.js --email APPROVED_EMAIL`. This preview is read-only. It requires the exact existing, enabled, verified Google account and active Instructor/Principal membership. It never creates a new login or prints a UID/token/password.
2. Review the preview fingerprint and the staging-only scope. Confirm the exact staging deployment target. Deploy the tested rules and Hosting through `firebase.staging.json`, and the matching backend to the existing `universal-iti-staging-api` Render service. Deployment must not include production, Auth configuration, indexes, a paid plan or an MFA factor reset.
3. Apply only after preview and deployment. The apply tool requires all of `--apply`, `--email APPROVED_EMAIL`, `--confirm-project universal-iti-dk-staging`, `--confirm-email` matching the user-authorised email, and `--expected-fingerprint` matching the fresh preview. It checks the active Firestore ruleset, backend security marker and frontend hashes before writing. Auth must still resolve to the same verified Google UID; the transaction rejects changed membership/grant/root-owner state.
4. The atomic transaction writes the grant, the membership owner-style flag and an audit event. Existing records, saved role, workspace assignments and root owner are retained. Already-correct configuration is idempotent. A failed operation with an uncertain network outcome must be inspected by a fresh preview before retrying.
5. Sign in with the actual Google account in the intended browser and independently test Admin and Principal views, session restoration and the original Instructor workflow. Do not paste credentials or OTPs in chat. An operator configuration readback is not a hosted login test.

## Remaining boundary

There is no authorised Firebase CLI session in the Work executor. The operator must run staging preview/deploy/apply in the existing authenticated Cloud Shell. Render deployment uses the exact existing staging service and workspace, after target confirmation. No live grant is certified until an apply/readback result and independent hosted acceptance exist. A real-account grant expands sensitive access and must never be inferred from a client role selection.
