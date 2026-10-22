# Staging readiness and release procedure

Status: implemented changes under review on `phase1/security-student-career-20261021`, Draft PR #16. **Not approved for production.** No main-branch merge, deployment or production record changes are part of this work.

## Architecture

The root entry redirects to `/final/`, which redirects to `/v15/`; the fetched legacy HTML serves only as its shell. Its canonical controller supplies five role portals. Google/Firebase Auth verifies identity; Firestore rules authorize each read/write. The institute's `ownerUid` controls System Admin capability. A client-selected role never grants backend privileges. Principal and owner have institute-wide access; instructors, staff and students require assigned workspaces. Staff cannot write official records; students can access only their own protected records and the published syllabus/notices.

Use `config/runtime.js` for **public** deployment settings (`apiUrl`). The standalone `server/index.js` runs on loopback behind an HTTPS reverse proxy. Its Firebase Admin SDK uses workload identity or Application Default Credentials from the hosting environment. The browser sends a Firebase ID token; the API verifies revocation and re-reads active membership and workspace assignment on every call. Never host the repository root with an unrestricted static server: server code, environment files, tests, package metadata and credentials must not be published. `firebase.json` excludes backend and test files from Hosting; equivalent exclusions are required on other hosts.

## Reproducible validation

Use Node 22 and Java 21. From the repository root:

```sh
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npm test
npm run test:rules
npm run test:e2e
npm run audit:production
```

The emulator commands explicitly target **demo-universal-iti**. Tests create synthetic records only. The browser suite signs in through the real Auth emulator (email/password fixtures), loads the real app, queries the real Firestore emulator, and calls the real HTTP API. It does not exercise Google's interactive account-selection popup or access production. All HTTPS browser requests are blocked in that suite, including production Firebase and optional CDN libraries. Emulator expected-denial messages are assertions, not failing tests. CI runs on this development branch and PRs and never deploys.

## Secure MCQs

An instructor publishes a reviewed JSON question set from Class Test. `publishExam` validates schedule, question counts/options and answer indices. It writes public questions to `secureExams` and keys to `examKeys` in one transaction. All clients, including owners, are denied direct key/session access and official-result writes. The API authorizes instructor publishing, and students may start/submit only as their own identity. A server-issued deadline cannot be reset by resuming. Grading is transactional and one result per student/exam is immutable and idempotent, including concurrent retries. An expired attempt cannot submit; there is no automatic timeout submission or proctoring. Do not use high-stakes exams until institute policy for outages, missed deadlines, accommodations and retakes has been agreed. Legacy question sets remain instructor-only; they are not automatically migrated or published.

Example shape (synthetic, schedule supplied by instructor):

```json
{"id":"layout-1","title":"Layout test","durationMinutes":30,"opensAt":1793000000000,"closesAt":1793086400000,"questions":[{"text":"Which item is a page layout tool?","options":["Layout software","Spanner"],"correctIndex":0}]}
```

## Skills and career

My Skills keeps self-ratings distinct from instructor verification. An activated instructor records practical evidence transactionally; the linked student can read it. Skill Gap compares selected practicals against those verified records. Students choose their own role target and practical requirements; this is not an occupational standard or job-eligibility calculation. Self-ratings and plans have private cloud copies, local identity/workspace-scoped drafts, and visible pending-sync status. They do not confer certificates.

Instructors record real HTTPS source listings (job or apprenticeship), employer, city, required skills and source expiry. Students filter by city and see skill mentions in the **tracked sample** only. Duplicate source URLs and invalid/expired records are excluded. Small samples are labelled. Instructor review does not establish that a link remains reachable or a vacancy remains unfilled; verify the original source before applying. No automatic crawl/feed, business census, salary estimate, employment guarantee or invented vacancy is supplied. Google Maps is an external business-discovery search, not a vacancy feed. NCS and Apprenticeship India links point to official portals, where users select their own city/trade and may need accounts.

Sources checked 22 October 2026: https://www.ncs.gov.in/ ; https://www.nsdcindia.org/apprenticeship ; https://mumbai.dvet.gov.in/btri-2/

## AI configuration and costs

Default `AI_PROVIDER=none` is free and makes no model calls. Marathi/Hindi/English guidance, resume outlines and mock-interview questions work entirely without a backend or key. These are structured practice templates, not generative AI or official assessments. The student chooses whether to send their typed goal/answer to an optional backend. The app does not automatically send the student's profile, contacts, records or skill passport.

Configure these **only in the backend environment**, using `server/.env.example` as a reference (the server does not automatically load .env files):

- `GCLOUD_PROJECT`: staging Firebase project.
- `ALLOWED_ORIGINS`: comma-separated exact front-end origins, without trailing slashes.
- `AI_PROVIDER=ollama`, `OLLAMA_URL`, `AI_MODEL`: existing local model server. No per-request provider key; hardware, electricity and hosting are your responsibility.
- `AI_PROVIDER=gemini`, `AI_API_KEY`, `AI_MODEL`: administrator-selected available model and key from a secret manager. Check current free quotas, eligibility, model availability, provider data terms and payment settings yourself; free availability is not guaranteed. Paid access uses the same adapter later.
- `AI_DAILY_LIMIT`: per-user daily generation limit (default 20). Quota records use a hashed key and expiry timestamp; configure Firestore TTL for `apiLimits.expiresAt` or clean them administratively. A failed provider call still consumes quota.

Backend handles consent, role checks, input/output bounds, timeout, per-user quotas and redacted errors. Model text is rendered as plain text and labelled as a draft. No prompts or model responses are logged/stored by this app's backend. Provider retention policies remain external. Teaching-plan generation also uses this backend; the old browser API-key collection and direct provider request have been removed. Existing user-provided session keys are cleared.

Gemini REST reference: https://ai.google.dev/api/generate-content
Firebase Functions pricing requirement: https://firebase.google.com/docs/functions/get-started

No AI key is needed for core records, skill analysis, the reviewed-market directory, portal links, guided interviews or resume outlines. Secure online exams **do** need a trusted backend. GitHub Pages alone cannot securely grade exams or store shared AI keys. This repository supplies a standalone Node backend; it does not include a deployed service or guarantee free internet hosting. Cloud Functions would require a separate wrapper and billing-enabled Blaze project; that is not deployed here.

## Offline and browser privacy

Cloud snapshots are loaded into memory, with all old sections cleared before a new identity/workspace is loaded. V15 no longer writes whole-account snapshots to the legacy shared localStorage key. Existing V14 backups are preserved, and V15 does not automatically load them into students' sessions. Offline mutations use an institute/user/workspace-scoped durable queue, replayed only by that identity and still checked by server rules. Appending while flushing no longer loses new work. Locked/rejected writes remain pending; they are not silently discarded or labelled synced. Submit attendance only after pending attendance has synced. Reopening is a Principal/owner operation. Skill drafts similarly remain scoped to user/workspace and are synchronized separately.

Offline mode supports changes to already-loaded data. A cold offline login cannot obtain fresh authorization and is not supported. Local pending operations/drafts are unencrypted browser storage; use trusted devices and separate browser profiles on shared machines. Simultaneous edits to a record from multiple devices still use last-accepted-write semantics; there is no general merge/conflict-resolution screen. Optional document-import/chart/PDF libraries still use CDNs; those features need network access and separate staging acceptance tests.

## Required owner actions before a release

1. Review Draft PR #16; keep it unmerged until explicitly approved.
2. Create/use a separate staging Firebase project; configure Google sign-in, authorized domains and synthetic accounts for all five roles. Supply public staging Firebase config to `config/runtime.js` (`firebaseConfig`) and staging ADC/workload identity to the backend. For a new empty staging project, sign in once with the intended owner, ensure that Auth user is verified, then set `GCLOUD_PROJECT` to a project ending in `-staging`, `BOOTSTRAP_OWNER_EMAIL`, and `ALLOW_STAGING_BOOTSTRAP=true` and run `node scripts/bootstrap-staging.js`. This one-time initializer refuses an existing institute and creates no trainees. Existing institutes use their existing owner/membership records. Never reuse a production service account in tests.
3. Set up the HTTPS Node backend, exact origin allowlist and `config/runtime.js` URL. Keep `AI_PROVIDER=none` initially. Protect backend filesystem/environment and configure a process supervisor, TLS, monitoring and platform request limits. Use a least-privilege service identity and test revoked/disabled accounts.
4. **After approval**, publish the tested rules to staging, test Google popup/redirect on real Android/iOS devices, PDF/Excel/Word imports, printing/Drive OAuth, real account onboarding, data migration/backup and restore, all institute-specific forms, slow/offline networks and recovery. Emulator coverage does not certify those external integrations.
5. If enabling AI, choose self-hosted or external provider and approve its data policy, quotas and spending configuration. Validate response quality in all three languages with instructors. Mock interviews are text-only; microphone/camera permissions are disabled.
6. Configure a protected GitHub `production` environment with required reviewers. The rules-deployment workflow is restricted to `main` and that environment. Existing repository-level Pages settings are outside this branch's control and were not changed.
7. Approve a rollout, migration, backup/rollback and exam outage policy. Only then explicitly authorize any main merge and production deployment. This work has not performed either.

Development tooling still has upstream dependency advisories; see the validation report for exact packages and severity. Production installs must use `npm ci --omit=dev --ignore-scripts`. Do not ship the Firebase CLI or emulator tooling with the backend.

The production audit command retries only unavailable/malformed registry responses and fails on real findings or exhausted retries. Its JSON result is included in the CI validation artifact. Instructor invitation management is restricted to the student workspaces assigned to that instructor.
