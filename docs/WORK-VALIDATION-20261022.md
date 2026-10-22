# Implementation and validation report — 22 October 2026

Repository: `durgeshkadam-beep/universal-iti-instructor-automation`
Development branch: `phase1/security-student-career-20261021`
Review: Draft PR #16
Baseline: `98a3d93bce4bcd58370234687a239c803c7985c4`

**Release status: owner approval received; staging configuration and acceptance remain required.** This report does not certify that every legacy form, external integration or real-device scenario is production-ready. Main was not merged or modified; nothing was deployed, and no production Firebase records were accessed or changed. All runtime test records were synthetic in `demo-universal-iti`.

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
| `npm test` | PASS: 17 regression/DOM/functional scripts and 13 service unit tests. Includes guided languages, provider contracts/consent/failure redaction and offline queue race/denial/isolation tests. |
| `npm run test:rules` | PASS: 3 emulator suites: verified skills/market permissions, six-identity security attack matrix, and actual Firestore-backed exam service. Expected PERMISSION_DENIED logs are successful negative assertions. |
| `npm run test:e2e` | PASS: 14 Chromium scenarios across 1440px desktop and 390px mobile. Actual app scripts, Auth/Firestore emulators and HTTP backend; saved-role login, every navigation route, private plan save, three-language practice, optional no-AI backend response, MCQ result, instructor verification visible to student, offline attendance replay. |
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
