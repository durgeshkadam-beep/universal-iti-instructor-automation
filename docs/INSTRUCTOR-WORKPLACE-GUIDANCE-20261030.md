# Instructor workplace guidance — 30 October 2026

## Result and purpose

The existing **Skills & Workplace Use → Workplace use & sources** form now helps an Instructor explain where a selected practical is used, starting with an original HTTPS link and supporting excerpt. It adds no new menu, source catalogue or supposed live labour-market facts. Student assessment remains separate: a shared workplace example is not verification of an individual Student's competence.

Manual publication still works without an AI key or excerpt. The optional expandable assistance supports English, Marathi and Hindi prompts: review/copy the prompt, paste a complete JSON response, preview it as plain text, compare claims with the source, explicitly copy it into the editable form, and explicitly publish after review. Missing evidence, wrong source/practical, unexpected fields and invalid JSON are rejected; pasted text remains editable. Source/excerpt/language changes invalidate old previews. Only the existing seven reviewed application fields are published; excerpts, prompts and raw responses remain in the open form, not Student records.

An explicit availability button uses the existing authenticated backend's `capabilities` action, without calling a model. Optional generation uses the existing `ai` / `career` action and existing server-side provider configuration, consent and quota. There are no browser keys, new paid resources, provider changes or automatic generation calls. Configured does not mean healthy or under quota. Errors/disabled guidance retain existing pasted text; manual mode remains available. A real generative provider has **not** been accepted by these tests; provider-success/failure branches use controlled mocks.

The prompt includes only selected practical/title, trade, original link, excerpt and chosen language. It does not automatically include trainee/institute account records. The Instructor must exclude personal data from their own excerpt and review the prompt before sending. A quoted source is not independently fetched or semantically verified. An Instructor's source review is still necessary; no vacancy, employer relationship, demand statistic or certification is inferred.

## Actual defects corrected

- The previous publish handler used unconditional `setDoc`, allowing an older open session to silently replace a newer reviewed example. It now remembers the exact loaded document state and uses a Firestore transaction. Conflicts keep unsaved form edits, prevent another blind publish and offer an explicit reload with discard confirmation.
- The old context check omitted institute, database and superseded render identity. Publication, capability results and draft responses now check these along with role, UID, workspace, loaded DATA reference, selected practical/title and current preview context. The intended source document reference is captured before asynchronous work.
- Publication is disabled until the existing record has been read. Failed reads do not become implicit creates. Double clicks cannot start duplicate publish requests. Confirmation-time input changes and context changes during transactions are rejected.
- Form controls previously flowed inline with narrow default inputs. The existing field layout now gives each label/input its own row, uses full-width text areas and keeps draft-review actions beside the pasted response. Desktop/mobile containment and screenshots are checked.

The Firestore schema and rules are unchanged; the existing assigned-Instructor-only review policy and Student read-only access remain authoritative. This client transaction avoids accidental stale-form replacement; it does not turn a reviewed source into independently verified industry evidence or provide an immutable audit history. No real trainee test write is performed.

## Validation and failure history

- Fifteen native DOM/security/async regressions cover explicit publication, failed reads, institute/database/render switches, transaction context changes, conflicting reviews, duplicate clicks, edited confirmations, all three prompt languages, invalid/unsubstantiated JSON, source mismatch, XSS-safe preview, disabled AI, consent, stale provider replies, quota failures, late reads, draft discard consent and Student exclusion.
- The first native attempt was 13/14: a test incorrectly reused a disabled form after an institute switch. Quota and stale-context tests were separated into fresh independent scenarios; both are retained. This is not counted as an initial pass.
- The first focused browser attempt was 2/4: both source-to-Student cases used a text-content assertion on a textarea whose correct response was in its value. The assertion now checks the actual value. The real concurrent-session cases passed on that first attempt. The subsequent complete focused run passed 4/4 on desktop/mobile with actual Firebase Auth/Firestore emulators.
- The source-to-Student case verifies no publication during preview/apply, no generation request in keyless mode, unchanged Student skill verification, explicit publication visible in a fresh Student context, and denied Student modification. The concurrent-session case verifies the newer review survives and the older draft stays editable until explicit reload.
- Visual review then found the existing inline/narrow form layout; field wrappers and scoped textarea styling were corrected. Final native/full-browser/CI/build results and exact publication status are maintained in PR #16. No hosted release is implied by passing emulator tests.

## Demonstration flow

1. Instructor opens **Skills & Workplace Use → Workplace use & sources** and selects a practical.
2. Instructor enters a genuine source link. For draft help, opens the expandable guide and supplies a relevant source excerpt, choosing the desired language.
3. Instructor prepares/copies the prompt and previews returned JSON (or requests optional configured backend AI with explicit consent). Invalid/unsupported answers stay unpublished.
4. Instructor reviews and copies the draft into the main fields, then explicitly publishes the source-reviewed explanation.
5. Activated Student opens **Skill-to-Career Lens**, chooses that practical and reads the explanation and original source. Their individual skill verification and learning plan remain separate; this publication does not award a skill or promise employment.

Synthetic browser fixtures demonstrate software behavior only. A public demonstration should use a real reviewed source and accurately label optional AI as unavailable unless an actual provider request has succeeded.
