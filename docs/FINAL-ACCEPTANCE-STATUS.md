# Prototype acceptance status — 28 October 2026

## Current application and deployment

Work remains on `phase1/security-student-career-20261021` in draft [PR #16](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/pull/16). Main has not been merged and no production deployment is certified.

The deployed Firebase Hosting application is source `6fb49a5991ee4f3d1ebb5238a8d796f5fe0a56be`. All 56 public files were independently matched against that immutable build on 28 October. The staging application is https://universal-iti-dk-staging.web.app/v15/ . Hosting updates are published through the operator's existing authenticated Cloud Shell; Cloud Shell does not need to remain open for the website to run.

That source passed [CI 40642886538](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40642886538): 213 native tests, the other regression scripts, three Auth/Firestore/backend Emulator suites, 56 desktop/mobile browser cases, public build, container smoke and both dependency audits with zero advisories. These synthetic checks do not certify every hosted journey or production readiness.

The migration verification tooling in `be3bae3b69c33fac022ca9d4d8cfc8e36c0b307a` passed [CI 40654182600](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40654182600). Tools are not shipped in the public Hosting bundle. Private inventory/readback output remains in the operator workflow, not this public report. Transfer safeguards and the read-only verification procedure are documented in [DTP-STAGING-TRANSFER.md](DTP-STAGING-TRANSFER.md).

## Current release preparation

Two issues found during hosted acceptance are corrected in the branch and await the next Hosting release:

- The staging notice identifies institute records and authorised access instead of asserting that all data is synthetic. The message itself does not enforce access; Firebase Authentication, membership and Firestore rules do.
- Dashboard next-topic lists follow numeric training sequence, falling back to topic number. This prevents lexical document IDs from producing 1, 10, 100 ordering. Sorting does not change saved topic records. Topic numbers, titles and dates are escaped in the roadmap.

Local native validation for these changes passed 226 tests plus the regression scripts. Four focused desktop/mobile browser cases also passed. GitHub CI is tracked separately; a started run is not a pass. The original DTP saved plans were opened for read-only acceptance without generating replacement plans or marking records completed. The calendar explicitly identifies the bundled DTPO calendar; this is not a government certification of its dates. Current-release PDF download/physical printing and device-specific acceptance remain pending.

## Role acceptance boundary

| Role | Automated coverage | Hosted acceptance boundary |
|---|---|---|
| System Admin | Authenticated role/routes/mobile; other roles denied technical console | Current independent authorised owner workflow remains pending |
| Principal | Routes/mobile, leave approvals and attendance reopening boundaries | Current independent account and institute approval procedures remain pending |
| Instructor | Skill verification, plans/materials, reports, leave, secure exam authoring and queues | Authorised live session, session restoration, workspace/institute/session headers and saved teaching-plan display observed; intended-device printing/integrations remain pending |
| Staff | Role/routes/mobile and backend/rules restrictions | Existing authorised synthetic Staff session remains pending |
| Student | Own-record isolation, Skill Passport, Skill Gap, Learning Plan, applications and multilingual keyless guidance | Current independent authorised Student session remains pending |

Do not promote the Instructor, reset real-user credentials or create artificial completions to bypass these acceptance limits. No real trainee assessment or attendance mutation was performed for browser testing.

## AI and keyless functionality

The Render Free staging API has previously passed a health check and authenticated synthetic teaching-draft/save/reload checks. The previously verified backend source is `0f01524c246e4b1c1676c29567c6fd15cf374c5f`. Gemini teaching probes returned validated structured output on 27 October; this is historical evidence, not a current uptime or Student-task quality guarantee. No API key is required to open saved plans, use registers or access structured keyless career/resume/interview guidance.

The application allows 50 AI attempts per UID per UTC day, including failures, resetting at 05:30 IST. Provider quotas are separate and can change. Free service cold starts and provider availability can delay or prevent generation; an existing reviewed draft must not be silently replaced after a failed request. Credentials stay on the backend. No paid resource upgrade was enabled in this work.

## Pending and blocked

- Publish and verify the next Hosting-only staging release for the notice and Dashboard fixes. Database transfer and Hosting deployment are separate operations; do not repeat transfer just to publish code.
- Complete the current-release independent Student-to-Instructor live journey using authorised synthetic accounts. Do not use real students for test mutations.
- Privileged application-enforced MFA, account recovery/anti-lockout design and intended-device enrollment/recovery remain outstanding. Google sign-in alone does not prove enforced MFA. Institute-ID aliases without deliverable email do not have a safe automatic email recovery flow.
- Training-resource backup excludes trainee records, attendance, marks, exams, accounts and files. Full disaster recovery is not implemented. Drive OAuth/upload, OS downloads and physical printing still need acceptance.
- Automatic GitHub-to-Firebase staging deployment is not configured. The Work executor has no authorised Firebase CLI session. Do not paste credentials or reuse another service's keys.
- No measured time saving, placement improvement, employer relationship, live vacancy or certification is claimed without evidence. Use the existing demonstration guide and label planned capabilities clearly.
