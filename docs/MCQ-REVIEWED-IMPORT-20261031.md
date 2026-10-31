# Reviewed MCQ files and transactional examination authority

Scope: Instructor-first work on the existing development branch and draft PR #16, staging only. Existing identities, institute details, workspace assignments and published tests are retained. No new dependency, AI provider, paid resource, Firestore collection, index or security-rule change is introduced.

## Working flow

Open **Secure MCQ Examinations → Advanced: publish a reviewed JSON question set**. Download the example, replace its questions and schedule, then select a `.json` file or paste JSON. Click **Preview JSON question set**, check each question, correct answer and local opening/closing time, tick the review checkbox and explicitly publish. Preview/file loading makes no backend write. Editing the input invalidates its old preview and consent. A failed publication retains the reviewed JSON for retry with the same immutable test ID.

The example is generated locally with a unique test ID. The file accepts exactly `id`, `title`, `durationMinutes`, `opensAt`, `closesAt` and `questions`. Each question accepts `text`, `options` and zero-based `correctIndex`. The help explains that `0` is the first option, `1` the second, and so on. Each question carries one mark. Weighted marks and Word/PDF/Excel question files are not silently converted. Limits are 150 KB, 1–100 questions, 2–6 options, 1–180 whole minutes, and the existing backend text bounds. The review shows device-local times; stored schedule timestamps remain absolute Unix milliseconds.

The existing manual form remains available. Both paths share an in-flight publish guard. Repeated clicks cannot start a second concurrent publication from the same view. Published IDs remain immutable. No answer-key or question-draft persistence in browser storage is added.

Preview text and file contents use text nodes rather than HTML. A late file read cannot replace a newer pasted draft, a newer file, or a changed account/workspace view. Examination controls now also capture the institute, database and API endpoint, supplementing the existing account, role, workspace, render and load-generation guards.

## Actual defects corrected

The old advanced publisher sent raw parsed JSON directly without a required preview/review or a file/template workflow. Extra weighted-mark fields could be ignored by the one-mark backend while the Instructor assumed a different total. The new import rejects unsupported fields explicitly and displays the authoritative one-mark total.

The old backend checked authority before starting its publish/start/submit transaction. An Instructor's role/assignment or a Student's membership could change after that read, while the transaction continued using cached authority. Examination transactions now reread the institute, current membership, workspace and, when applicable, server-managed Google delegation. Archived workspaces are rejected. The current root-owner/Principal/assigned-Instructor publishing policy is retained; no client-selected role grants authority.

New Student sessions use the current trainee link read within the transaction. Existing sessions/results must still match the requesting UID and current trainee link; relinking cannot transfer an old attempt to a replacement trainee. Expired attempts cannot be resumed as if they were still answerable. A schedule that closes during publication is rejected before writing a test or private key. Official scores, deadlines, immutable results and private answer keys remain server-owned.

The public `/security-version` endpoint advertises `secureExams: v2` for deployment verification. That marker denotes implementation support, not real-account acceptance or production MFA enforcement.

## Validation scope

Initial focused native validation passed 35 tests, including file validation, inert preview rendering, explicit review, altered/expired preview rejection, retry retention, duplicate-click prevention, delayed file reads, unsupported-file retention and six stale identity/context variants. The full native command subsequently passed 401 Node tests plus standalone static/syntax contracts; final same-source exit status is recorded on PR #16.

The actual Firestore Emulator reproduces authority changes between initial authorization and the examination transaction: disabled membership, changed roles/assignments, moved root ownership, revoked Google delegation, archived workspace, current/changed trainee links, expired resume and a schedule closing during publication. Denied actions leave no public test, private key, session or result, as applicable. Root/delegation tests preserve legitimate residual Instructor authority rather than treating grant revocation as removal of all roles.

Six focused desktop/mobile Auth/Firestore/HTTP cases passed (30.2 seconds): existing manual publication, obsolete-control rejection, and the new example download → actual JSON file upload → safe preview → simulated network failure/retry → fresh Instructor login → Student server grading flow. The Student cannot read the private key, public exam JSON contains no `correctIndex`, and markup-shaped questions remain inert. A mobile visual review found an inline file-label/review layout issue; labels/buttons now occupy separate readable rows. Final full eight-suite emulator and 96-case browser results are recorded on PR #16 after running against that final source.

All examples and tests are synthetic. The user's own MCQ file has not been supplied and is not claimed as accepted. Real-account sign-in, Drive consent/upload, provider acceptance, OCR, production MFA/recovery and full disaster recovery remain separate limitations.

## Deployment and environment

Deploy the existing approved Free Render staging API, then Hosting to `universal-iti-dk-staging` with `firebase.staging.json`, pinned to the validated commit. Existing rules are unchanged. No production or main-branch change is authorized by this workstream.

Live Firestore edition discovery was attempted through the existing CLI but authentication was unavailable. No database was created or reconfigured; development continues against the existing Admin SDK paths and the repository's Standard-edition emulator. Staging CLI access and live edition readback remain operator/environment limitations, not reasons to relax rules or grant IAM permissions. Exact commit, CI and deployment status are maintained in PR #16.
