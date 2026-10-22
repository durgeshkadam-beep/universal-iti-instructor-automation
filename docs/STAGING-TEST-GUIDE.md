# Isolated staging test site

URL: https://universal-iti-dk-staging.web.app/v15/

Created with owner authorization on 22 October 2026. Project: `universal-iti-dk-staging`. Its Standard Firestore database is in `asia-south1` (Mumbai), reports `freeTier: true`, and billing is disabled. The original project `universal-iti-auto-dk` and main were not modified.

The site has a visible STAGING banner. Select a role, enter that role's synthetic email and privately supplied password, then press **Sign in with test account**. These are Firebase Auth credentials; the selected role does not grant permission. Existing Firestore memberships/rules still control access.

| Role | Synthetic email |
|---|---|
| System Admin | admin@iti-staging.example.test |
| Principal | principal@iti-staging.example.test |
| Instructor | instructor@iti-staging.example.test |
| Staff | staff@iti-staging.example.test |
| Student | student@iti-staging.example.test |

Passwords are generated randomly and never included in source, web assets, documentation or public PR text. Google sign-in is enabled, but real Google accounts require explicit staging membership; entering a real Gmail alone will not activate a role. Sign out before changing test accounts.

Synthetic fixtures include one DTP workspace, one trainee, two practicals, a welcome notice and an instructor-verified practical. No jobs, market statistics or real personal records are seeded. Test My Skills, Skill Gap, private learning plans, guided assistance, navigation and role-specific record workflows. Changes made here affect staging data only; never enter real student information on this test site.

## Backend limitations

`apiUrl` is intentionally empty in `config/staging.public.json`. Static Hosting, Firebase Auth and Firestore can be tested. Secure online MCQ publishing/grading and optional generative AI require an authenticated HTTPS Node backend and are unavailable on this hosted preview. No answer keys are exposed and no client grading fallback is enabled. Marathi/Hindi/English structured guidance, resume outlines and interview practice remain available without an AI key. No paid hosting or provider account was enabled.

## Reproduce deployment

Use a Firebase CLI account authorized for this staging project:

```sh
npx -y firebase-tools@latest deploy --only auth,firestore --project universal-iti-dk-staging --config firebase.staging.json --non-interactive
npx -y firebase-tools@latest deploy --only hosting --project universal-iti-dk-staging --config firebase.staging.json --non-interactive
```

The staging-specific config keeps provider/domain/location settings out of the general release configuration. Its Hosting predeploy command builds only public assets from the explicit public staging configuration. The release guard allows no-backend mode only with `staging: true` and an explicit project ID ending in `-staging`; ordinary releases continue to require an HTTPS API URL. A public staging flag changes UI only and grants no permissions.

Operator fixture creation uses `scripts/seed-staging-demo.js` with `GCLOUD_PROJECT=universal-iti-dk-staging`, `ALLOW_STAGING_BOOTSTRAP=true` and `ITI_STAGING_CREDENTIALS_FILE` pointing outside the repository. It reads the operator's existing Firebase CLI login in memory and refuses an existing institute. If private test passwords need recovery, `--rotate-test-passwords` only resets the five known synthetic Auth identities after checking the existing synthetic owner; it does not rewrite Firestore records. Keep both CLI configuration and generated credentials in a private operator directory outside the checkout. Never commit them or publish that directory.

## Verification status

Staging is deployed and available for manual testing. Local validation passed 17 regression scripts, 36 unit/HTTP/build/transport tests and **20 desktop/mobile browser scenarios**. The last two scenarios create a module through the actual form, confirm its Firestore write, sign in again and verify that the module survives reload. The async navigation regression also verifies that a slow page or shell refresh cannot replace a newer selected route.

Actual hosted browser checks passed for all five synthetic roles against the deployed app and real staging Auth/Firestore: Admin (1 route), Principal (6), Instructor (22), Staff (4), Student (15). Instructor skill verification was saved through the UI and its evidence was read by the linked Student. The Student saved a private learning plan, ran Marathi/Hindi/English guided practice, and was denied access to protected exam keys and another student's plan. Mobile containment passed and no request to the production project was observed. This is runtime testing, not a static-source-only check.

The owner’s verified Google account has been approved as a staging Instructor assigned to the synthetic DTP workspace. For that account, choose **Instructor**, enter its Gmail and press **Use a separately approved Google account**. The password form is for synthetic accounts. Refresh the site to load the new deployment. The final interactive Google popup on the user's own device remains a manual acceptance step.

The first live browser attempt exposed a slow-connection startup failure. Membership/institute bootstrap reads now use `getDocFromServer`, with at most five attempts and bounded backoff (1, 2, 4, 8 seconds). Permission denial and a known offline browser fail without retry; cached membership cannot authorize a new login. These server-only reads resolved the live connection failure. A subsequent Instructor run exposed an async route-restoration race: selection is now saved before rendering and the duplicate delayed login navigation was removed. The full hosted five-role retest then passed.

The operator renewed authentication and restored the five private synthetic passwords. No owner transfer, production membership change or real-student update occurred. Backend code and package metadata return HTTP 404. Billing remains disabled. GitHub CI run 206 (39797131007) passed for the deployed startup/navigation baseline, including tests, container smoke, permission tests, browser tests and the production audit. Later backend deployment-guard validation is recorded separately in the work report.

The next backend deployment has a [Render staging recipe](RENDER-STAGING.md) and `render.yaml` pinned to the development branch, Free plan, manual deploys and no AI provider. It still needs a connected hosting account and private staging service identity. The startup guard refuses wrong-project credentials/origins and emulator overrides. No Render service has been provisioned by this source change.

This is staging acceptance coverage, not a production-readiness certification. Hosted online exams and optional generative AI still require a trusted HTTPS backend. Real Google popup/device acceptance, external document imports/printing/Drive, migration/backup and all institute-specific legacy forms retain the release limitations described in the production-readiness guide.
