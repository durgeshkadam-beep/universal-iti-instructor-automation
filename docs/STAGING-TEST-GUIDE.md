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

Cloud provisioning, Auth provider setup, rules/index deployment, public asset delivery and isolated fixture creation succeeded. Local validation passed 17 regression scripts, 34 unit/HTTP/build/transport tests and 18 desktop/mobile scenarios (including wrong-password and wrong-role recovery).

The first live browser checks authenticated the synthetic accounts but failed to read Firestore through the automated test environment's proxy (reported offline). A real-host unauthenticated diagnostic established that default transport reports offline while forced long polling correctly reaches Firestore and returns permission denied. An isolated-staging-only transport setting has been added in source. Its deployment and authenticated live role checks are pending renewed operator sign-in. Do not treat live role workflows as passed until deployment and the live test rerun succeed.

A workspace restart removed temporary operator authentication and the temporary private password output. Renewed operator sign-in and rotation of the five synthetic passwords are required before handing out working test credentials. The staging page is published, but testing access is not yet ready. No production readiness claim is made.
