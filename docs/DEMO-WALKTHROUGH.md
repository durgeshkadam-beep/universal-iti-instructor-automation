# Universal EduSkill 360 — demonstration walkthrough

Prepared against tested application source `093bb8a732ce0e44bf2c7c06eeba1929f5afd4a1`, 28 October 2026. The institute-header fallback in that source awaits Hosting deployment. Use the [current acceptance report](FINAL-ACCEPTANCE-STATUS.md) for evidence and limitations.

## Before presenting

Open https://universal-iti-dk-staging.web.app/v15/ on the intended device. Use synthetic staging data only. Keep an already reviewed saved plan available so the demonstration does not depend on a fresh AI response.

If an unsaved AI result is open, save it deliberately and wait for synchronization before refreshing. Then use Ctrl+Shift+R to load the deployed frontend. A successful current preview says **Full draft preview** and displays the document, not only objective/row/question counts.

Cloud Shell is not required during normal use. A free backend may need time to wake, and provider quota/high demand can prevent new generation. Do not repeatedly generate the same plan. Saved documents and keyless guidance demonstrate useful capabilities without spending another model request.

Use separate, already authorised synthetic identities for Instructor and Student. The presenter's Instructor role must not be changed merely to demonstrate another dashboard. If a current hosted Student identity is unavailable, label that segment as emulator-tested and show its CI evidence; do not present an Instructor screen as a live Student session.

## Five-minute demonstration

| Time | Show | Explain and verify |
|---|---|---|
| 0:00–0:40 | Problem and a saved training topic | Training records, practical evidence and individual learning goals need to connect. The prototype aims to reduce repetitive work and make verified progress visible. These are intended benefits, not measured outcomes. |
| 0:40–1:40 | Instructor → Verify Student Skills | Open a synthetic learner and practical. Record evidence through the existing verification form. Wait for sync and reload; the verification/evidence must remain. Self-assessment is not instructor verification. |
| 1:40–2:50 | Student → My Skills → Skill Gap → Learning Plan | With an authorised Student identity, show verified skills, select the intended skills and career goal, then save the personal plan. Reload and check the same goal/selection. Another student's private plan must not appear. If live access is unavailable, explicitly show the automated acceptance evidence instead. |
| 2:50–3:50 | Instructor → Practical → View Plan | Show institute, instructor, trade, batch, topic, unit, dates, duration, objectives, tools, procedure, safety/key points, spot hints, questions and signature spaces. Open a reviewed saved plan; optionally generate one draft after consent. Preview must not silently save or approve it. |
| 3:50–4:30 | Student career/resume/interview guided practice | Switch Marathi/Hindi/English. Explain the keyless structured assistance and optional backend generation. It is text guidance, not an official skill score, certification or guarantee of employment. Open only source-linked opportunities; check source and expiry rather than claiming invented vacancies. |
| 4:30–5:00 | Reports and scalability | Show a saved report or browser PDF. Explain role/workspace isolation and a proposed approved pilot. Identify remaining MFA/recovery, full backup and live-role/device acceptance work. |

A demonstration must not mark an exercise conducted merely because AI generated its plan. Proposed dates and actual completion dates are separate records.

## Full-plan acceptance on the presenter's device

1. Open a synthetic topic and its AI draft. A raw JSON editor is not the finished document.
2. Use **Preview Result**. Confirm the complete document header and all content sections. Missing workspace metadata must be configured correctly; do not invent institute/instructor details.
3. Review technical content, sequence, safety points and next topic. The AI draft can be edited before saving.
4. Choose **Save as Draft** first. Reopen the corresponding **View Plan** and check that the same edited content is retained.
5. Approve only after review. Reload and reopen to confirm the stored plan/status.
6. Choose **Print / Save PDF** and inspect the actual downloaded PDF's header, table and page breaks. This confirms browser output only; a paper print and signature require separate observation.
7. Record device/browser, source/release, synthetic topic identifier, observed result and test date. Never include credentials, API keys or personal learner data in the evidence.

If the old count-only preview remains, preserve the unsaved draft before refreshing. A provider 503 is a different issue: it means generation failed temporarily; the application must not show an earlier preview as a new successful draft.

## Observed synthetic Instructor acceptance

The preceding cloud-browser session generated Practical Plan 3 in Electrician / 2026–27 / TEST, displayed the complete 10-row document, saved it as AI DRAFT / Version 1, and retained it after a full reload and reopening. Print / Save PDF opened the print-ready document. The draft remains unapproved and was not marked conducted. Reuse that saved draft for the presentation after technical review instead of spending requests to regenerate it.

The institute name was missing from workspace metadata even though an authorised institute record supplied a name. Source `093bb8a...` fixes this fallback with project/account/institute checks and regression coverage; its deployment and final hosted header check are pending. Do not type an invented institute name for the demonstration.

## Presentation content: six slides

### 1. Problem
Practical evidence, routine training records and learner career goals are often disconnected. Describe the actual local workflow; do not quote unmeasured workload or placement statistics.

### 2. Proposed solution
Universal EduSkill 360 connects Instructor practical verification with a Student skill passport, gap view and private learning plan, alongside training administration.

### 3. Working prototype
Show the verified Student-to-Instructor workflow and complete reviewed teaching plans. Name the five role dashboards. Link the staging site and acceptance report, and distinguish automated tests from current hosted demonstrations.

### 4. Student and Instructor impact
Students can see verified progress and specific next learning steps. Instructors can reuse records and prepare reviewable plans. These are capabilities and expected benefits. Measure time saved and learning-plan follow-through in a consented pilot before claiming impact.

### 5. Technical architecture and trust
The browser uses Firebase Authentication and Firestore access rules. A trusted Node backend handles protected exam grading, leave review and optional Gemini generation. Secrets stay on the backend. Keyless assistance remains available; AI drafts require review.

### 6. Scalability and next steps
Propose an approved small institute pilot, review outcomes, then extend by trade/workspace and institute after security and recovery acceptance. Production MFA/recovery, full backup/recovery, integration/device acceptance and operating capacity need separate validation and approval.

## Pilot measurements to collect

Record real observations only: matched-task preparation time before/after; verification/evidence completion; private learning plans saved/reviewed; plan follow-through; report rework; and error/support incidents. State sample size, dates and missing data. Do not extrapolate employment outcomes from interface usage or a synthetic demonstration.

## What is not claimed

No guaranteed job, employer partnership, government endorsement/certification, official interview score, universal syllabus accuracy or completed production acceptance is claimed. Historical hosted tests and the 54 current emulator browser cases are different evidence categories.
