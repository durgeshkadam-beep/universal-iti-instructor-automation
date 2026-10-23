# Implementation and validation report — 22 October 2026

Repository: `durgeshkadam-beep/universal-iti-instructor-automation`
Development branch: `phase1/security-student-career-20261021`
Review: Draft PR #16
Baseline: `98a3d93bce4bcd58370234687a239c803c7985c4`

**Release status: isolated frontend staging deployed; hosted backend and remaining acceptance are still required.** This report does not certify that every legacy form, external integration or real-device scenario is production-ready. Main was not merged or modified; no production deployment or real-student record changes occurred. Runtime test records were synthetic in `demo-universal-iti` and the separate `universal-iti-dk-staging` project. Later sections preserve the sequence of findings and fixes.

## Latest deployment preparation

### Everyday workflow simplification

Added three role-appropriate dashboard shortcuts for Instructor, Student, Principal and Staff while preserving their full permitted menus. Keyless Career Coach shows a direct guided-practice flow; the optional consent/AI controls appear only with an API URL. Unavailable secure exams offer a dashboard return instead of backend configuration instructions. No client answer keys/grading or generative-AI claims were introduced.

The first real-browser shortcut run exposed a Principal race: `v15-staff-dialog-fix.js` rendered Staff & Access a second time after canonical routing and then reactivated it after the user left. Removed the duplicate rendering/activation and delayed click handler. Added its actual wrapper to the delayed-render DOM regression and asserted that Reports stays active. After the fix, `npm test` passed all 17 scripts and 42 native tests; the full emulator browser suite passed **22/22 scenarios**, including shortcut clicks for all applicable roles, mobile containment, offline-after-login guided practice in all three languages, existing HTTP MCQ grading and persisted module/plan/verification flows. The initial two Principal failures are resolved, not omitted from the run history. This revision does not change backend permissions, identity setup or production data.

The simplified frontend was deployed only to isolated staging. Live mobile browser checks using real staging Auth/Firestore passed for Instructor, Student, Principal and Staff: three shortcut buttons per dashboard, actual first-shortcut routing, Student guided practice in all three languages, unavailable-exam dashboard return and mobile containment, with zero production-project requests. Deployed controller/student-services/staff-dialog scripts matched the tested source hashes. Visual review prompted a final scoped button-height/line-height adjustment and a text-containment browser assertion; the heading uses the app's English UI text to avoid depending on a locally installed Devanagari display font. Backend hosting and optional generation remain unavailable and were not presented as complete.

### Subsequent CI login timing finding

Remote run **39807506798** passed native tests, build, Docker and permission suites, but its browser run had **21/22 pass**: the final mobile module-persistence scenario read `ready=false` / `Loading institute access…` immediately after a fresh login call. The restored-session handler can already own `loginRunning`, so the explicit call legitimately returns while that initialization is still in progress. Updated the browser login helper to wait up to 30 seconds for observable `ready=true` and the exact expected role, then require the app shell. It does not retry login, inject readiness, skip permission checks or change application authentication. The new run and remote CI status are recorded in PR #16; this finding must not be described as a fully passing old CI run. No deployed browser asset or Firebase data was changed by this test correction.

23 October follow-up: the corrected full emulator browser rerun passed **22/22 (51.9 seconds)**, including the mobile fresh-login/module-persistence scenario. The earlier interrupted rerun log ended after desktop scenarios and was not counted as a full pass. Source changes are confined to the browser test helper and this report; the deployed frontend is unchanged.

Data-source review also confirms that public staging configuration selects `universal-iti-dk-staging`, while the historical app fallback selects `universal-iti-auto-dk`. The original records were not copied to staging. This configuration review does not establish whether a user's actual records are in the original V15 workspace, older per-instructor cloud sections, or browser-local storage. No production/student records were read or changed during this review.

The original GitHub Pages root was checked read-only and returned HTTP 200 with the title **Universal ITI Instructor Automation V14**. This verifies that the old application entry is reachable, not that a particular account's records have loaded or that they have been migrated. Staging remains separate; no production migration, data copy or deployment was performed.

- Deployed frontend baseline CI run **206 / 39797131007 passed**, including the container, emulator suites, browser scenarios and production dependency audit.
- Added `render.yaml`: Free Docker service, Singapore, development branch, manual deployments, isolated Firebase project and `AI_PROVIDER=none`. No Render resources, account, IAM policy or service-account key were created.
- Added an opt-in `ITI_STAGING_ONLY=true` startup guard. The Render configuration rejects foreign projects/credentials, invalid RSA keys, non-staging origins, emulator/alternate Firebase settings and incomplete optional AI configuration before starting the listener. This is a configuration check, not a claim of database/IAM readiness.
- Updated local `npm test`: **17 regression scripts + 42 native tests PASS**. Six new tests include actual child-process startup with an ephemeral synthetic RSA credential, live HTTP health/CORS/unauthenticated checks, and actual startup refusal for a foreign project. Generated synthetic key files are deleted after the test; no keys are checked in.
- Render Blueprint YAML parses successfully. Docker is unavailable in this local workspace, so a new local container rebuild could not run; the branch CI supplies that check. The earlier deployed baseline container smoke passed in CI. Do not report the new revision's CI as passed until it completes.
- Hosted MCQ publishing/grading and optional generation remain unavailable: `apiUrl` is empty and Render is not connected. Follow [the staging deployment and authenticated acceptance procedure](RENDER-STAGING.md). A green `/healthz` alone must never be presented as successful examination/AI acceptance.

## Implemented

| Area | Result |
|---|---|
| Firestore security | Closed the overlapping generic-match bypass for sensitive collections. Added invitation old/new role checks, workspace-scoped student invitations, verified-email/active/non-owner activation checks and immutable submission ownership. Attendance updates cannot change their date or trainee identity to evade locks. |
| Auth/startup | Removed the service-worker-ready startup deadlock; the app continues if cache registration is unavailable. Root entry sends users to the Google/Firebase V15 portal. Preserved the existing popup-first role login and tested saved Auth sessions for all five roles against the emulator. Activation codes now use crypto randomness. Removed legacy default staff PINs/accounts and disabled the old local PIN login path. Public staging Firebase config is configurable. |
| Record privacy | Clears old sections before loading another account or workspace; fixed the lexical DATA workspace cleanup. V15 stops writing whole cloud records to the legacy shared storage key in the app, sync layer and legacy cloud/security wrappers. Existing V14 backups are not erased. |
| Offline sync | Operations are scoped by institute/user/workspace; queue flush reloads the latest queue after each accepted operation so concurrently appended edits survive. Denied/locked operations remain pending. Attendance submission waits for pending attendance sync. |
| Skill Passport | Separate local self-ratings and read-only instructor-verified evidence. Instructors verify activated students through a transaction; students read only their linked profile. |
| Learning plans | Personal role goal and selected practicals compared only with instructor-verified achievements. Added private Firestore copies, scoped drafts, pending retry and serialized saves. No claim of official qualification/job eligibility. |
| Career opportunities | City filter, deduplicated source-bound skill mentions, expiry/calendar validation, distinct tracked-employer counts, small-sample warnings, job/apprenticeship type, instructor review/withdrawal, Maps discovery and official NCS/Apprenticeship India portal links. No vacancies or market statistics were fabricated. |
| Free-first assistance | Marathi, Hindi and English no-key career guidance, resume outlines and mock-interview questions. Optional consent-based AI generation and qualitative answer feedback through authenticated backend adapters for Ollama/Gemini. No browser API-key storage or direct shared-key provider calls, including teaching AI. |
| Secure online MCQs | Trusted publishing with immutable public questions/private keys, server-issued schedule/deadline, own-student submission, transactionally graded immutable/idempotent result and duplicate-submit protection. Direct client key/session access and official-score writes denied for all roles. Online exams remain disabled until the backend is configured. |
| Mobile/calendar | Corrected labels/inputs and font fallback in new forms. Browser tests inspect every role route at desktop/mobile widths. Corrected local-calendar date conversion that shifted holiday labels in India. Updated the old SheetJS CDN reference to the official 0.20.3 release. |
| Operations | Locked dependencies, repeatable test scripts/CI, protected-environment/main-only rules deployment workflow, staging-only empty-institute initializer, and deployment/cost/privacy/rollback prerequisites. |

## Tests

| Command/check | Result |
|---|---|
| `npm test` | PASS: latest run has 17 regression/DOM/functional scripts and 42 native tests. Includes guidance/provider contracts, HTTP/build/transport/bootstrap/navigation coverage and the staging startup boundary described above. |
| `npm run test:rules` | PASS: 3 emulator suites: verified skills/market permissions, six-identity security attack matrix, and actual Firestore-backed exam service. Expected PERMISSION_DENIED logs are successful negative assertions. |
| `npm run test:e2e` | PASS: latest frontend baseline has 20 Chromium scenarios across 1440px desktop and 390px mobile. Actual app scripts, Auth/Firestore emulators and HTTP backend; saved-role login, every navigation route, private plan save, three-language practice, optional no-AI backend response, MCQ result, instructor verification visible to student, offline attendance replay, module save/relogin persistence. |
| Calendar timezone regression | PASS in both `TZ=UTC` and `TZ=Asia/Kolkata`. |
| Mobile visual review | Inspected rendered student market screenshots; fixed inline label/input layout and heading fallback, then reran browser checks. |
| Production dependency audit | PASS: zero reported vulnerabilities after Firebase Admin update and gRPC override. Development-only advisories are documented below. |
| Diff integrity | `git diff --check` passed; active and V15 rules copies remain identical. |

Local runtime: Node 24.19.0 and Temurin Java 21.0.12.1. CI specifies Node 22 and Java 21. Node 22 CI results should be checked on the pushed commit; local results do not imply that remote CI has finished. Provider adapters were tested with controlled responses, not a paid/live model account. Browser tests block external HTTPS requests and use synthetic emulator identities, so Google account-selection popup/redirect, external fonts/import libraries, portals, Maps, Drive and live-provider availability are outside these results.

## Remaining limits and release actions

- Review [production readiness and deployment instructions](PRODUCTION-READINESS.md). Configure an isolated staging Firebase project, Google authorized domains/accounts and an HTTPS Node backend with exact allowed origins. Select the public Firebase config and API URL in `config/runtime.js`; keep credentials in backend workload identity/environment only.
- Keep AI disabled unless the owner approves a provider, model, data policy, quotas and any billing. Ollama needs model hosting/hardware. External free tiers are conditional; no perpetual free quota or paid spending is assumed. Text-only practice is supported; voice/video interviews and formal AI scoring are not implemented.
- Instructors must supply and periodically recheck real source postings. There is no licensed automatic live job feed or city-wide business census. Portal links are not individual job offers. Current reachability and vacancy availability are not automatically verified.
- Attendance and skill drafts survive temporary disconnects on an already-loaded session. Cold offline authentication is unsupported. Local drafts/pending operations are unencrypted; use separate browser profiles on shared devices. General multi-device merge/conflict UI is not implemented.
- Secure exams have one attempt per published exam ID. There is no automatic expiry submission, proctoring, accommodations/retake workflow or migration of legacy questions. Define institute policy and complete staging acceptance before use.
- The full historical app includes document imports, print/Drive workflows, Android WebView behavior and many institute-specific legacy forms. These have not all been exercised against real accounts/devices. Real Google onboarding, backup/migration/restore, external document helpers, accessibility with assistive technology and live AI language quality remain release gates. This work is not a full penetration-test certification.
- CI never deploys. Configure required reviewers for the `production` environment. Approval to proceed has been received; main and production remain unchanged pending connected target configuration and acceptance.

See the PR description for the final commit and remote-check status.

### Development dependency advisory detail

The final full `npm audit` reports **7 development-only findings: 3 high, 4 moderate, 0 critical**. The high findings are `braces` and its dependent `chokidar`/`firebase-tools` chain (nested-pattern stack exhaustion). Moderate findings are `@opentelemetry/core`, `@google-cloud/pubsub`, `gaxios` and `uuid`. Firebase CLI was updated to 15.34.1; the registry still reported braces 3.0.3 as its latest release with the advisory applying through that version. These are not included in `npm ci --omit=dev` backend installs or published front-end assets. Do not supply untrusted patterns/configuration to development CLI tools. They remain a tracked security limitation; this report does not claim an all-dependency clean audit. The gRPC certificate/error-disclosure findings were resolved with an override to 1.14.6 and the emulator/browser suites reran successfully afterward.


## Follow-up: CI registry failure and workspace invitation controls

The previously pending PR run 196 completed with all functional tests passing, but the npm registry audit request failed after falling back to the retired quick-audit endpoint. This was an audit infrastructure error, not a reported application vulnerability.

- Added `npm run audit:production`: bounded registry retries with per-attempt timeouts; actual moderate/high/critical findings fail immediately. Invalid, missing, timed-out or persistently unavailable audit responses also fail. The JSON result is retained in the validation artifact.
- Added six unit tests for clean results, registry recovery, real findings, persistent errors, malformed responses and timeout handling.
- Push/PR workflows now share a concurrency group so the newest validation cancels the redundant run.
- Restricted instructor invitation reads, activation-secret management and invitation deletion to students whose assigned workspaces are entirely within that instructor's assignments. Institute-wide invitation enumeration is reserved for Principal/owner. Student self-activation and owner/Principal administration remain supported.
- Added emulator attacks for foreign-workspace reads, enumeration, deletion, replacement and new-secret creation, plus allowed own-workspace creation/rotation/deletion.

Follow-up local validation: 17 regression scripts and 19 unit tests passed; the three emulator suites passed; production audit reported zero vulnerabilities. All 14 desktop/mobile browser scenarios also passed. The current remote run is tracked in PR #16. No production configuration, data, deployment or main-branch change is included.


## Approved-release preparation

Owner approval was received after the initial implementation. Firebase access and the release project/backend URL are still unavailable. No merge, deployment or real-record changes have occurred.

- Added an allowlisted public web build, SHA-256 asset manifest, release configuration guard and Hosting predeploy check. Hosting now serves `dist/web`, never the repository root. Release configuration must be explicit; missing config intentionally fails.
- Added a production-only, non-root Node 22 backend container and CI container health/authentication smoke check. Docker is unavailable locally; the image check is delegated to CI.
- Hardened the real HTTP boundary with exact origin validation, route/method checks, JSON-only bounded bodies, token requirement, generic unexpected errors and a data-free health endpoint.
- Added 8 actual HTTP request tests and 4 deployment bundle/configuration tests. Browser scenarios now load the generated deployment bundle and verify that backend and repository files return 404.
- The preceding commit `fc5838669fcc73fcb8a3e52b92211671a636012d` passed GitHub Actions run 39746292866 on Node 22/Java 21, including all functional/emulator/browser checks and a zero-vulnerability production audit. New preparation changes require their own CI result.

Release preparation local validation: **17 regression scripts + 31 unit/HTTP/build tests passed; all 3 emulator suites passed; all 16 desktop/mobile E2E scenarios passed against the generated bundle; production audit reported zero vulnerabilities; diff integrity passed.** The missing-runtime release guard failed with the expected explicit configuration message. The protected rules workflow now uses Node 22 and the locked local Firebase CLI. Container validation and all Node 22 checks run in CI; see PR #16 for the resulting run.


## Isolated staging provisioned

On explicit request, created `universal-iti-dk-staging`, its web app, Standard Firestore database in Mumbai, email/password and Google sign-in providers, and deployed tested rules/indexes plus the allowlisted frontend. Billing is disabled. Seeded five synthetic Auth/membership identities and a small DTP dataset. No production project access or main merge occurred. Public test URL, current live-test blockers and backend limitations are in [the staging guide](STAGING-TEST-GUIDE.md). Public Firebase SDK configuration is versioned; passwords/operator tokens are excluded. Added staging-only password UI, wrong-password/wrong-role tests, and a narrowly scoped backend-free staging release exception.

Staging follow-up local checks: 17 regression scripts + 34 unit/HTTP/build/transport tests, and 18 desktop/mobile scenarios passed. The staging account form rejects incorrect passwords and wrong roles, and permits retry with the assigned role. A live unauthenticated transport comparison isolated the environment proxy issue; staging now initializes long polling while ordinary releases retain default transport. Renewed operator authentication is needed to deploy that final transport/login-label refinement and rotate synthetic account passwords after a workspace restart.


### Staging access recovery and published refinement

Operator authentication was renewed. Approved the owner's verified Google identity as an Instructor in the isolated staging workspace, preserving the synthetic Admin owner; restored five private synthetic passwords without modifying Firestore fixture records. Deployed final staging transport/login refinements and verified delivered asset hashes and private-file 404 responses. GitHub CI run 202 passed on Node 22/Java 21. Live browser Auth succeeded, but authenticated Firestore reads still reported offline in the automated proxy environment, so hosted role E2E/plan-save checks are explicitly not passed. See the updated staging guide; manual Google login/device acceptance and backend hosting remain outstanding.


### Slow startup read recovery

Added fresh server-only membership/institute bootstrap reads with bounded transient-connection retry; permission denials and known offline state do not retry. Local validation: 17 regression scripts, 36 unit/HTTP/build/transport tests and all 18 desktop/mobile scenarios passed. Deployed this refinement to staging. A real-host Student probe passed its 15 routes, actual private-plan save, three-language guidance and protected-read denial checks with zero production requests. Full hosted five-role retest follows; the earlier live failures are retained above as prior results, not counted as passes.


### Hosted staging retest complete

The final deployed browser retest passed all five synthetic roles and their 48 routes: Admin1, Principal6, Instructor22, Staff4, Student15. Instructor verification saved through the UI was visible to the linked Student; the Student's private plan saved in cloud, protected-key/other-plan reads were denied, guided mr/hi/en practice worked, mobile containment passed and no production request was observed. Earlier live offline failures were resolved by bounded fresh startup reads. A later Instructor navigation race was fixed by saving the selected route before async rendering and removing redundant delayed login navigation. A deterministic DOM regression passes. A new module-form save/fresh-login regression passes on desktop and mobile: latest local total is 17 script suites, 36 native tests, 20 browser scenarios. Follow-up remote CI status is tracked in PR #16. Hosted MCQs/generative AI remain disabled pending a trusted backend; this staging deployment does not certify production.

### 23 October: Render staging backend connected

The owner explicitly authorized placing a staging-only Firebase service-account
credential in Render's private backend environment. The earlier unused credential
was revoked before replacement. The dedicated identity belongs only to
`universal-iti-dk-staging`, with `roles/datastore.user` and
`roles/firebaseauth.viewer`. No operator OAuth login or production credential was
transferred. No secret value appears in source, public assets or this report.

Created Free Docker web service `universal-iti-staging-api` in Singapore, with
manual deployments from the existing development branch. Deploy
`dep-dbdfvkahv4oc73bocqgg` reached `live` on source
`e09ada0c1f89bf92209dc127dc50cec2b3edd46c`. The initial deployment without the
required credential deliberately failed before listening. The authorized
replacement fixed configuration without bypassing the staging guard. The API is
https://universal-iti-staging-api.onrender.com/api.

Validation:
- Local backend revision: 17 regression scripts and 44 native tests passed,
  including real child-process HTTP startup with file and environment identities.
- Full CI [39908590684](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/39908590684)
  passed all steps: native/regression tests, public build, Docker smoke, all three
  emulator suites, desktop/mobile E2E and production audit.
- Actual hosted HTTP: health 200, missing token 401, foreign origin 403.
- Actual Firebase Auth and API: all five synthetic roles × Marathi/Hindi/English
  passed (15 guided responses). AI_PROVIDER=none; no generated AI is claimed.
- Actual hosted MCQ: Instructor published a synthetic exam; Student/Staff publish
  denied; Staff start denied; public questions contained no answer indices;
  Student's direct answer-key read denied. Server start/resume preserved the
  deadline. Submission with a forged score produced the correct 2/2. Changed
  answers on retry returned the identical original result/timestamp. Temporary
  synthetic API-test exam/key/session/result were removed successfully.
- Staging-only Hosting deployment completed with the Render apiUrl. Delivered
  public runtime bytes matched the local allowlisted build (SHA-256
  `6fad9db767a77cad13ece8b3c2e525bdb6717fa2af6c3a119310974835397582`).
- Re-tested the deployed frontend: all five roles and 48 routes passed, including
  Instructor verification, Student private-plan cloud save, private-read denials
  and three-language practice. Zero production-project requests observed.

Main, production deployments and real-student records remain unchanged. The
frontend still contains only synthetic staging records. Free Render idle sleep
and quotas remain limitations for scheduled exams. Generative AI provider/model,
Google popup/device acceptance, original-data migration and the previously
listed release gates remain outstanding. The current instructor publisher uses
reviewed JSON; a graphical question authoring workflow is not implemented.


Final hosted mobile MCQ browser acceptance **PASS** (390×844): Instructor filled
and submitted the actual publisher form; Student started the exam, selected
answers, received a visible offline-submit failure, retried online, and saw 2/2.
After reload and authenticated session restoration the same official result was
shown with no new answering form. Three-language guided practice and mobile
containment passed; zero production-project requests. The first uninstrumented
attempt was interrupted before completion and is not counted as a pass. The
completed rerun used bounded locator timeouts and observable login readiness;
no app state, authentication or grading was mocked. Its synthetic browser exam
and result are retained in staging for review, labelled as synthetic. No real
student records were used.


### 23 October follow-up: Instructor question form

Replaced the default JSON publisher with a labelled form for title, duration,
local opening/closing times, questions, four answer options and explicit correct
answer selection. IDs are generated automatically. Questions can be added or
removed up to the server's 100-question limit. Native required fields and review
confirmation prevent accidental publication; schedule validation gives a visible
error. Failed requests retain current-page input; successful publication freezes
the form. No private answer drafts are stored in localStorage. Reviewed JSON
remains available as a collapsed advanced publisher for 2–6 options.

The first added E2E scenario exposed an implicit select-label association issue;
explicit label/for IDs corrected it. Final complete rerun: **24/24 desktop/mobile
scenarios PASS (1.1m)**, plus **17 regression scripts and 44 native tests PASS**.
The new scenario validates actual form submission, add/remove, required review
and correct answer, invalid schedule, network failure/retained fields, retry
through the real backend and Student grading. The existing Student exam scenario
now targets its own card so multiple published tests do not cause ambiguity.
Backend role authorization, private keys, deadlines and grading were unchanged.
The previous integration CI39914017155 passed in full; new-source CI and hosted
verification are recorded on [Draft PR16](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/pull/16) as they complete.


#### Follow-up from live mobile acceptance

The hosted form test successfully published and graded, but failed its final
reload check because concurrent exam-list loads appended duplicate cards. Each
exam render now has a generation bound to the captured role, user and workspace;
late responses cannot append stale records. Three deterministic async DOM
regressions cover reverse completion order and changed workspace/user. Native
validation now passes 47 tests plus 17 regression scripts. Browser coverage also
forces concurrent real Firestore queries, asserts a single exam card, grades,
signs in again and checks the same result. The emulator fresh-login helper is
used because the isolated suite blocks external SDK/config downloads; the hosted
browser still performs an ordinary reload with the actual Firebase SDK.

Visual inspection also led to full-width stacked fields, 44px controls and a
separate review-confirmation row on mobile. No answer-key draft is persisted.
The earlier hosted attempt with duplicate cards is not counted as a complete
pass. Final hosted results and final-source CI are tracked on Draft PR16.

Final local rerun after both corrections: **17 regression scripts + 47 native tests + all 24 desktop/mobile scenarios PASS (1.1m)**. No failed or interrupted run is counted as this final pass.


### Final CI follow-up: new-section persistence

CI39920007958 completed with 23/24 browser scenarios passing: the desktop module
fresh-login scenario could not load a saved module. Investigation found a real
registration gap, not a grading failure: a record could be written to a new
collection while its workspace section list stayed unchanged when no other
metadata changed. The governance diff now also queues metadata when its array or
map section sets grow. Permissions and writer roles are unchanged.

A deterministic regression saves a new module while ordinary metadata is
identical and requires the section-discovery metadata operation. The real browser
persistence scenario waits for both the server record and its registered section
before signing in again. This validates completed synchronization instead of
leaving during a pending multi-record save. Final local result after this fix:
**17 regression scripts + 48 native tests + 24/24 desktop/mobile E2E PASS (1.1m)**.
Final-source CI and hosted module save/reload acceptance are tracked on Draft PR16;
the earlier failed CI run is not counted as a pass.


The browser runner now generates a random emulator-only password for each run
and passes it only through the test child-process environment. The spec contains
no fixed password value; repeated emulator fixtures are reset to the current
run's value. No staging login or production credential is used by that runner.
This removes the credential-like test literal flagged during automatic review.
The replacement fixture flow is re-tested through real emulator sign-in.


### Career Coach configuration follow-up

A backend URL alone previously exposed an optional AI button even when the
provider was disabled. Added an authenticated, read-only `capabilities` action
that returns only a boolean for complete provider configuration. It performs no
model request or quota write and reveals no key/model/private URL. Token,
active-membership and workspace checks still apply.

Career Coach renders local guided practice before the asynchronous lookup. AI
controls and consent appear only after a positive configuration response. Disabled
or unavailable configuration gives an honest status while guided practice stays
usable. Late responses from another render/user/workspace cannot enable stale
controls. Configuration status does not certify provider health, quota, cost or
quality; actual generative-model acceptance still requires a configured account
and instructor review.

Eight new unit/DOM scenarios cover disabled/partial/configured providers, no
secret disclosure or model calls, authorization, immediate guided practice,
explicit AI consent, lookup failure and stale workspace responses. Local final
validation: 17 regression scripts + 56 native tests + 24 desktop/mobile E2E PASS
(browser suite 1.0m). The real emulator HTTP scenario now verifies that an
unconfigured backend has no AI consent/button. Permission/backend emulator suites
also exercise configuration lookup and inactive-member denial. Full CI and
hosted deployment results are tracked in Draft PR16.

The complete local permission/backend emulator rerun also passed all three suites after this change; expected denied-write logs are assertions. No external AI provider was configured or called.
