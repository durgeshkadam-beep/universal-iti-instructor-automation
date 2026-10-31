# Student Career Assistant — Phase 1 Design (proposal; not live)

## Existing behavior verified
- V15 student portal shows attendance, leaves, class tests and academic information.
- No completed, verified My Skills / nearby live job board / skill-gap AI / interview-coach workflow was found in the reviewed runtime.
- These features are **not implemented** by this document.

## Core Student user journey
1. Student signs in with approved Google account linked to one trainee.
2. **My Skills** shows trade and syllabus-derived skills, with states `not-started`, `learning`, `demonstrated`, `instructor-verified`. Student may self-declare skills, visibly distinct from verified skills.
3. Student chooses target role (e.g. DTP Operator, Graphic Designer, Electrician helper) and location or city **voluntarily**.
4. **Skill Gap** compares verified skill IDs with versioned job-role requirements; marks missing prerequisites, links to actual lessons/practicals and suggests a weekly plan.
5. **Nearby Jobs** shows attributed active job/apprenticeship links from a permitted provider or curated institute employer records. Match city/district, radius, qualification, trade, stipend/salary and fresher criteria. Display source, verified-on date, original posting link, expiry and report-broken-link.
6. **AI Interview** presents trade-specific technical / safety / HR questions, user response, answer rubric and constructive feedback in Marathi/Hindi/English, including an explicit 'AI feedback is guidance only' disclosure.

## Security / privacy requirements BEFORE enabling
- Student access restricted by Firebase Auth UID + institute workspace + traineeId, checked by Firestore security rules, not just hidden UI.
- Only authorized instructor may mark skills `instructor-verified`; student may self-declare in a separate data field/document.
- Job location opt-in; never request exact GPS by default. Save only district/city preference; allow deletion.
- No sensitive trainee data sent to AI without informed opt-in; remove names, roll numbers, phone numbers, marks, and documents from prompts by default.
- Keep provider API secrets in server environment (Cloud Functions / trusted backend), not in client JS.
- Do not scrape job sites without permission. Prefer licensed API, government portals or manual employer verified postings; use source-specific terms.
- Prevent auto-applying for jobs; user opens original official application link.
- Show AI skill suggestions as recommendations, not certified qualifications or guaranteed placement.
- Explicit opt-in for recording voice, retention notice, erase history option.

## Proposed collections (server rules and migrations required)
`institutes/{inst}/workspaces/{wid}/studentSkills/{traineeId}`: per-skill status, verifiedBy, verifiedAt, evidence practical ID, self-report.
`institutes/{inst}/jobRoles/{roleId}`: role title, NSQF/trade mapping, skills requirements, rule set version.
`institutes/{inst}/opportunities/{jobId}`: title, employer, city, source URL, fetchedAt/verifiedAt/expiresAt, eligible trades.
`institutes/{inst}/workspaces/{wid}/studentCareerPrefs/{traineeId}`: preferred jobs, city/district, language, optional commute.
`institutes/{inst}/workspaces/{wid}/interviewSessions/{sessionId}`: owner traineeId, rubric, scores and retention timestamp.

## Scoring (display separately)
`Coverage = verified_required_skill_weight / total_required_skill_weight`; track training-in-progress and self-declared skills separately; show reason and uncertainty. Never label a student 'unemployable'.

## Incremental delivery / acceptance tests
A. Instructor-defined trade skills + student skill card, with verified/self-declared separation.
B. Skill-to-job-role map with instructor review, seeded from public competency standards; fixture tests for incomplete/missing skills.
C. Nearby job directory with manual verified entries and externally opened official apply URLs; no invented live jobs.
D. AI interviewer prototype using dummy data with prompt safety, error handling, quotas and rubric tests.
E. Later integrate permitted provider API, analytics and alumni employment outcomes after consent/privacy review.

## Deployment rule
Do not roll out student career modules until current student Firestore permissions, exam key protection and cross-account cache isolation are resolved and integration tests pass.
