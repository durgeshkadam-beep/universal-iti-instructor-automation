# V14 — Modern UI + Free AI + Cloud & Drive Safety

**Concept & Developed by Durgesh Kadam, Craft Instructor — DTP / DTPO**

V14 keeps the app local-first but adds optional Firebase/Firestore synchronization, Google sign-in, Google Drive backup/report archiving, schema-versioned data migration, and pre-upgrade/pre-import safety snapshots. Existing V13 records can migrate without deleting trainee/attendance/plan data.

## Free-mode architecture

- Local browser data remains available without any account or payment.
- Optional Firebase Spark/Firestore can sync structured records between devices after the instructor configures a Firebase Web App and Google Authentication.
- Google Drive integration requires a Google OAuth Web Client ID and Drive API to be enabled. The app requests `drive.file`, so it is limited to files it creates/manages through the app.
- Gallery image binaries remain local in V14; use Drive backup/archive for file storage.
- Reports can be printed normally. After a report is generated, Cloud & Drive can convert the last generated report to PDF in the browser and upload it to the configured Drive folder.

---

# Universal ITI Instructor Automation — V13 Modern Workspace + Free AI

V13 is a visual/workspace upgrade over the V12 Free AI + Calendar build. The working syllabus, attendance, AI, calendar, Lesson Plan, Demonstration Plan, evaluation, inspection and print logic is retained, while the UI is redesigned for daily instructor use.

**V13 UI changes:** modern split-screen login, persistent desktop sidebar, cleaner white utility header, wider workspace, improved cards/tables/forms/modals, clearer AI emphasis, and refreshed mobile styling while preserving bottom navigation. The print layouts are intentionally unchanged.

**Core free automation retained:** optional Gemini free-tier API connection, no-key Manual AI fallback, syllabus Theory/Practical analysis, calendar-aware hour allocation, Today’s Teaching, AI Lesson/Demonstration drafts, instructor approval, full plan View/Print, staff PIN validation, and DTP-only reference-plan isolation.

**Current limitation:** this remains local-first. Production multi-device use still needs a cloud database/backend; scanned/image-only syllabus OCR is not included in this static free build.

# Current package — Full Plan Viewer / Print Fix

This package fixes Lesson Plan and Demonstration Plan viewing/printing. The app now contains the complete 58 Lesson Plans and 119 Demonstration Plans extracted from the supplied reference DOCX files. View Plan shows the full A4-style document, and Print/PDF renders the selected plan rather than a sample placeholder. The service-worker cache is also refreshed so older broken files are not reused.

# Universal ITI Instructor Automation — V7

V7 adds a mobile-first navigation shell and documents the recommended free cloud architecture (Firebase + Gemini Developer API + optional Google Drive archive).

**Important:** V7 is still local-first. Firebase is not connected until you follow `docs/FREE-CLOUD-SETUP.md`.

# DTPO Training Register — v1

Built for: Durgesh Kadam, Craft Instructor (DTP Trade)
Bharat Ratna Dr. Babasaheb Ambedkar Government ITI, Mumbai-01

## What's new in this update (v16 — real 2026-27 calendar imported, theory-missing bug fixed)

**Theory was missing because of a real migration bug** — if your saved
data predated when the 58 theory topics were added, later updates only
patched *existing* entries; an empty array stayed empty forever. Fixed:
Theory now gets properly backfilled on load if it's empty.

**Practical dates now match your actual `DPO_LIVE_2026-27` file exactly**
— instead of approximating your day-allocation logic with a formula, I
imported your real, already-computed calendar directly (380 rows, Aug 2026
– Aug 2027, all 119 practicals + 58 theory topics + your actual 74
holidays). This is now the default. Split-up Syllabus tab →
**"Use Official 2026-27 Calendar"** applies/reapplies it anytime.

The old algorithmic generator is still there as **"Generate Alternate
Schedule"** — only useful if you reorder teaching sequence away from the
official order, since then the real calendar's day-by-day mapping no
longer applies.

**Existing saved data auto-corrects once** the next time you open the
app — planned dates and holidays get fixed automatically, no manual step
needed. This only happens once so your later manual edits won't keep
getting overwritten.

## What's new in the previous update (v15 — five fixes: CRUD, plan editing, mobile, certificates)

**1. Full Add/Edit/Delete on Practicals and Theory** — every row now has
Edit and Delete buttons (instructor only), plus "+ Add Custom Practical"
and "+ Add Theory Topic" for entries beyond the official 119/58. Deleting
an official DVET-numbered item shows a warning first since that's a real
record, not just app data.

**2. Plan content is now editable, and creatable from scratch** — "View
Plan" now shows an "Edit Plan" button (or "Create Plan" if none exists
yet — this is exactly how you'd fix Demo #78/#79, which didn't parse
cleanly from the source doc). Edits fully replace the plan content for
that item; students never see this screen regardless.

**3. Split-up Syllabus edit/create** — "Generate Schedule" is the create
path (unchanged). For edits: adjusting any Planned Date directly on the
Practicals or Theory tab now immediately updates the Split-up Syllabus
view — that's the intended edit mechanism, so the schedule always reflects
a single source of truth rather than having two places that can drift out
of sync.

**4. Mobile view fixed** — every table now scrolls horizontally on narrow
screens instead of getting clipped or squished (this was almost certainly
the main cause of "mobile not good, desktop ok"). Modals, cards, and
form rows also tightened up for small screens.

**5. Certificate seal removed** — the gold circle with the checkmark is
gone from both the Certificate of Participation and Project Completion
Certificate, per your request.

## What's new in the previous update (v14 — Split-up Syllabus + teaching sequence)
- **Teaching sequence, separate from official DVET numbering** — every
  Practical and Theory row now has ↑↓ buttons (Instructor only) to reorder
  the order you actually plan to teach them in. The official No. column
  never changes; only the row order (and therefore the schedule) does.
- **New "Split-up Syllabus" tab** — generates a real day-by-day schedule
  (Date / Day / Week / Trade Practical / Trade Theory) matching the format
  of your own week-wise split-up sheet. Set a session start date, hours per
  working day, and days per theory topic, then "Generate Schedule" — it
  walks your Holiday Calendar and teaching sequence to compute exactly
  which practical/theory falls on which date, including multi-day
  practicals shown as "Practice" on continuation days, and holidays marked
  accordingly.
- Every practical now carries its **official hours** (parsed from your
  Demonstration Plan document) — this is what drives how many working days
  each one consumes in the generated schedule.
- Generating a schedule also fills in the **Planned Date** field on every
  Practical/Theory item automatically, so the Dashboard roadmap and
  Practicals/Theory tables all update in sync — no separate manual entry.
- **Print Split-up Syllabus** (Reports-style PDF) from the same tab —
  legal-format, ready to file alongside your other registers.

## What's new in the previous update (v13 — real certificates, individual consent letters, full documentation)
- **Certificates redesigned** — Certificate of Participation (OJT/Industry
  Visit) and Project Completion Certificate now look like actual
  certificates: decorative double border, gold seal, certificate number,
  your institute logo — not the flat bordered box from before.
- **Parent Consent Form is now individual letters**, one per trainee,
  addressed personally (like the Takit Patra), instead of a single shared
  batch table.
- **Full documentation PDF** now available separately — deployment guide
  (GitHub Pages / Vercel / Netlify, step by step), PWA install instructions,
  first-time setup checklist, screen-by-screen usage guide with real
  screenshots, roles reference, backup guidance, and troubleshooting.

## What's new in the previous update (v13 — official logo, tab bar fix, OJT/Projects module completed)
- **Official DVET/Maharashtra emblem** now appears on every printed report
  header, the login screen, and the top bar — using the logo image you
  provided.
- **Tab bar fixed** — with 12 tabs now, the old horizontal-scroll-only bar
  was genuinely hard to navigate. It now wraps onto multiple rows instead,
  so every tab is visible without scrolling/hunting, with tighter spacing on
  phone screens.
- **OJT & Industry Visits module** (new "🏭 OJT & Projects" tab): log OJT/
  Visit records (title, organization, date, purpose), manage attendance per
  visit, and generate four print-ready documents per record — Communication
  Letter (to the organization), Parent Consent Form (batch signature sheet),
  Attendance Sheet (for that day), and Certificates of Participation (one
  per attendee, auto-generated in a single print job).
- **Trainee Projects** (same tab): log a project per trainee with completion
  date and description, generate a Project Completion Certificate.

## What's new in the previous update (v13 — mark-complete date fix, holiday accuracy already covered above, planned dates, invisible button fix)
- Fixed invisible Logout/Change PIN button text in the top bar (white text
  on white background — a real bug, not just a design nit).
- "Mark Complete" on Practicals/Theory now opens a small dialog to pick the
  actual date taught (defaults to today, but editable) — no longer silently
  locked to your device's system date.
- Practicals and Theory tables now have an editable **Planned Date** column
  (instructor-set), and the Dashboard's "Coming Up Next" roadmap shows those
  planned dates next to each upcoming item.

## What's new in the previous update (v10 — five fixes: attendance accuracy, exam security, real dates, roadmap, extra topics)

**1. Holidays now excluded from working-day math** — new "Holiday Calendar"
card under Attendance. "Auto-mark Sundays + 2nd/4th Saturdays" bulk-generates
across a date range you pick (e.g. your full session); add specific govt
holidays (Diwali, Republic Day, etc.) individually. Every attendance %
anywhere in the app — Trainees table, student's own summary, the printed
monthly register — now excludes holiday dates from both present-count and
total working days. The printed register also marks holiday columns "H."

**2. Student login now requires a PIN**, not just Roll No. Every trainee
gets a random 4-digit PIN when added (shown to you once, and visible/
resettable anytime in the Trainees table — instructor-only column). Share it
with them alongside their Roll No. This closes the gap where anyone could
log in as any student and take their exam for them.

**3. New "Actual Dates Taught" report** (Reports tab) — lists every
completed practical/theory item by the **real date you marked it done**, not
the planned calendar date. Since you flagged planned ≠ actual, this is the
report that reflects reality for inspection/record purposes.

**4. Student Dashboard roadmap** — new "Coming Up Next" card shows the next
3 pending practicals and next 3 pending theory topics in sequence, so
students always know what's coming without asking.

**5. "Beyond Syllabus" tracker** (Extra Activities tab, below the existing
Activities section) — log tools/skills you teach beyond the prescribed
curriculum (Canva, AI image tools, etc.). Visible read-only to students, and
generates a printable "Additional Topics Taught" report for your seniors —
evidence of extra value delivered beyond the official syllabus.

## What's new in the previous update (v9 — fix: students no longer see Plan content)
- **Fixed a real content leak**: the "View Plan" popup was showing students
  the full Objective/Tools/Procedure/Questions plan detail — that's your
  instructional content, not theirs to see. Students now only ever see the
  **Teaching Materials** section (Notes PDF + YouTube link), nothing else.
  If nothing's been uploaded yet, they see "Not uploaded by your instructor
  yet" instead of a blank plan.
- Button label is now honest about what each role sees: Instructor/Principal
  get "View Plan," students get "View Notes."
- Principal still sees full plan detail (unchanged) — this was specifically
  about students.

## What's new in the previous update (v8 — Class Test / MCQ Exams)
- **Instructor**: Create Exam (title + date, any cadence — weekly, monthly,
  whatever fits), then Manage it to add MCQ questions one at a time (4
  options, correct answer, marks per question). Publish when ready — only
  published exams are visible to students. View Results shows every
  trainee's score, %, and submission date, live.
- **Student**: sees published tests under Class Test, takes it once (radio
  buttons per question, submit locks it in), gets the score immediately.
  Past results listed below.
- **Auto-grading** — correct answers are compared instantly on submit, no
  manual checking needed. One attempt per trainee per exam by design.
- Not built yet, flagging honestly: no time limit / timer, no question
  shuffling, no partial credit, no printable exam report yet (Reports tab
  doesn't include this — tell me if you want a printed mark sheet for these
  too).

## What's new in the previous update (v7 — official Plan data, both Demo and Lesson)
- **Demonstration Plan upgraded to your official DVET-format document**
  (`DPO_DemonstrationPlan_1-119.docx`) — all 119 parsed cleanly. Replaces the
  earlier draft-file parse, which had generic/placeholder content in places.
  Fields shown now match the real format: Purpose/Objective, Tools/Equipment/
  Training Aids, Questions, Next Demonstration.
- **Lesson Plan added for all 58 Theory topics**, parsed from
  `DPO_LessonPlan_1-58.docx` — the "View Plan" button on the Theory tab now
  shows real content: Objective, Materials/Equipment, Review, Motivation,
  Questions, Summary, Assignment, Next Lesson — instead of the placeholder
  from before.
- Existing saved data on your device is auto-upgraded to the new plan
  content the next time you open the app — no re-entry needed.

## What's new in the previous update (v6 — real depth, not just gradients)
- **Signature element**: registration marks + halftone dot texture — the
  actual visual language of pre-press/DTP work — used in the header, hero
  banner, and login screen instead of a generic tricolor bar.
- **Layered shadow system** — cards, buttons, badges, and modals now use a
  consistent 3-tier shadow scale (soft/medium/large) instead of flat
  1px borders, so the UI actually reads as having depth.
- **Dashboard hero banner** — time-aware greeting ("Good morning, Durgesh"),
  gradient + halftone texture, replacing the plain "Dashboard" heading.
- **Icon badge stat cards** — each dashboard stat now has a colored icon
  chip instead of a plain colored strip.
- **Pill-style tabs** — active tab is now a filled brass pill with its own
  shadow, instead of an underline.

## What's new in the previous update (v5 — Plan Viewer + Teaching Materials)
- **"View Plan" on every Practical** — click it to see Objectives, Tools,
  Procedure, Application, and Test, pulled directly from your
  `demonstration_plan_2025.docx` (117 of 119 parsed cleanly; #78 and #79 used
  a slightly different layout in that file and need manual entry — tell me
  if you want those two fixed).
- **"View Plan" on every Theory topic** — same button exists, but shows a
  placeholder for now: I only have your Theory *schedule* (topic + dates,
  from `THEROY_PLANNING.pdf`), not detailed Lesson Plan content (objectives/
  procedure per topic). Upload your `DPO_LessonPlan_1-30.docx` (or newer) and
  I'll parse it the same way and it'll auto-fill, same as Practicals did.
- **Teaching Materials, per practical/theory item** — Instructor can paste a
  Notes PDF link and a YouTube link into the same "View Plan" popup after
  teaching it. Students see a **read-only** version of that popup — no plan
  detail, just "Open Notes PDF" / "Watch on YouTube" links, and only once
  you've actually filled them in (empty until then).
- Note on the PDF link: same as the Practical Submission box earlier — this
  stores a **link**, not the file. Paste a Google Drive share link (or
  wherever you host the notes) that's set to "anyone with the link can view."

## What's new in the previous update (v4 — Leave & Discipline)
- **Leave Application** — students self-apply (Casual/Medical/Other, dates,
  reason, optional certificate link); you Approve/Reject. Approving
  auto-marks those dates "L" in Attendance — no double entry.
- **Attendance Shortage Warning / टाकीत पत्र** — set your own threshold %
  (Leave & Discipline tab), the app lists every trainee currently below it
  with their guardian's contact info, and generates a print-ready warning
  letter addressed to the parent, with an acknowledgement signature line.
  Logged with issued/acknowledged status.
- **Parent Undertaking / हमीपत्र** — log an undertaking against a trainee
  (reason/context), generates a signed-undertaking print format, tracked
  pending → filed.
- **Guardian contact fields** added to Trainee Master (phone, guardian name,
  guardian phone) — needed to actually address the warning letters.

## What's new in the previous update (v3 — design + gallery + notices + storage clarity)
- **Visual redesign** — Poppins/Inter fonts, gradient buttons and topbar, tab
  icons, colored accent bars per card, avatar-initial chips for every
  trainee. Meant to read like a proper DTP-trade product, not a form.
- **Photo Gallery tab** — upload event/activity photos (auto-compressed
  client-side to keep local storage small). Everyone can view; only
  Instructor adds/removes.
- **Notice Board tab** — post announcements; latest one also surfaces right
  on the Dashboard so students see it immediately after login.
- **Storage & Data panel** (Reports tab) — plain-language explanation of
  where your data lives, live counts (trainees/attendance days/marks/photos),
  approximate storage used out of the ~5 MB on-device ceiling, and a "last
  backup" reminder that turns red if you've never exported.
- **Fixed a migration bug** — existing saved data (from before PINs existed)
  wasn't getting the new PIN fields, so PIN entry always failed. Now old
  saves are properly patched with new settings on load.

## What's new in the previous update
- **Principal / Vice-Principal login** — oversight view: batch dashboard, Trainee
  list (read-only), Practicals/Theory (read-only), and Reports with a
  **Registers & Signatures** tracker to mark documents "Signed" once the
  physical signature is done.
- **Theory topics module** — separate tab, paste your 58 theory topics in
  (one per line) via "+ Add Theory Topics", mark each complete as taught.
  Feeds into the combined syllabus % on the Dashboard alongside practicals.
- **Dashboard charts** — a syllabus split (practical vs theory, done vs
  pending) doughnut chart, and a 7-day attendance trend bar chart, both via
  Chart.js (loaded from a free CDN — needs internet the first time it loads,
  then browser-cached).
- **Clarified file-submission wording** — the submission box now says plainly
  it only stores a pasted link, not the file itself, and that real
  Drive-backed storage (landing in *your* institute Drive, not the student's
  personal one) is the Phase 2 upgrade.

## What this version is
A fully working prototype that runs in any browser, phone or laptop.
Data is stored **on the device you use it on** (browser local storage) — nothing
goes to the internet yet. This lets you start using it TODAY with zero setup.

## How to use it right now (no setup)
1. Open `index.html` in Chrome (on your phone or laptop).
2. Login as Instructor → your name is pre-filled.
3. Go to **Trainees** → add your batch (Roll, Name, PRN, Category).
4. Go to **Attendance** → mark daily.
5. Go to **Practicals** → mark each one "Complete" as you teach it — this drives
   the Dashboard's syllabus progress bar automatically.
6. Go to **Evaluation** → pick a practical, enter marks per trainee.
7. Go to **Reports** → generate the Attendance Register / Evaluation Sheet /
   Progress Card / Syllabus Completion Certificate as print-ready PDFs
   (Print dialog → "Save as PDF" or print directly). Get physical signature,
   then come back to Dashboard → your "Pending signatures" list will show it
   until you manually mark it signed (edit coming in v2 — for now this list is
   a visual reminder of what's been generated).

## Install as an app on your phone (no Play Store needed)
1. Host these files somewhere reachable by your phone (see "Free hosting" below),
   OR simply open `index.html` locally in Chrome on the phone.
2. Chrome menu (⋮) → "Add to Home screen" / "Install app".
3. It now opens full-screen like a native app, with its own icon.

## Free hosting (so students can also open it from their phones)
Any of these work at ₹0, forever, at this scale:
- **GitHub Pages** — create a free GitHub account, create a repo, upload these
  files, enable Pages in repo settings. You get a URL like
  `yourusername.github.io/dtpo-register`.
- **Vercel** or **Netlify** — drag-and-drop these files in their free dashboard,
  get a URL instantly. No card required for this usage level.

Share that URL (or a QR code of it) with your students — they open it, choose
"Student", enter their Roll No. (which must already exist in your Trainee
Master), and see their own attendance/marks.

## IMPORTANT — back up your data
Since data lives in the browser, clearing browser data or switching devices
loses it. Go to **Reports → Backup → Export all data** regularly (weekly is a
good habit) and save that `.json` file somewhere safe (Google Drive, email to
yourself). **Import backup** restores it on any device.

## What's next (Phase 2 — not built yet, by design)
We deliberately kept this version single-device so you could start using it
immediately. When you're ready:
1. **Firebase migration** — move Firestore in as the data layer so your data
   syncs across your phone, laptop, and every student's phone in real time,
   instead of living only in one browser.
2. **Google Drive file upload** — replace the "paste your share link" box in
   Evaluation with a real in-app file picker that uploads straight to your
   Drive folder.
3. **Principal login** — the oversight view we scoped, once the instructor
   side is proven out.
4. **Proper e-signature tracking** — a real "mark as signed, attach scanned
   copy" flow instead of the current visual-only reminder list.

None of this requires rebuilding what you already have — it plugs into the
same screens.

## Files in this folder
- `index.html` — app structure
- `style.css` — institutional styling (letterhead-style header, print formats)
- `app.js` — all logic + your 119 practicals pre-loaded with correct global
  numbering and unit grouping
- `manifest.json`, `icon.svg`, `sw.js` — makes it installable as an app

## Universal ITI Automation — v3

### New instructor features

#### 1. Syllabus AI
Use **🤖 Syllabus AI** from the instructor/principal navigation.

Supported source files:
- PDF (text-based PDF)
- DOCX
- XLS/XLSX
- CSV
- TXT

Workflow:
1. Enter or auto-detect trade name.
2. Upload syllabus.
3. Analyze syllabus.
4. Review detected module/unit, practical/theory classification and hours.
5. Set session dates, hours/day, working days and holidays.
6. Generate a day-wise calendar.
7. Instructor approves and applies the syllabus.

The current browser MVP uses deterministic extraction/classification. A future secure backend can replace the classifier with an LLM without changing the calendar layer.

#### 2. Module Manager
Use **🧩 Module Manager** as an instructor.

You can:
- Create modules/units manually.
- Set module code, name, total hours and learning outcome.
- Add practical topics to a module.
- Add theory topics to a module.
- Delete modules/topics.
- See the module-wise topic structure.

When a topic is added manually, the corresponding practical/theory record is also created in the main register.

#### 3. AI-to-Module import
When an analyzed syllabus is applied, the app now creates the module structure automatically from the detected module/unit names and assigns practical/theory topics under those modules.

### Important design
The application remains a local-storage prototype. No cloud account or API key is required for the current parser. Instructor data stays in the browser until exported/backed up.

### Recommended next development
For production use by many instructors, add:
- Python FastAPI backend
- PostgreSQL database
- Secure user accounts
- Server-side LLM syllabus analysis
- File storage
- Institute/trade/batch separation
- Approval workflow
- Automatic Word/Excel/PDF generation
- Admin dashboard


## v4 Universal Instructor Workflow

1. Login as Instructor.
2. Open **🤖 Syllabus AI**.
3. Enter the trade and training dates.
4. Upload the official syllabus (PDF/DOCX/XLSX/CSV/TXT).
5. Review detected modules, practicals, theory topics and hours.
6. Generate the calendar.
7. Click **Create Complete Training Plan**.

The complete-plan action creates the module structure, practical/theory records and planned dates in one operation. Existing trainee and attendance data are retained.

### Manual module creation
Open **🧩 Module Manager** when you want to create a module manually. Add a module code, name, hours and learning outcome, then add Practical or Theory topics under that module.

### Important limitation
The current browser version uses deterministic document parsing. Scanned/image-only PDFs and complex government syllabus tables need the planned Python/FastAPI AI server version for reliable OCR and semantic extraction.


## V13 Free Calendar Automation
- Maharashtra 2026 government holidays preset.
- Automatic Sunday/non-working day and 2nd/4th Saturday handling.
- Hour-based theory/practical allocation per working day.
- Generated day plan is saved with the training plan and powers Today's Teaching after reload.
- Existing institute holidays are merged into the generated calendar.
- 2027/future government holidays remain instructor-imported until officially published.
