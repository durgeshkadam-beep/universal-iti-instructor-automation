# Prototype acceptance status — 27 October 2026

## Verified source and evidence

Source `8005c3455fadfa4306098e7f5370d8fe8c41c869` passed [CI 40490452467](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40490452467): 147 native tests, regression scripts, all three actual Auth/Firestore/backend Emulator suites, 48 desktop/mobile browser cases (2.7 minutes), public build, container smoke and production/development-inclusive audits. All steps succeeded. These are automated local-Emulator acceptance results, not hosted Google/MFA/provider acceptance.

| Area | Automated acceptance | Remaining hosted acceptance |
|---|---|---|
| System Admin | Authenticated role, every exposed route, mobile containment; other roles cannot open Admin console | Approved real owner session and external admin integrations |
| Principal | Authenticated role/routes/mobile; attendance reopen in cross-month leave transaction | Intended-device Google session and institute procedures |
| Instructor | Role/routes/mobile; verification, syllabus/plans/materials, reports, leave review, secure MCQ authoring, queue and backup flows | Owner supplied synthetic verification/save and subsequent loaded-row screenshots; other hosted paths need current-release checks |
| Staff | Authenticated role/routes/mobile; backend/rules restrictions | Separate authorised staging Staff session |
| Student | Own skill record from Instructor, private plan save, multilingual keyless guidance, server MCQ grading, private collection denial, role/routes/mobile | Fresh authorised Student session on the deployed storage-isolation release |

A new browser scenario additionally checks self-rating plus a selected subset of practicals and a unique career goal surviving a completely fresh browser context through authenticated cloud hydration. It plants an ambiguous legacy pending draft and checks that it remains untouched and cannot overwrite the current institute cloud plan. The scenario is not counted as passing until its full CI run succeeds.

## Hosting status

The owner deployed context-safety source `0d6d2d1c159776c9f80f1b82d7a8a98f87e5eb64` to `universal-iti-dk-staging`; four fresh hosted modules matched that source. The storage-isolation update `8005c3455fadfa4306098e7f5370d8fe8c41c869` is approved for staging Hosting only and its CI passed. A release must be verified by fresh public asset hashes. There is no authorised Firebase CLI account in the current Work executor. A Google session in an unrelated Cloud Shell does not authenticate this executor. No main merge, production rules release or production deployment is certified.

## Configuration blockers and limits

- **Live role testing:** The owner uses Instructor only. Admin/Principal/Staff/Student tests require separate existing synthetic identities and their secure sign-in, or an authorised operator running an acceptance harness. Never promote the owner's Instructor session or reset real-user credentials for a demo. No synthetic passwords are included in this report.
- **MFA:** Firebase TOTP requires Firebase Authentication with Identity Platform and verified email. Project configuration, factor enrollment, challenge/recovery UX and backend/rules enforcement must be validated together. Google-only privileged login is not proof that this application enforces MFA. No project upgrade, billing change, factor enrollment or production authentication change has been made. Official reference: https://firebase.google.com/docs/auth/web/totp-mfa . Provider-account 2-step verification is not a substitute for application-level enforcement.
- **Recovery:** Explicit real-email password reset is implemented behind the opt-in password-login configuration. Institute-ID-only/non-deliverable aliases have no safe automatic email recovery. Administrative identity proof, reset authority, audit, revocation and anti-lockout procedures require a separately reviewed design. Do not merge Firebase UIDs or grant recovery authority from a browser role selection.
- **Backups:** Training-only export/preview/create-only restore is tested; it excludes trainees, attendance, marks, exams, accounts and files. Full disaster recovery is not implemented. Real Drive OAuth/upload, OS download handling and physical printing remain independent acceptance checks. No credentials or private learner records should be added to public archives.
- **Generative AI:** Server adapters, consent, authentication, quotas and disabled-mode behavior exist. No configured external key/model host or live provider quality acceptance is available. Keyless Marathi/Hindi/English career/resume/text-interview templates work. A provider/model, server-side secret or model host and approved quotas are required before generated responses can honestly be shown. Do not add keys to browser config, GitHub or chat; do not silently enable paid compute/API usage.

This report deliberately distinguishes implementation, emulator acceptance, owner screenshots and hosted acceptance. It is not a production release certificate.
