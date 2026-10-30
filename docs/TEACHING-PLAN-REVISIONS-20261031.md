# Lesson and demonstration plan revisions

This is an Instructor workstream on PR #16, staging only. The date identifies the continuing workstream, not a promised release time. Institute details, original topic numbers and physical Firestore document IDs are retained. It does not constitute whole-app or production acceptance.

## Defects and resulting behavior

Previously a manual or reviewed AI/JSON save overwrote a topic directly, without authoritative history or protection from a stale editor. Procedure tables were normalized to arrays inside arrays, which Firestore cannot persist. Browser-only preview could therefore appear successful while a fresh login lost the plan.

V15 now saves through the existing authenticated backend. It requires an active assigned Instructor, checks current membership and workspace inside the transaction, compares the complete topic hash, and writes the current plan and immutable revision together. A conflicting save leaves the editor text available. Equivalent retry requests do not create duplicate revisions. No AI key, provider call, new hosting resource or paid service is required.

Procedure tables persist as rows of named text fields and render after a fresh cloud read. Manual text-section edits retain existing procedure rows and unrelated materials/completion fields. Reviewed full JSON replaces the plan only after the existing review action. Server metadata distinguishes instructor editing from reviewed JSON; it does not prove that an AI provider generated the text. Changes reset prior approval unless the Instructor explicitly approves the reviewed replacement.

Version history displays the latest ten revisions and their previous plan JSON. First adoption archives the current legacy plan and its metadata. Earlier unsaved or overwritten versions cannot be reconstructed. A topic context label warns when number/title/unit/hours no longer match the saved plan context. History is not a historical PDF snapshot of bundled official curriculum.

## Offline and ordinary edits

Verified plan publication requires an online backend save and fresh readback. Old queued plan edits are retained and marked pending instead of replayed over cloud history or displaying the old approval as applicable. The review panel compares current cloud JSON, offers draft download, and explicitly publishes a reviewed recovery as a new revision. Only the consumed plan intent is removed after successful readback; other queued fields remain. A queued create without an existing topic needs operator review.

Ordinary topic edits merge only fields actually changed by that operation, preserving current server plan state. Conflicting changes to the same field are retained for review. Later operations from the same user's queue advance their baseline after an earlier operation succeeds; this permits successive completion-date corrections without losing unrelated concurrent changes.

## Data and permission boundaries

History lives under `institutes/{institute}/workspaces/{workspace}/{practicals|theory}/{topicId}/teachingPlanRevisions/rNNNNNN`. It uses a revision-descending, latest-ten query and no collection-group index. The backend resolves membership transactionally and uses the original physical topic ID; the client rejects missing or duplicate topic numbers rather than choosing an arbitrary match.

Client rules reject history creation/update/deletion, protected plan changes, counter forgery/removal/reset, and deletion of a managed topic. Management history reads require the workspace and parent topic. Student, Staff, foreign-workspace and anonymous reads are denied. Students retain existing access to current public teaching topics; no private trainee record is added to plan history.

Unversioned legacy topic creation/import remains compatible and does not attest history. Managed-topic deletion is intentionally blocked, including in the UI. Use ordinary topic edits or workspace archiving. JSON training backups contain current training resources, not revision subcollections; restoring a missing managed topic without its history is refused. Full history restoration requires an operator backup/recovery workflow. This is a scoped rules change, not a full audit of every legacy topic field or all application rules.

## Validation and failure history

Native validation currently passes 388 tests. Two desktop/mobile queued-draft recovery cases pass. Final complete emulator/browser results and CI links are maintained in PR #16, not inferred from focused checks.

Actual failures corrected during this workstream:

- The emulator rejected nested procedure arrays. Input validation now converts tuple-shaped rows to Firestore-safe objects, with fresh-login rendering coverage.
- A first focused browser save encountered an already-running sync. Publication now waits for current sync within a bounded period, retains the draft on failure, and disables repeat save controls.
- The first complete browser run passed 88/92. Two failures came from test identity fields that were not restored after an AI-preview fixture; only those synthetic workspace fields are now restored. Two exposed causal queue baseline handling during consecutive completion-date corrections, fixed in production code and regressions.
- Recovery test assertions initially observed local draft content before server completion, and a mobile fixture reused the date saved by desktop. They now wait for the cloud revision and use a genuinely different valid date. These failed attempts are not counted as passes.

The emulator attack matrix covers anonymous/Student/Staff/foreign access, history reads and immutable writes, direct topic plan/counter forgery and deletion, malformed protected state, missing parent, stale and concurrent saves, duplicate retry, revoked membership, privileged-role bypass, archived workspace, original physical IDs, ordinary field preservation, and the actual client query shape. Tests use synthetic accounts and emulator data only. Native tests cover context changes, retained editor drafts, object-row rendering, causal queue advancement and backup refusal.

## Release and remaining acceptance

Deploy and verify the existing staging API first, including `teachingPlans: v1` at `/security-version`. Then deploy Hosting and Firestore rules together to `universal-iti-dk-staging` with `firebase.staging.json`, pinned to the validated commit. No production deployment or main merge is authorized here. The Work environment has no authenticated Firebase CLI/operator session, so a prepared command is required if that remains unavailable.

Passing emulator tests does not prove real-account MFA/recovery, provider quota or AI generation, actual Drive OAuth/upload, all five roles' final live acceptance, OCR, full disaster recovery, or a production launch. These remain separate workstreams. Do not print credentials, run write tests against original trainee data, or describe current-record JSON/PDF exports as complete backups.
