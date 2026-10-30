# Instructor improvements — 30 October 2026

Work order agreed with the user: Instructor, then Student, then Admin/Principal, then Staff. Existing identities, institute details, authorised records and stable topic/trainee identifiers are retained. Staging only; this is not production acceptance.

## Completed first workstream

- Dashboard compares scheduled topic finishes with teaching marked complete. Separate practical/theory cards show expected position, completion count and overdue incomplete work. Completing a later topic cannot cancel an earlier backlog. Multi-day allocation finishes, partial allocation warnings, invalid dates and India calendar dates are handled explicitly. Saved AI drafts are not counted as teaching completed.
- Instructor practical/theory registers have readable red overdue, green completed, amber upcoming/due-today and grey unknown-finish statuses. Desktop rows become mobile cards. Edit, move and delete remain available in accessible More actions; topic IDs and mutation handlers are retained.
- Evaluation sorts practicals by sequence/natural exercise number and trainees by natural roll number, displays serial/roll/name separately, preserves selected practical and unsaved inputs on refresh, validates marks and rejects stale workspace/record saves. Names and submission links are rendered safely. The existing 35-mark criteria remain unchanged.
- Attendance shows only the selected year-month's saved holidays, with date/day labels. Year planning retains the complete holiday collection. Monthly submission context follows the selected attendance month and asynchronous context changes are guarded.
- Plan Training opens the saved split-up schedule rather than Module Manager.

Initial local validation: 289 native Node tests and 16/16 selected desktop/mobile Auth/Firestore emulator browser cases passed. The remote full command subsequently exposed a missing `todayISO` fixture in the standalone controller regression; its fix and the complete final results are recorded below. Browser coverage includes all five role route/containment checks, actual syllabus form save/cloud reload, hostile fields/stale completion dialogs and the new Instructor progress/evaluation/holiday flow. Mobile practical cards were visually inspected. Initial browser execution could not launch because Chromium's headless binary was still downloading; it is not counted as an application test pass. The complete rerun passed after installation. No rules/backend/auth provider changes were made in this workstream.

## Remaining Instructor workstreams

1. Reviewed Excel year planning, separate 5+3 capacities, stable numbers/non-destructive atomic revisions and day/week/month print views are implemented; see YEAR-PLANNING-20261030.md for current validation/deployment status. Scanned PDF OCR is still pending. Holiday coverage must be reviewed for every session year.
2. Skill verification and workplace applications now share one primary menu. Source/excerpt-guided manual prompts, optional backend AI draft requests, reviewed JSON preview and conflict-safe publication are implemented; see INSTRUCTOR-WORKPLACE-GUIDANCE-20261030.md. A vetted source catalogue and real provider acceptance remain; no catalogue facts or market demand are invented.
3. Records/inspection/report/Drive navigation is grouped. Account/workspace-bound sanitised PDF capture and Drive consent/upload guards are implemented; see INSTRUCTOR-RECORDS-DRIVE-20261030.md. Real OAuth/Drive acceptance and overlapping-form review remain. PDF exports are not restorable institution backups.
4. Existing branch work restored trainee Excel/CSV import with template, duplicate preview and stable IDs, independent of Firebase login provisioning. It was retained during year-planning integration; 12 focused combined browser checks passed; full CI acceptance remains required.
5. Honest AI capability status and nearby JSON/manual help are implemented. Instructor-owned API keys require protected server storage and deployment/configuration; do not store keys in browser storage or public code. Year-plan revisions now have authoritative transaction tests; individual lesson/demo-plan revision history still needs its own work.
6. Final Instructor module acceptance, including an actual supplied MCQ test file and real-account Drive consent/printing. Accepted existing modules should not be redesigned unnecessarily.

The operator subsequently published the chart-corrected 7c4f641 release. Independent GitHub runner checks matched all 70 hosted files and desktop/mobile login shells, local Chart.js canvas rendering and backend health/version (Published staging verification 41082061174 passed). See INSTRUCTOR-HOSTED-ACCEPTANCE-20261030.md for the exact scope, discovered CDN chart defect and follow-up publication status. This Work environment still has no authenticated Firebase CLI/operator session. No production deployment, main merge, real-student test write or credential publication is part of this change.

## Second workstream

- Completed Practical and Theory rows now offer **More actions → Edit completion date**. The form opens the existing date and changes only the teaching date/status, retaining plans, IDs, materials and the existing stale-context/permission checks. Dashboard and actual-taught reports read the corrected date. Dates are validated; no Firebase roles or authentication are changed.
- Instructor navigation groups Year Planning / Split-up (saved schedule, import and advanced topics), Skills & Workplace Use (individual assessment and common source review), and Records & Backup. Legacy route calls open the relevant grouped subsection, preserving original DOM forms and handlers. Optional Pilot Evidence is inside Records. Student, Admin, Principal and Staff menus are unchanged in this phase.
- Parallel month-lock reads can no longer create duplicate attendance cards. A generation guard discards older responses and the final append removes superseded cards.
- AI availability uses an authenticated, read-only `capabilities` request. An API URL alone no longer claims that generation works or automatically spends a request. The UI distinguishes configured provider from tested provider health/quota. Manual mode remains available and a context change invalidates cached capability results. Misleading client-key and model controls/privacy text were removed; personal-key provisioning remains pending secure server storage. No provider key is accepted or stored by the frontend.
- Nearby expandable JSON help explains Copy Prompt, full JSON response, preview, error correction and explicit save/approval. Invalid text remains editable.

Validation history: the first remote CI rejected a missing standalone date fixture. A grouped-menu development run found an attendance-card race, which is fixed. An optional mobile screenshot attempted to capture the closed sidebar and timed out; it now captures the visible skills section. These failures are retained as failures, not counted as passes. Final complete checks are recorded after the final run.

Additional regression found during full validation: re-executing the staging login module created duplicate notices/wrappers. Installation is now idempotent and Institute ID aliases are validated against the current public staging domain. This does not grant roles or bypass Firebase sign-in. A new regression verifies one notice/form and the retained domain validation.

The first complete browser attempt was 72/74: one existing held-flush syllabus persistence poll and one duplicate-notice assertion failed. The persistence failure's cause is not established; a diagnostic attachment was added without changing the assertion or its timeout. After the staging install fix, all **20/20 focused repetitions** of the real password and held-flush syllabus-save workflows passed across desktop/mobile (five repetitions each, 1.7 minutes). This does not substitute for the complete suite. Final whole-suite and CI status are published in PR #16; no deployment is implied by a passing test.

The release allowlist build with explicit staging public config succeeded. Local Docker smoke could not run because this environment has no Docker executable (`spawnSync docker ENOENT`); the CI container job remains required. The development-inclusive dependency audit reported zero advisories on its first attempt.

## Third workstream — reviewed year planning

See [YEAR-PLANNING-20261030.md](YEAR-PLANNING-20261030.md) for the actual workflow, preservation/concurrency model, incoming branch integration, scoped rule review, final validation status and deployment limitations. No Instructor completion or live Firebase release is claimed by implementing this workstream.

Third-workstream local validation: 337 native tests plus repository regressions, all seven emulator suites (with an additional final year-planning compatibility run), 12/12 targeted desktop/mobile browser cases, explicit staging release build and both dependency audits passed. The previous full attempt was 76/78 due to an obsolete AI topic fixture; the final 80-case suite is required in CI. Final CI/deployment evidence is maintained on PR #16.

## Fourth workstream — report PDF and Drive boundary

See [INSTRUCTOR-RECORDS-DRIVE-20261030.md](INSTRUCTOR-RECORDS-DRIVE-20261030.md) for the actual capture bug, blank-PDF and clipping corrections, identity/consent guards, regression history and acceptance limits. No real-account Drive success or whole-Instructor completion is claimed. Final source test and deployment evidence is maintained on PR #16.

## Fifth workstream — source-based workplace guidance

See [INSTRUCTOR-WORKPLACE-GUIDANCE-20261030.md](INSTRUCTOR-WORKPLACE-GUIDANCE-20261030.md) for the source → reviewed draft → explicit publication → Student example flow, real concurrent-session conflict correction, authentication/context boundaries, optional AI limitations and failure history. This work changes the existing form, not role authority or Student assessment rules. Exact tests/CI/publication status are recorded in PR #16.
