# Reviewed Instructor year planning — 30 October 2026

Scope: existing PR #16 and its development branch. This is staging prototype work, not whole-application or production acceptance. Instructor remains the current workstream; Student and the other roles follow after Instructor acceptance.

## User workflow

1. Sign in as an assigned Instructor and select the correct Trade / Session / Batch workspace.
2. Open **Year Planning / Split-up → Import / Calendar**. Load the current syllabus, or download and fill the blank Excel template. Separate **Theory** and **Practicals** sheets contain Sr No., official exercise number, name, required hours, and optional unit/module. The Instructions sheet is ignored by the importer. Existing template headings from earlier commits are also accepted.
3. Import and review the topic types, numbers, titles and hours. Import does not change the register. Unknown hours from readable text/PDF must be supplied by the Instructor. Scanned-PDF OCR is not implemented.
4. Enter session dates, separate Practical/Theory hours (new defaults **5 + 3**), working weekdays, Saturday policy, and reviewed government/institute holidays for every year in the session. Published future holidays are not invented.
5. Generate a preview. It shows capacity, hours required/allocated/remaining, finish dates, retained topics and plan-review warnings. Unused Theory hours never transfer to Practical or vice versa. A partially scheduled topic has no claimed finish date.
6. Explicitly **Save / Revise Year Plan** while online. Changing settings, imported topics, account, workspace or source records invalidates a reviewed preview. Offline preview/printing do not provide an authoritative offline save.
7. Use the saved split-up schedule in day/week/month view, optionally filter a month, and print the selected view to landscape PDF. Student sees the saved day-wise schedule with read-only controls.

## Preservation and concurrency

The authenticated backend recomputes the calendar with the same shared calculator; it does not accept a client calendar or revision counter as authority. The transaction rechecks active assigned Instructor membership and the workspace source fingerprint. Principal, Staff, Student, foreign Instructor and owner-without-an-assigned-Instructor membership cannot invoke this save.

A transaction writes the changed public topic/calendar documents, current plan metadata and a server-authored `planningRevisions/rNNNNNN` record atomically. Repeating identical reviewed input returns the existing managed revision. Concurrent different saves with the same source hash cannot both succeed. Each revision archives its previous topic scheduling fields; the first managed revision also archives a pre-existing legacy calendar. Legacy local history is retained in existing metadata.

Existing topic document IDs, internal numbers, official `sourceNo` values, teaching completion/status/dates, saved lesson/demo plans, materials, trainee links and unmatched topics are preserved. The import never deletes a topic. A new official number that ambiguously matches an existing topic is refused. Protected topic names cannot silently change. Changed required hours retain a saved plan but flag it for Instructor review. Marks, attendance, trainee records and login identities are outside this operation.

Bounds: 500 input topics, fewer than 1500 calendar days, 200 KB HTTP body, maximum 450 atomic document writes and conservative 900 KB metadata/history document checks. A larger import fails before writes; it is not silently split into a partially saved plan. The operator must reduce its size or design a reviewed larger-plan migration. Planning calculations and structured Excel parsing need no AI request or key.

## Integration with other Instructor work

The development branch advanced while this work was being validated. Its trainee Excel/CSV preview/import, safe roster rendering, disabled sample/clear-all actions and removal of V15 legacy PIN issuance were retained. Duplicate syllabus download buttons and competing local calendar-save paths were consolidated. The root legacy shell fails closed for year-plan writes; the secure V15 route is required. Legacy parser/preflight helpers remain for compatibility and their independent tests, but do not bypass the authenticated V15 save.

The local XLSX fallback is pinned SheetJS 0.20.3 mini with its license and byte hash recorded under `assets/vendor/README.md`. It supports the supplied XLSX template. Legacy XLS requires the full existing online parser or conversion to XLSX. Formula cells are rejected from reviewed syllabus imports. Raw workbook data stays in the browser; the save sends the reviewed public syllabus and settings, not a student roster.

## Scoped rule review

Current plan metadata and revision counters cannot be created, changed or removed by a Firestore client. Immutable history is readable only by existing authorised instructional/management roles in its workspace; Student, Staff, foreign and anonymous history reads are denied. All client history writes/deletes are denied, including owner writes. Valid unrelated profile updates and Principal workspace creation remain allowed. The Admin SDK bypasses rules, so the backend transaction's membership, input and size checks are essential.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for the year-planning boundary because clients cannot forge plan metadata/history, saves recheck assigned Instructor membership, and source conflicts fail before writes. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

This scoped review is not an exhaustive audit of all legacy collection paths or production IAM. Production MFA/recovery, a complete disaster-recovery restore and third-party integration acceptance remain separate work.

## Validation and deployment record

- Combined local `npm test`: **337 native tests plus repository regression scripts passed**.
- Combined local `npm run test:rules`: **all seven emulator suites passed**, including year-planning concurrency, source conflicts, immutable history, role denials and membership revocation between initial authorization and the actual transaction.
- The first combined native command failed an existing Quick PIN assertion that used a fixed 110 ms sleep around PBKDF2. It now waits for completion with a bounded timeout without reducing the derivation work or changing the security behavior. Another pre-existing incoming test omitted the `uid` fixture needed for manual trainee creation; its isolated fixture was corrected.
- The first combined browser attempt could not launch Chromium because this resumed environment had no installed Playwright binary. It was stopped and the browser was installed; it is not counted as an application pass.
- The first complete combined browser run was **76/78**. Both failures were the same obsolete AI preview fixture referencing a topic absent from the register; the stale-topic guard correctly denied it. The test now opens the actual registered theory topic through the real draft action. No permission check or expectation was removed.
- Final focused desktop/mobile browser run: **12/12 passed (1.2 minutes)**, exercising registered lesson JSON errors, complete demo preview, atomic calendar save/replay/fresh Student view and landscape PDF, real Excel import, CSV roster persistence, and imported alphanumeric exercise buttons. An initial focused run exposed two fixture/assertion errors: its independent seed had no theory topic, and a new textarea assertion checked text content instead of its value. Both were corrected; the real controls and security checks remain unchanged.
- Final full combined **80-case** browser suite, container smoke and all CI checks must pass on the published commit. Latest CI/deployment evidence is recorded in PR #16; focused checks are not whole-application acceptance.
- Explicit staging release build: **67 public files**, backend/tests/credentials excluded. Production and development-inclusive dependency audits: **zero advisories**. The vendored parser is separately pinned/tested; it is outside the npm audit. CI container smoke remains required (Docker is unavailable locally).
- Firebase Hosting/rules: not deployed by this environment. The authenticated Firebase CLI/Google Cloud operator session is not available here. Existing staging is not evidence that this new UI is live.
- Existing Render Free staging backend: deployment pending publication and passing CI. No new service, paid tier, API-key configuration, production change or data migration is part of this work.

## Still pending in Instructor scope

Scanned PDF OCR; authoritative individual lesson/demo-plan history; secure optional personal-provider configuration; source-backed practical-to-industry guidance and Instructor review; records/PDF/Drive account-bound acceptance; actual supplied MCQ file acceptance; and final whole-Instructor acceptance. Today’s teaching buttons and the topic picker now use exact string exercise identifiers, safe DOM content and stale-context checks. Optional syllabus AI prepares a reviewable prompt before any provider request, retains source numbers and leaves unknown hours blank. The calendar itself is deterministic and does not need generative AI. Existing modules are not automatically accepted because navigation was grouped.
