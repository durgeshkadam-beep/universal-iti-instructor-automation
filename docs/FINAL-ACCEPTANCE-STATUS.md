# Prototype acceptance status — 28 October 2026

## Release and deployment

Work remains on `phase1/security-student-career-20261021` in draft [PR #16](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/pull/16). Main has not been merged. No production deployment or complete production acceptance is claimed.

The independently verified Firebase Hosting release is now `f7137655fe1eb1c4d26fa6c11f0411a41c510b54` at https://universal-iti-dk-staging.web.app/v15/ . After the operator reported the deployment on 28 October, all 57 deployed public files, including the manifest, matched the prepared release; no mismatches were found. The manifest endpoint returned HTTP 200 with the configured security headers. Cloud Shell does not need to remain open for Hosting or the deployed backend to run.

The dashboard/notice correction in `f7137655fe1eb1c4d26fa6c11f0411a41c510b54` has passed full CI and its public assets are verified deployed. It uses authorised, account/project/institute-scoped identity fallbacks, preserves the original embedded author/institute details, hides Instructor profile cards from other roles, and escapes notices with explicit missing-date labels. It does not rewrite workspace records.

## Automated validation

- Deployed source: [CI 40701296595](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40701296595) passed 242 native tests, regression scripts, security/Auth/Firestore/backend emulator suites, 58 desktop/mobile browser cases, public build/container checks and both dependency audits with zero advisories.
- Current deployed correction: [CI 40707552024](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40707552024) passed 244 native tests, regression scripts, emulator suites, 58 desktop/mobile browser cases, build/container checks and dependency audits.
- Local focused validation for the prepared correction passed 244 native tests and 12 desktop/mobile cases covering all five role routes and dashboard identity/order.

An earlier CI attempt failed before tests because a package mirror returned inconsistent browser-dependency file sizes; a retry passed without relaxing checks. The initial local browser attempt lacked Chromium; after restoring Chromium, focused browser cases passed. Neither environment failure is represented as a successful app test.

## Current hosted account acceptance

All five independent synthetic accounts completed actual password sign-in on the preceding `b9b476a...` staging release, before the dashboard/notice-only update. The new release has full automated coverage and independent public-asset verification; all five hosted logins were not repeated after that update. Secure credential entry was user-controlled; no passwords or tokens belong in this repository.

| Role | Observed hosted result | Remaining boundary |
|---|---|---|
| System Admin | Synthetic admin identified as System Admin; technical control center, workspace/employee management, system health and audit navigation present | No account, permission, restore/delete or privileged MFA/recovery mutation tested |
| Principal | Synthetic principal identified as Principal; institute oversight, notices, compliance and reports navigation opened | No pending attendance approval existed; no live approval/reopening or official report signing was performed |
| Instructor | Dedicated synthetic Instructor login, session restoration, saved practical/theory drafts, alternate schedule and skill-verification save observed | No real trainee assessment, attendance, marks or completion was changed |
| Staff | Synthetic Staff login; read-only dashboard and reports visible without Instructor editing controls | No live data/report mutation or physical printing tested |
| Student | Dedicated Student login; own skills, instructor evidence, saved private learning plan, shared calendar and career services observed | Full cross-account isolation is covered by automated tests; hosted testing used the linked synthetic trainee |

Successful login does not establish the root cause of earlier generic failures. Role selection is a requested view, not an authority grant. Existing Admin/Principal institute-wide authority was not narrowed or expanded; the other demo accounts remained in the existing synthetic workspace.

## Verified Instructor-to-Student demonstration

Only the synthetic Electrician workspace was used for live writes. The historically named workspace ID does not make these fixtures original DTP records.

1. Instructor generated an actual optional Gemini practical draft and a theory lesson draft. Each was saved as AI DRAFT / Version 1, reopened after a full page refresh, and retained its synthetic institute/instructor/trade/session header. They remain unapproved and were not marked conducted.
2. The alternate scheduler saved a calendar starting 30 October 2026, using 7 practical hours per working day and 1 theory day per topic. The table excluded Sunday and carried a multi-day practical to the next working day. Existing teaching drafts were retained. This was not a new complete-plan rebuild or generative syllabus extraction.
3. Instructor updated one practical with evidence explicitly labelled as a simulated demonstration. The UI confirmed a Firebase save.
4. A separate Student sign-in displayed that same instructor evidence on My Skills, proving live Instructor-to-Student readback.
5. Student saved a self-selected apprenticeship-preparation goal and practical selections. The UI confirmed a private cloud sync. After a full refresh, the same goal and selections remained. All three fixture skills were already verified, so the displayed 3/3 coverage was expected; no artificial gap or real employment readiness was inferred.
6. Student's Training Calendar showed the Instructor's saved dates with no scheduling controls. My Practicals exposed View Notes without editing/completion/AI-authoring controls. An unapproved AI draft was not shown as reviewed teaching material.

Original DTP records were separately imported and verified through the operator's read-only procedure. That transfer is complete and must not be repeated to deploy frontend code. Private inventory counts and record contents are intentionally excluded from this public report. See [DTP-STAGING-TRANSFER.md](DTP-STAGING-TRANSFER.md).

## AI, career services and honest limits

Hosted Student tests returned Marathi structured career guidance, a Hindi resume outline and English mock-interview questions through keyless guidance. These are labelled templates, not generative output.

After explicit consent using only a synthetic practice answer, the Student optional backend request returned an actual AI mock-interview draft. Instructor generation and Student generation are observed capabilities, not guarantees of technical accuracy, uptime or unlimited free use. Teaching drafts require Instructor review before approval or use.

The Job Market displayed an honest empty state: no institute-reviewed live listings were available. NCS and Apprenticeship India were presented as discovery portals, not verified individual vacancies or employer partnerships. No vacancy, placement statistic, certification or measured impact was invented.

The application limit is 50 AI attempts per UID per UTC day, including failures, resetting at 05:30 IST. Provider quotas are separate. Free backend cold starts and provider limits can delay or block requests. Saved plans, registers and structured keyless assistance do not require an AI key. API credentials remain on the backend; no paid upgrade was enabled.

## Pending, blocked and production boundary

- **Completed staging Hosting deployment:** source `f7137655fe1eb1c4d26fa6c11f0411a41c510b54`, containing the tested dashboard/notice correction, independently matches all 57 prepared public files. Do not repeat deployment or the data transfer for this documentation-only status update.
- **Deployment access:** the Work executor has no authorised Firebase CLI session or Firebase deployment connector. The Work browser's Cloud Shell returned Site Unavailable. The operator's existing Cloud Shell remains the available deployment path; no credentials should be pasted into chat.
- **Privileged access:** application-enforced MFA, account recovery/anti-lockout design, intended-device enrollment and recovery remain outstanding. Google login alone does not prove enforced MFA. Non-deliverable institute aliases do not provide safe automatic email recovery.
- **Recovery/integrations:** training-resource backup excludes trainees, attendance, marks, exams, accounts and files. Full disaster recovery is not implemented. Drive OAuth/upload, OS downloads, physical printing and intended-device acceptance remain pending.
- **Module acceptance:** automated coverage exists for attendance locks/reopening, leave, marks/exam isolation, secure MCQ, queues, reports and role restrictions. Complete hosted CRUD, approval, offline conflict/recovery and all-device acceptance were not performed and are not claimed.
- **Delivery:** no production deploy, main merge, force-push, real-user credential reset, permission relaxation or paid resource upgrade occurred. The demonstrated Student/Instructor workflow and five successful role logins support a prototype demo; they do not certify production readiness.

See [DEMO-WALKTHROUGH.md](DEMO-WALKTHROUGH.md) for the demonstration sequence. Use synthetic accounts for mutations and distinguish saved AI drafts, reviewed material, keyless assistance and planned capabilities.
