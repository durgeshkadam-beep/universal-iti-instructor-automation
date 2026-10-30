# Instructor improvements — 30 October 2026

Work order agreed with the user: Instructor, then Student, then Admin/Principal, then Staff. Existing identities, institute details, authorised records and stable topic/trainee identifiers are retained. Staging only; this is not production acceptance.

## Completed first workstream

- Dashboard compares scheduled topic finishes with teaching marked complete. Separate practical/theory cards show expected position, completion count and overdue incomplete work. Completing a later topic cannot cancel an earlier backlog. Multi-day allocation finishes, partial allocation warnings, invalid dates and India calendar dates are handled explicitly. Saved AI drafts are not counted as teaching completed.
- Instructor practical/theory registers have readable red overdue, green completed, amber upcoming/due-today and grey unknown-finish statuses. Desktop rows become mobile cards. Edit, move and delete remain available in accessible More actions; topic IDs and mutation handlers are retained.
- Evaluation sorts practicals by sequence/natural exercise number and trainees by natural roll number, displays serial/roll/name separately, preserves selected practical and unsaved inputs on refresh, validates marks and rejects stale workspace/record saves. Names and submission links are rendered safely. The existing 35-mark criteria remain unchanged.
- Attendance shows only the selected year-month's saved holidays, with date/day labels. Year planning retains the complete holiday collection. Monthly submission context follows the selected attendance month and asynchronous context changes are guarded.
- Plan Training opens the saved split-up schedule rather than Module Manager.

Validation on the working source: 289 native Node tests passed, regression scripts passed, and 16/16 selected desktop/mobile Auth/Firestore emulator browser cases passed. Browser coverage includes all five role route/containment checks, actual syllabus form save/cloud reload, hostile fields/stale completion dialogs and the new Instructor progress/evaluation/holiday flow. Mobile practical cards were visually inspected. Initial browser execution could not launch because Chromium's headless binary was still downloading; it is not counted as an application test pass. The complete rerun passed after installation. No rules/backend/auth provider changes were made in this workstream.

## Remaining Instructor workstreams

1. One year-planning/split-up menu, explicit Excel theory/practical templates and import review, 5+3 separate configurable capacities, stable numbering/non-destructive revision, day/week/month print views. Scanned PDF OCR requires a reviewed extraction path; do not claim it exists yet. Holiday coverage needs every session year.
2. Combine skill verification and source-backed workplace applications without merging assessment evidence. Keep AI suggestions unverified until Instructor review.
3. Consolidate records/inspection/report/Drive functions; fix account/workspace-bound PDF capture before certifying Drive backup. PDF exports are not restorable institution backups.
4. Restore generic trainee bulk import with template, duplicate preview and stable IDs, independent of Firebase login provisioning.
5. Honest AI connection status and nearby JSON/manual help. Instructor-owned API keys require protected server storage and deployment/configuration; do not store keys in browser storage or public code. Concurrent plan revisions need authoritative transaction tests.
6. Final Instructor module acceptance, including an actual supplied MCQ test file and real-account Drive consent/printing. Accepted existing modules should not be redesigned unnecessarily.

No Firebase Hosting deployment was performed by this Work environment. A working authenticated Firebase CLI/operator session is not available here. Existing staging remains a previous release until the tested commit is deployed. No production deployment, main merge, real-student test write or credential publication is part of this change.
