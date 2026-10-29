# Prototype acceptance status — updated 29 October 2026

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

## Security/recovery implementation after the verified deployment

New work is prepared on the same development branch and PR; it has not been deployed:

- An operator-only AES-256-GCM Firestore archive captures all collections/subcollections, including protected student, attendance, marks, exam and access-control documents. Exclusive private files, authenticated decryption, an explicit staging source and loopback-only fresh emulator restore prevent silent overwrite or live restore. Synthetic export/encrypt/decrypt/restore/readback passed. The operator subsequently supplied a successful encrypted staging export and local file verification; the real-record archive has not undergone a restore rehearsal. Authentication identities/secrets, file bytes and external configuration remain outside this archive; it is not a full Firebase disaster-recovery certification.
- Firebase-native TOTP challenge handling is integrated with existing password, Google popup and redirect flows. Challenge cancellation, wrong codes, throttling and expiry fail closed. This does not configure/enroll users or enforce a privileged policy. Production Admin/Principal password restrictions remain.
- Password recovery now distinguishes unavailable/misconfigured providers from a normally accepted request while suppressing account-existence information. A read-only operator MFA readiness script reports provider/enrollment booleans without exposing identities or secrets.
- Local validation passed **260 native tests**, all existing security/Auth/Firestore/backend emulator suites plus the new encrypted database restore rehearsal, **60 desktop/mobile browser cases**, the staged public build, and the all-dependency audit with zero advisories. Browser cases include real emulator role sessions, offline guidance, syllabus/completion sync, materials, lock-aware leave approval, protected MCQ, training backup, private plans and Chromium PDF generation. Hosted MFA enrollment, physical printing and Drive OAuth are not inferred from those cases.
- Local container smoke could not run because Docker is unavailable in the Work executor. GitHub Actions remains the container validation gate; a missing Docker binary is not an app test failure or a passing container test.

See [SECURITY-RECOVERY-ROLLOUT.md](SECURITY-RECOVERY-ROLLOUT.md) for exact scope, operator commands, the privileged-policy/recovery rollout gate and remaining integrations. No paid upgrade, account grant/reset, production rules change or live restore was performed.

## 29 October verification closure

Security/recovery application source `32b9f94cd14f70ca14ec1e5edf821b25e264cc05` and encrypted archive source `7adcdc1cce783c21dd8793908bba729cb201cca6` are committed on PR #16. Full [CI 40719203184](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40719203184) completed successfully: 260 native tests, all emulator suites including encrypted restore/readback, 60 desktop/mobile browser cases, public build, container smoke and both dependency audits. Local Docker remains unavailable, but container smoke is independently passed in CI.

The Work executor's live preflight returned `GCLOUD_LOGIN_REQUIRED`, with `readOnly: true` and `dataChanged: false`; no authorised Google Cloud session or Firebase deployment connector is available here. The operator subsequently completed the staging preflight and encrypted export in the existing authorised Cloud Shell, as recorded below. Privileged enrollment/recovery and a real-record restore rehearsal remain unverified. The prepared frontend MFA/recovery update is not certified deployed by this report. No billing, production rules, account grants, enrollment or live restore was changed.

The operator subsequently supplied a successful read-only staging preflight: TOTP is disabled, the privileged accounts inspected have no enrolled factors and no potentially deliverable recovery inbox, and live challenge/recovery and application policy enforcement are unverified. `dataChanged` remained false. This is staging evidence only; it does not establish production configuration or prove that Identity Platform is absent. The diagnostic now separates Auth project subtype from TOTP status and labels the known synthetic domain explicitly. Preserve demo identities, establish an authorised real-account recovery route before enforcement, and continue the independent encrypted staging backup procedure. The subsequent operator export/file-verification result is recorded below; archive contents and keys remain private.

## Operator staging backup verification — 29 October

The operator supplied successful `init-key`, encrypted `export` and `verify` summaries for `universal-iti-dk-staging`. Export reported authenticated local-file readback success and both export/verify reported no database changes. This confirms the operator-created encrypted Firestore archive and its local decryption/structural verification; it is not an independently executed restore of the actual archive. Record counts, paths, archive contents and encryption keys are intentionally excluded from this public report.

The archive explicitly reports `consistentSnapshot: false`. Authentication identities/passwords/MFA secrets, Storage/Drive file bytes, IAM, rules/indexes and external configuration are excluded. Retain independently secured copies of the archive and key; a Cloud Shell-only copy is not a complete disaster-recovery arrangement. A private real-record restore rehearsal and those additional recovery procedures remain pending.

The same operator preflight confirms `IDENTITY_PLATFORM` is already enabled on staging, while TOTP is disabled. Both inspected privileged identities are explicitly synthetic and have no enrolled factors or potentially deliverable recovery inbox. No production review, hosted challenge, recovery proof or enforcement is established. Do not require MFA on these accounts before an approved recovery/enrollment path is available; identify the intended existing real privileged accounts without silently changing demo emails, UIDs or roles.

Diagnostic source `4043ae19a2ec59b8f333e48bb9d964d7e5da2451` passed [CI 40829522504](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40829522504): 261 native tests, 60 desktop/mobile browser cases, all emulator suites including encrypted restore rehearsal, public build/container smoke and dependency audits. This report update is documentation only and does not require Hosting deployment.

## Requested existing-Google-account Admin/Principal access

The user explicitly named the intended existing Google account for both Admin and Principal views. A staging-only operator preview/apply tool and server-managed delegation support are prepared. They preserve the existing Firebase UID, saved Instructor role, workspace assignments, root owner and five demo identities. The official Principal identifier is retained; application view access is not an employment designation.

The delegated authority requires a verified matching Google token, an active owner-style membership and a matching operator-managed grant. Rules deny all client grant mutations/listing; a selected role, email allowlist or member-owner flag alone is insufficient. Backend checks match the rules, including in-transaction leave-review revocation checks. The operator apply tool verifies exact deployed rules, backend support and frontend hashes, binds a fresh preview fingerprint and records the grant atomically with an audit event. It does not create an Auth account, change a password/email, transfer root ownership, enroll MFA or support a production grant.

Local native/emulator/browser validation is recorded in [STAGING-ADMIN-DELEGATION.md](STAGING-ADMIN-DELEGATION.md). The new grant is not yet live or certified: the Work executor has no authorised Firebase CLI session. Staging deployment, read-only lookup of the actual Google account, explicit operator apply/readback and independent hosted Admin/Principal acceptance remain necessary. The exact existing Render staging service was identified read-only; it is on its existing free plan with automatic deployment off. No Render configuration or live access grant was changed during preparation.
