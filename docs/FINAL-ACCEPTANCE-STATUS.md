# Prototype acceptance status — 28 October 2026

## Current application and deployment

Work remains on `phase1/security-student-career-20261021` in draft [PR #16](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/pull/16). Main has not been merged and no production deployment is certified.

The deployed Firebase Hosting application is source `b9b476a5862d027cf2ce8871a4ff93d3abad1e23`. After the operator reported the Hosting-only staging deployment, all 57 deployed files (including the build manifest) independently matched the prepared release on 28 October; no mismatches were found. The staging application is https://universal-iti-dk-staging.web.app/v15/ . Hosting updates are published through the operator's existing authenticated Cloud Shell; Cloud Shell does not need to remain open for the website to run.

That source passed [CI 40642886538](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40642886538): 213 native tests, the other regression scripts, three Auth/Firestore/backend Emulator suites, 56 desktop/mobile browser cases, public build, container smoke and both dependency audits with zero advisories. These synthetic checks do not certify every hosted journey or production readiness.

The migration verification tooling in `be3bae3b69c33fac022ca9d4d8cfc8e36c0b307a` passed [CI 40654182600](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40654182600). Tools are not shipped in the public Hosting bundle. Private inventory/readback output remains in the operator workflow, not this public report. Transfer safeguards and the read-only verification procedure are documented in [DTP-STAGING-TRANSFER.md](DTP-STAGING-TRANSFER.md).

## Latest verified release

Two issues found during hosted acceptance are corrected and verified on staging:

- The staging notice identifies institute records and authorised access instead of asserting that all data is synthetic. The message itself does not enforce access; Firebase Authentication, membership and Firestore rules do.
- Dashboard next-topic lists follow numeric training sequence, falling back to topic number. This prevents lexical document IDs from producing 1, 10, 100 ordering. Sorting does not change saved topic records. Topic numbers, titles and dates are escaped in the roadmap.

Local native validation for these changes passed 226 tests plus the regression scripts. Four focused desktop/mobile browser cases also passed. Full [CI 40657562573](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40657562573) completed successfully, including 226 native tests, 58 desktop/mobile browser cases, all emulator suites, build/container checks and both dependency audits. The refreshed authorised Instructor browser session shows the updated staging notice and numeric next-topic ordering. Session restoration and workspace/institute/session display were observed. The original DTP saved plans were opened for read-only acceptance without generating replacement plans or marking records completed. The calendar explicitly identifies the bundled DTPO calendar; this is not a government certification of its dates. Current-release PDF download/physical printing and device-specific acceptance remain pending.

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

- Hosting source `ca10431...` and its notice/Dashboard fixes are deployed and verified. Database transfer and Hosting deployment are separate operations; do not repeat transfer just to publish code. This report update is documentation only and requires no Hosting deployment.
- Complete the current-release independent Student-to-Instructor live journey using authorised synthetic accounts. Do not use real students for test mutations.
- Privileged application-enforced MFA, account recovery/anti-lockout design and intended-device enrollment/recovery remain outstanding. Google sign-in alone does not prove enforced MFA. Institute-ID aliases without deliverable email do not have a safe automatic email recovery flow.
- Training-resource backup excludes trainee records, attendance, marks, exams, accounts and files. Full disaster recovery is not implemented. Drive OAuth/upload, OS downloads and physical printing still need acceptance.
- Automatic GitHub-to-Firebase staging deployment is not configured. The Work executor has no authorised Firebase CLI session. Do not paste credentials or reuse another service's keys.
- No measured time saving, placement improvement, employer relationship, live vacancy or certification is claimed without evidence. Use the existing demonstration guide and label planned capabilities clearly.

## Latest login investigation and full validation

Application/tooling source `b9b476a5862d027cf2ce8871a4ff93d3abad1e23` passed [CI 40701296595](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40701296595) on retry: 242 native tests, all security/Auth/Firestore/backend emulator suites, 58 desktop/mobile browser cases, build/container checks, and both dependency audits with zero advisories. The first attempt failed before tests at browser-dependency installation because an Ubuntu package mirror returned inconsistent file sizes. The retry completed successfully without relaxing checks.

Locally, 242 native tests, all emulator suites, both zero-advisory audits and two focused desktop/mobile password-login cases passed after restoring Java 21 and Chromium. The initial local browser attempt could not launch because Chromium was absent; it was not an application assertion failure. Full browser acceptance is evidenced by CI, not that failed environment attempt.

The latest source adds safe, fixed messages distinguishing rejected credentials, unavailable network, rate limits and incomplete role/workspace access. These messages do not grant roles or bypass Firebase Authentication. It also adds an operator-private check that signs in only the allowlisted synthetic Instructor and reads that same account's membership without printing passwords or tokens. The operator supplied a successful password/membership check. This does not prove the browser's pasted credentials, transport or complete app session are correct. The hosted browser showed only the old generic failure, so its root cause remains unconfirmed. Do not claim that the login defect is fixed merely because diagnostics or emulator tests pass.

In the earlier authorised live synthetic Instructor session, an actual Gemini practical draft and theory lesson draft were generated, saved as AI DRAFT / Version 1, and reopened after page refresh. They were not approved or marked conducted. The subsequent browser session was lost; later login attempts failed generically. The pending alternate-calendar confirmation was not verified as saved. Independent current Student, Principal, Staff and System Admin-role browser acceptance remains pending. Account configuration is not equivalent to successful live login.

The latest diagnostic frontend source has not yet been certified as deployed. The last independently verified Hosting release remains `ca10431...`. The Work browser's Cloud Shell returned Site Unavailable, and the executor has no authorised Firebase CLI session or deployment connector. No production deployment, main merge, permission relaxation, real-user credential reset or paid service upgrade was performed. Production release remains blocked by hosted-login acceptance, privileged MFA/recovery and full disaster recovery, as described above.

## Subsequent deployed-release acceptance

After the operator deployed `b9b476a...`, all 57 public files (including the manifest) matched the prepared staging release; no differences were found. The synthetic Instructor subsequently completed a real password sign-in in the cloud browser. Earlier generic failures are not attributed to a proven root cause; successful later sign-in does not establish which earlier credential-entry, browser, transport or session condition caused them.

In that authorised synthetic workspace, the alternate scheduler was applied from 30 October 2026 using 7 practical hours per working day and 1 theory day per topic. The saved table showed Sunday exclusion and a multi-day practical continuing on the next working day, with practical topic numbering consistent with the register. This was the alternate scheduler, not a fresh complete-plan rebuild or generative syllabus extraction; existing AI drafts were retained.

The Instructor updated clearly labelled synthetic evidence for one practical. The UI returned “Saved to Firebase. Student can view this verification on My Skills.” That is evidence of the Instructor save only. The subsequent independent Student credential prompt was declined and was not retried. The Student-side readback, calendar view and private learning-plan save/reopen remain pending on this deployed release. No real trainee assessment, completion or attendance record was changed for these tests.

Public-header quality issues remain in the older synthetic fixture: the Dashboard shows an undefined institute field and the synthetic notice has no date. Saved plan headers use the authorised institute fallback. These visible fixture/display issues have not been certified as corrected. Full production acceptance remains incomplete, particularly independent role journeys, MFA/recovery, full backup and device/integration checks. This documentation-only update requires neither Hosting deployment nor data transfer.

## Prepared dashboard identity correction

The branch now uses the same authorised project/account/institute-scoped display identity for Dashboard headers as the saved plan templates. V15 Instructor cards use current workspace/session details; the bundled author's static identity is not shown as another account's profile. Workspace metadata and the original embedded source identity are not rewritten. Missing notice dates are labelled explicitly, and notice titles/bodies/dates are escaped rather than interpreted as HTML.

Local validation passed 244 native tests plus regression scripts and 12 focused desktop/mobile browser cases covering all five role routes and dashboard identity/order. Existing institute-header regressions also passed, including stale-account/project isolation. Full new-commit CI and Hosting deployment are separate gates; this prepared correction is not yet certified live. Student credential entry remains user-controlled, and no declined prompt was repeated for these code changes.
