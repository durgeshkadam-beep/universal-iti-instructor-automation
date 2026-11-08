# Instructor records / Drive correction — 30 October 2026

Scope: existing Instructor Records & Backup workflow in PR #16. Existing print/report forms, original institute/author details and other role menus are retained. This is a frontend correction; no database migration, Firebase permission grant, server configuration or paid resource is introduced.

## Actual defects and resulting behavior

The legacy CloudCenter capture wrapped `Reports.doPrint`, but the V15 safe-report installer replaced that method. Consequently Drive could miss the actual generated preview or use an older raw HTML string. Report capture now happens inside the sanitised print boundary. Drive receives a cloned, sanitised document for the current Firebase identity, project, institute, workspace, role and loaded DATA instance. Legacy raw capture is disabled.

Changing accounts/workspaces/roles, loading a workspace, failed loads, invalid print attempts or generating another report invalidates its snapshot. PDF conversion and upload recheck that snapshot after asynchronous work. Student and Staff cannot export institutional reports through these handlers. Native browser Print / Save as PDF remains available without Drive or the PDF helper.

Actual visual review found a second defect: the old off-screen fixed positioning created a valid-looking **blank PDF**, despite passing byte-count and page-orientation checks. The conversion stage now uses visible relative positioning and the converter's available page width, then is removed. Attendance uses landscape, wraps metadata and fits all day/summary columns. The browser regression now inspects real converter canvas pixels as well as the actual PDF bytes/MediaBox. Desktop/mobile PDFs were rendered for visual inspection with Poppler; this is not a claim about Google consent or an upload to a real Drive account.

## Drive consent and isolation

- Drive consent is separate from Firebase sign-in. The instructor chooses the Google archive account explicitly. This release does not claim it is the same mailbox as the institute login.
- The existing `drive.file` scope is retained, without additional granted scopes. Token expiry is checked; access tokens stay in memory. They are not written into local/session storage, reports or backup files. Expired/late/foreign consent cannot authorise the current upload.
- Public OAuth client ID and folder-name settings are stored under project/institute/UID/workspace scope. Unverified legacy global folder IDs are ignored. Folder IDs are cached only in memory for the current consent grant and workspace; a new consent grant clears them. Users can select an accessible existing folder by entering its ID after connecting. Automatic folder deduplication across grants is not implemented.
- Uploads recheck the original account/workspace and the exact consent object before and after folder creation and requests. Gallery archive iteration also rejects context changes after reads and uploads; it cannot continue copying an old workspace's photos into a newly selected workspace.
- Only the expected Google Drive files endpoints receive bearer tokens. API errors expose HTTP status, not returned private response bodies. Requests have a bounded timeout. Direct multipart uploads are capped at 5 MB; larger files require download/manual upload. The app does not automatically retry uploads.
- Report upload asks for explicit confirmation because a report can contain trainee records. Duplicate clicks are guarded. An interrupted request may already have created its original folder/file; no deletion or rollback is attempted. Inspect the original archive before retrying an uncertain upload.

The optional PDF converter is the existing html2pdf.js 0.14.0 bundle, loaded only on demand with a pinned SRI hash. CI uses the identical hash-verified bundle for actual conversion; Google OAuth and Drive HTTP are mocked there. This separately loaded client dependency is outside the npm advisory scan. Its SHA-256 is `9563c45f032179c73454293a649929e60fc24c05a326e8ab2811cfa8f25c3607`.

## Validation record

- Initial targeted run: 25/25 report/Drive unit tests and 6/6 selected desktop/mobile report cases passed. Those assertions alone did not detect a blank PDF; visual inspection did. They are not presented as final PDF acceptance.
- A subsequent pixel-check attempt failed because the test hooked a transient Worker instance rather than its prototype. The real converter prototype is now inspected; assertions were not weakened.
- Final PDF-focused run: 2/2 desktop/mobile cases passed with actual non-white canvas pixels, landscape PDF bytes, mocked upload confirmation and stale-workspace denial. The right-edge clipping found in visual review was corrected by using the converter's available width. Desktop and mobile renders show the complete institution header, Instructor, day columns, Working and P% columns, and signature lines.
- Final focused report/Drive unit run: 26/26 passed, including denial after a failed workspace load and the late-gallery-read guard.
- Complete local native command: **347 tests plus repository regressions passed**. All **seven emulator suites passed**. An explicit staging release build produced **68 public files** while excluding backend, test and credential files.
- Full local **82-case** browser run and final published-commit CI are in progress at publication; final results are recorded on PR #16 after completion. Passing earlier focused cases is not a substitute for those checks. CI container checks and both dependency audits remain required.

## Deployment and acceptance limits

The existing backend remains at tested commit 333b4a6 with `yearPlanning: v1`; this frontend change needs no new backend deployment. Firebase Hosting still needs an authenticated operator session. If the earlier year-planning rules are not yet deployed, publish both Hosting and the staging rules with `firebase.staging.json` to `universal-iti-dk-staging` only. The precise tested commit and final command are recorded in PR #16.

Real Google OAuth client/origin/Drive API configuration, account consent, accessible folder permissions and a real upload/download round trip have **not** been accepted in this environment. These require the intended operator account. No real trainee data or real Drive account was used for tests. A report PDF is not a restorable institution backup; the existing training-only JSON backup still excludes student records, attendance, marks, exams, Auth/MFA and external file bytes. Production MFA/recovery and full disaster recovery remain outstanding.

## Primary API references checked

- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/identity/oauth2/web/reference/js-reference
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/workspace/drive/api/guides/folder
