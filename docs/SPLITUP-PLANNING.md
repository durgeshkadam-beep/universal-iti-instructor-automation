# Split-up planning verification — 28 October 2026

The original implementation was not fully integrated. Six new executable regressions failed before correction: saved complete plans displayed the bundled DTPO calendar instead, India dates shifted backwards, teaching days disappeared across holidays, saved markup was not safely rendered, read-only handlers changed in-memory plans, and interleaved source sequences assigned dates to the wrong topic numbers.

## Corrected behavior

- Syllabus AI → Generate Working Calendar → Create Complete Training Plan saves the day allocations in existing workspace metadata. Split-up and its print report read those saved allocations. Practical/theory numbers and their planned dates agree even when the imported source interleaves the two types.
- Generation recalculates changed inputs before saving. Invalid hours/dates and an empty working-weekday selection cannot reuse an earlier calendar. A zero theory-hours setting is retained; practical work is allocated first and theory uses later available days. Partially allocated topics are explicitly disclosed before confirmation and after saving.
- Alternate Schedule keeps practical hours/day and theory days/topic as separate allocations; it is not a combined daily-hours budget. It uses UTC date-only arithmetic, excludes Sundays and saved holidays, and retains every working day needed by a multi-day topic. It warns when dates exceed a configured session end.
- The bundled 2026–27 DTPO calendar remains available only for matching DTPO workspaces. It is labelled as bundled and requires review against institute dates; it is not an official calendar for unrelated trades.
- Schedule mutation handlers require Instructor role. Complete-plan confirmation rejects a changed workspace/account. Firestore remains the authority for permissions; no rule or role changes are included.
- Topic titles and holiday labels render as text in the calendar and are escaped in the print report. The safe print boundary retains a fixed split-up layout class, yielding A4 landscape output with unbroken dates; arbitrary saved style/script content remains stripped.

## Validation and release boundary

Thirteen focused native regressions pass, including India timezone, holiday continuation, interleaved mapping, invalid input, stale context, partial allocation and inert print content. The full local native suite passed 213 tests and its additional regression scripts. Browser acceptance is included for desktop/mobile: save to actual Auth/Firestore emulators, fresh Instructor login, a fresh Student session, read-only Student handlers, mobile containment and a real Chromium PDF. Initial local launches exposed missing Java 21 and Chromium; both have now been installed from official distribution sources for local testing. All three real Auth/Firestore/backend emulator suites passed. The full desktop/mobile suite passed 56/56 cases in 4.4 minutes. A final print-layout correction and stricter copied-DTPO-pack check were then validated by 29 focused native tests and 4/4 desktop/mobile report/split-up cases (25.5 seconds). The split-up cases verify actual emulator cloud persistence, a fresh Instructor login, a fresh Student calendar, read-only Student handlers and a real A4 landscape PDF. Independent PDF inspection confirmed one landscape page and unbroken dates, including the holiday and next working day. The published-source CI result is recorded below.

Use synthetic data only. Creating a complete plan replaces the existing syllabus/modules and planned dates after confirmation; review and export relevant training resources first. Trainee and attendance records remain in their existing collections. Generation itself is deterministic and does not need an AI key or consume provider requests.

Hosting deployment and hosted acceptance remain pending. Publishing a commit or passing emulator tests is not a staging deployment. Do not deploy production rules, merge main or change paid resources for this check.

## Publication and CI status

The user explicitly approved retaining the existing embedded name/institute details in the public project source on 28 October. Application source `6fb49a5991ee4f3d1ebb5238a8d796f5fe0a56be` is published in the existing development branch and draft PR #16. [CI 40642886538](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40642886538) passed all required steps on that source: 213 native tests, all three emulator suites, all 56 desktop/mobile browser cases, build, container smoke and both dependency audits. This resolves the publication block; Hosting deployment and hosted acceptance remain pending. No production deployment or merge to main was made.

## Manual staging acceptance after publishing

1. Publish Hosting only to `universal-iti-dk-staging` after the committed source passes CI; verify fresh asset hashes and reload the page. The current live site does not contain this correction.
2. In an authorised synthetic Instructor workspace, review a syllabus in Syllabus AI, set session dates, working weekdays, daily/theory hours and institute holidays. Generate the working calendar and review remaining topics.
3. Create Complete Training Plan only after reviewing its replacement confirmation. Wait for actual synchronization, sign in afresh, and open Split-up Syllabus. Check the same first/last topic allocations and holiday continuation.
4. With an independent authorised synthetic Student, open Training Calendar and verify the same shared schedule with no scheduling controls. Never promote the Instructor account for this check.
5. Print Split-up Syllabus / Save as PDF, checking institute details, landscape layout, complete date text, holidays, topic numbering and signatures. Emulator PDFs are not proof of intended-device printing.
