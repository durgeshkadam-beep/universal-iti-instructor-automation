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

Cloud provisioning, Auth provider setup, rules/index deployment, public asset delivery and isolated fixture creation succeeded. Local validation passed 17 regression scripts, 36 unit/HTTP/build/transport tests and 18 desktop/mobile scenarios (including wrong-password and wrong-role recovery). GitHub Actions run 202 passed on Node 22/Java 21, including emulator suites, container smoke checks and production dependency audit.

The final staging transport/login refinement is now deployed. The delivered runtime config, core, authority and staging-login asset hashes match the published build manifest. Backend code and package metadata return HTTP 404. The operator renewed authentication, restored the five private synthetic passwords, and approved the owner's verified Google account as a staging Instructor assigned to the synthetic DTP workspace. No owner transfer, production membership change or real-student update occurred.

For the approved Google account, choose **Instructor**, enter its Gmail and press **Use a separately approved Google account**. The password form is for the synthetic accounts in the table above. Refresh the site to load the new deployment. Google sign-in was observed in the user's screenshot and the Google Auth identity was verified before creating its staging membership; the final interactive Google login still needs the user's own browser acceptance test.

Live automated browser attempts authenticated with Firebase Auth but still reported Firestore offline while using this environment's proxy. Diagnostic requests confirmed staging project selection and forced long polling; authenticated reads did not complete, even with a longer timeout. Therefore live hosted role navigation, protected-read checks and plan saves have **not passed**. The unauthenticated transport comparison reached Firestore and correctly returned permission denied in long-polling mode. The remaining live connection failure is unresolved; emulator passes are not presented as hosted E2E passes.

The site is available for manual staging acceptance using the approved Google Instructor account and private synthetic test accounts. It is not a production-readiness certification. Hosted online exams and optional generative AI remain unavailable without the trusted HTTPS backend described above.

### Startup connection recovery

Live diagnostics exposed a slow-connection startup failure: Firebase Auth succeeded, but the initial Firestore read reported unavailable before the server response arrived. Bootstrap membership/institute reads now use `getDocFromServer` with at most five attempts and bounded backoff (1, 2, 4, 8 seconds); permission denial and a known offline browser fail without retry. Cached membership cannot authorize a new login. Unit tests cover recovery, no cache fallback, permission-denial fail-fast and exhausted retries; all 18 emulator/browser scenarios passed afterward. The revised startup reads are deployed to staging. A live Student probe passed 15 routes, protected-key/other-plan denial, private plan cloud save and guided Marathi/Hindi/English practice; the full unmodified hosted five-role retest is running.
