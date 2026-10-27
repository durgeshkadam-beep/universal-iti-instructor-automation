# Universal EduSkill 360 — Google + Institute ID/Password + Quick PIN
Date: 27 October 2026. Development branch only, PR #16. Not a production credential rollout.

## What is actually implemented
1. Existing Google Sign-In remains the default and is not replaced.
2. Existing **staging** Firebase Email/Password accounts can now be entered as an Institute ID shorthand: `student`, `instructor`, `staff`, `principal`, `admin`. The client maps `student` to `student@iti-staging.example.test` **only** on isolated staging and relies entirely on Firebase Auth password verification and existing UID/member/role checks. No synthetic password appears in code.
3. An independent **production-capable but OFF-by-default** module (`v15/v15-institute-auth.js`) provides an Institute ID or approved email + password form after `institutePasswordEnabled: true` is explicitly configured. The ID alias resolves to `id@instituteLoginDomain`, where the institute must own the domain and pre-provision the corresponding Firebase Auth account. Raw ID or role selection does not grant access.
4. For an already approved Google/Firebase account, the optional `Add Password Login` action calls Firebase `linkWithCredential` for the SAME email and UID. It must not create a new unrelated account. A user whose password credential is already linked cannot register it again here. If linking fails, contact the institute—do not merge account databases by hand.
5. Optional `quickPinEnabled: true` enables a device-local 6-digit Quick PIN **screen overlay**, stored as PBKDF2-SHA256 salted verifier, scoped to Firebase project+UID. It cannot sign in, get a token, restore a logged-out session or authorize Firestore access. After five wrong attempts the application signs out. Shared PCs should Sign Out, not use PIN.
6. Passwords are only passed to Firebase Auth; no PIN or password is written to Firestore or the repository. Passwords are not copied to localStorage.
7. All core ITI workflows and the five-role permissions are unchanged. UID identity remains the anchor for Skill Passport, attendance, marks and learning plans.

## Important limitation: Institute ID is an alias, not a stand-alone authentication service
An arbitrary Roll Number is NOT automatically an authenticated account. To support it securely, the institute must first provision the user's Firebase Auth identity and corresponding member and role mapping. A production ID like `dtp2026-001` would require a controlled matching email alias such as `dtp2026-001@<institute-owned-domain>`. Staging aliases use the non-deliverable `.test` suffix and are only for synthetic users. **Password recovery for non-deliverable aliases requires a separately designed authenticated administrator reset workflow**; standard email reset must only target an inbox the account holder controls. No such reset UI is shipped now.

For existing Google users, the safe first version is **Google OR the same real email + a linked password**. Adding an unrelated ID alias to that Google account requires an identity-linking / provisioning design tested against the same UID. Never create a second Firebase account for one trainee.

## Enabling without compromising production
1. Keep `institutePasswordEnabled` absent/false in production until institute governance, an owned authentication domain and provisioning/recovery procedures are approved.
2. Provision users through trusted Firebase Admin tooling / backend only, never via an unauthenticated browser form.
3. Verify Google/email provider linking by comparing the exact Firebase UID before and after in a disposable staging project; deny account merges if IDs differ.
4. Enable Firebase Email/Password provider and Google provider only within the correct project. Use email enumeration protection; rate-limited abuse protection and password policies.
5. Explicit public production runtime may set:
```json
{
  "institutePasswordEnabled": true,
  "instituteLoginDomain": "login.your-institute-owned-domain.example",
  "quickPinEnabled": true
}
```
Replace the example with an **actual domain owned and controlled by the institute**. The main project/production is **not** configured with this flag.
6. Never use a 4- or 6-digit PIN as online authentication or offline access control. The PIN is only a convenience screen lock when Firebase session authorization already exists. Clearing browser storage removes the PIN verifier. It does not encrypt cached app data.
7. Require MFA or strong reauthentication for Admin / Principal as policy before production; no MFA workflow is claimed to be implemented by this PR.

## Staging manual acceptance
- Apply public runtime (staging `instituteLoginDomain=iti-staging.example.test`, `quickPinEnabled=true`) and matching frontend only on isolated staging, never production.
- Select Student, enter `student` plus the privately held synthetic password. Check it signs in as the *existing* student UID; verify My Skills/Attendance/Marks persist.
- Log out and test Instructor `instructor` with its own password; ensure a Student ID cannot select Principal/Admin.
- Test wrong password and wrong role, and verify that no live session persists.
- Sign in with the approved Google account, ensure linked provider uses the same UID if enabling a password.
- Opt in to Quick PIN, choose a nontrivial six-digit PIN and click Quick Lock. Verify unlock works only while the same account is signed in, wrong attempts trigger signout, refresh does not expose a standalone PIN login and shared PCs remain signed out.
- Test Chrome Android, popup Google auth, mobile keyboard/input labels, logout and re-login.
- Confirm no real student data, personal PINs or passwords were committed.

## Acceptance status
Automated checks are in `tests/phase1-institute-auth-test.js`, `tests/phase1-staging-institute-id-test.js`, `tests/phase1-quick-pin-test.js`. Run these and the full GitHub CI including `npm test`, Firebase Emulator permissions, native E2E and audit before any deployment.

No production flag, Auth provider, admin account, student password or identity mapping has been changed. Staging will require a deliberate authenticated redeploy to see this new UI.
