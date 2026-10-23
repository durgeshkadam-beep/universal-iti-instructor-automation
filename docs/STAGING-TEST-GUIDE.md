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

`config/staging.public.json` now selects the deployed Render HTTPS API. Hosted MCQ publishing/grading passed authenticated API acceptance with synthetic data. Answer keys remain private and there is no client grading fallback. Marathi/Hindi/English structured guidance, resume outlines and interview practice remain available without an AI key. Generative AI is disabled until a provider/model is configured. No paid instance or AI subscription was enabled.

## Reproduce deployment

Use a Firebase CLI account authorized for this staging project:

```sh
npx -y firebase-tools@latest deploy --only auth,firestore --project universal-iti-dk-staging --config firebase.staging.json --non-interactive
npx -y firebase-tools@latest deploy --only hosting --project universal-iti-dk-staging --config firebase.staging.json --non-interactive
```

The staging-specific config keeps provider/domain/location settings out of the general release configuration. Its Hosting predeploy command builds only public assets from the explicit public staging configuration. The release guard allows no-backend mode only with `staging: true` and an explicit project ID ending in `-staging`; ordinary releases continue to require an HTTPS API URL. A public staging flag changes UI only and grants no permissions.

Operator fixture creation uses `scripts/seed-staging-demo.js` with `GCLOUD_PROJECT=universal-iti-dk-staging`, `ALLOW_STAGING_BOOTSTRAP=true` and `ITI_STAGING_CREDENTIALS_FILE` pointing outside the repository. It reads the operator's existing Firebase CLI login in memory and refuses an existing institute. If private test passwords need recovery, `--rotate-test-passwords` only resets the five known synthetic Auth identities after checking the existing synthetic owner; it does not rewrite Firestore records. Keep both CLI configuration and generated credentials in a private operator directory outside the checkout. Never commit them or publish that directory.

## Verification status

### Faster everyday workflow

Open **Dashboard → Start here**. Instructor shortcuts open Attendance, Verify Student Skills and Plan Training. Student shortcuts open My Attendance, My Skills and Career & Resume Practice. Principal and Staff dashboards similarly expose three main tasks; the full role menu remains available. The Admin portal keeps its existing technical administration screen. Shortcut cards keep enough height for their titles and descriptions on mobile.

The current staging frontend connects to the Free Render HTTPS backend. Career Coach offers keyless Marathi/Hindi/English structured practice immediately. It checks authenticated backend configuration without sending the typed goal or answer. With AI_PROVIDER=none it hides the optional AI request/consent controls and explains that generated drafts are not enabled. If status lookup fails, guided practice remains usable. Online tests now use server-side publishing, attempts and grading. An installation without apiUrl retains the unavailable message and dashboard return; it never grades in the browser.

Earlier simplification validation: **17 regression scripts, 42 native tests and 22 desktop/mobile browser scenarios passed**. The browser checks click all three shortcuts for each applicable role and verify their destinations, exercise keyless Marathi/Hindi/English practice with the browser offline after login, and return from unavailable exams. A discovered late Staff & Access activation was fixed by removing its duplicate renderer/navigation handler; both the delayed-render DOM regression and actual Principal shortcut navigation pass.

Staging is deployed and available for manual testing. The previously deployed baseline passed 17 regression scripts, 36 unit/HTTP/build/transport tests and **20 desktop/mobile browser scenarios**; the newer totals are above. Module scenarios create a module through the actual form, confirm its Firestore write, sign in again and verify that the module survives reload. The async navigation regression also verifies that a slow page or shell refresh cannot replace a newer selected route.

Actual hosted browser checks passed for all five synthetic roles against the deployed app and real staging Auth/Firestore: Admin (1 route), Principal (6), Instructor (22), Staff (4), Student (15). Instructor skill verification was saved through the UI and its evidence was read by the linked Student. The Student saved a private learning plan, ran Marathi/Hindi/English guided practice, and was denied access to protected exam keys and another student's plan. Mobile containment passed and no request to the production project was observed. This is runtime testing, not a static-source-only check.

The owner’s verified Google account has been approved as a staging Instructor assigned to the synthetic DTP workspace. For that account, choose **Instructor**, enter its Gmail and press **Use a separately approved Google account**. The password form is for synthetic accounts. Refresh the site to load the new deployment. The final interactive Google popup on the user's own device remains a manual acceptance step.

The first live browser attempt exposed a slow-connection startup failure. Membership/institute bootstrap reads now use `getDocFromServer`, with at most five attempts and bounded backoff (1, 2, 4, 8 seconds). Permission denial and a known offline browser fail without retry; cached membership cannot authorize a new login. These server-only reads resolved the live connection failure. A subsequent Instructor run exposed an async route-restoration race: selection is now saved before rendering and the duplicate delayed login navigation was removed. The full hosted five-role retest then passed.

The operator renewed authentication and restored the five private synthetic passwords. No owner transfer, production membership change or real-student update occurred. Backend code and package metadata return HTTP 404. Billing remains disabled. GitHub CI run 206 (39797131007) passed for the deployed startup/navigation baseline, including tests, container smoke, permission tests, browser tests and the production audit. Later backend deployment-guard validation is recorded separately in the work report.

The [Render staging backend](RENDER-STAGING.md) is connected and deployed on the Free plan with automatic deploys off and no AI provider. The owner authorized its private staging identity. The startup guard refuses wrong-project credentials/origins and emulator overrides. The frontend now targets https://universal-iti-staging-api.onrender.com/api. Free instances can sleep and take time to wake; this is a synthetic demonstration, not dependable scheduled production-exam hosting.

This is staging acceptance coverage, not a production-readiness certification. Hosted MCQs now use the deployed trusted HTTPS backend. Optional generative AI still needs a configured provider/model and backend secret; none is enabled. Real Google popup/device acceptance, external document imports/printing/Drive, migration/backup and all institute-specific legacy forms retain the release limitations described in the production-readiness guide.


## Test the hosted MCQ flow

1. Refresh https://universal-iti-dk-staging.web.app/v15/ so the public runtime points
   at the Render API. Use only synthetic fixtures here; original student data has
   not been migrated.
2. Sign in as Instructor and open Class Test / Secure MCQ Examinations. Enter
   the title, duration, opening/closing date and time, question text and four
   options. Select the correct answer explicitly. Use Add question / Remove
   question as needed, review the test, tick the review confirmation and publish.
   Times use the device's local time zone; the test ID is generated automatically.
   Advanced reviewed JSON remains available for question sets with 2–6 options.
3. In a separate browser profile, sign in with the synthetic Student account and
   open Secure Class Tests. Start the published exam and submit before its deadline.
4. Reload and reopen the attempt: the saved result must remain the same. A failed
   network request must display an error; retry online rather than relying on a
   browser-calculated score. Free-service wake-up may need a retry.
5. Continue skills/career practice without an AI key. Generated AI responses are
   not enabled on this staging service.


23 October hosted MCQ/mobile acceptance passed through the real publisher and
Student forms, including offline failure/online retry, 2/2 grading and unchanged
result after reload. All five roles/48 routes were re-tested after the API was
connected, with no production-project requests. Full CI39908590684 also passed
all test/build/emulator/browser/container/audit steps for the backend source.


## Simplified question authoring — 23 October

The default Instructor publisher is now a labelled form; technical JSON and epoch
values are no longer required. Empty questions/options, unselected correct
answers and missing review confirmation prevent submission. A closing time must
be later than opening and still in the future. The form supports up to 100
four-option questions. Successful publication freezes the form because published
tests are immutable. On failure, current-page form contents remain available for
retry; there is no persistent answer-key draft on shared-device storage. If the
server published but its response was lost, check the test list before creating
a replacement. Reviewed JSON remains a collapsed advanced option.

Local verification: 17 regression scripts + 44 native tests + 24 desktop/mobile
E2E scenarios passed. The new scenario exercises add/remove questions, mandatory
answers/review, invalid schedule, actual network failure/retained input, retry
through the real HTTP backend and Student grading with Auth/Firestore emulators.


Later live testing exposed duplicate exam cards after overlapping reload queries.
The current renderer discards stale responses and binds each load to its user and
workspace. 47 native tests now include reverse-order/identity-change regressions;
the 24 browser scenarios also force concurrent queries and verify the saved result
after a fresh login. Mobile fields are stacked and full-width with 44px controls.


The module persistence follow-up now saves new section-discovery metadata even
when no other workspace metadata changes. A module must finish synchronizing
both its record and section registration before a fresh-login acceptance check.
Current local coverage is 48 native tests, 17 regression scripts and 24 desktop/
mobile scenarios; final CI/hosted follow-up is linked from PR16.


AI status follow-up: the capability response contains only `aiConfigured`, requires
active workspace authorization, and does not probe/call the model provider. Keys,
model names and private URLs stay on the backend. Provider configuration is not a
health/quality/quota guarantee. Marathi/Hindi/English guided practice is available
while the lookup runs and after a lookup failure. Generative AI remains disabled
on this staging service; no external provider key or paid account was configured.
