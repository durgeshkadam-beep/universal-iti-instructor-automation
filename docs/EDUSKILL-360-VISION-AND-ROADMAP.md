# Universal EduSkill 360 — product vision and delivery roadmap
Updated: 26 October 2026. **Innovation narrative, not a production release or retroactive rename.**

## Brand architecture
- **Innovation name:** Universal EduSkill 360
- **One-line promise:** Career clarity for every learner. More time to teach for every educator.
- **Technical prototype:** Universal ITI Instructor Automation (keep repository name and stable app route)
- **Challenge team:** UNIVERSAL ITI INNOVATORS, one member.
- **Initial beneficiaries:** ITI trainees and craft instructors, Maharashtra.
- **Longer-term vision:** Adapt only after validation to additional ITI trades and then schools/colleges/universities. No existing rollout in those sectors is claimed.

## The core innovation
A trainee discovers **during training** where verified practical skills can be applied and what they should learn next. The instructor reviews evidence, validates the skill and gets time back from duplicate documentation.

**Proposed Skill-to-Career Lens**:
1. Trainee completes a mapped course practical.
2. Instructor records reviewable verified evidence, independent of student self-rating.
3. Learner sees their personal Skill Passport and progress.
4. Learner selects a target role/district and sees skills still missing.
5. Curated **source-attributed** career examples explain uses of those skills.
6. The student chooses a next practical or requests assessment; the instructor monitors progress.

Current code includes pieces of this path; the integrated named **Lens** and reviewed role/skill/use-case content are future work. Do not market the entire flow as one fully launched recommendation engine.

## Completed code and evidence (baseline as of 25 October 2026)
The draft phase1 branch includes five authorized role portals, trainee practical verification and skill gaps, student guided plans, controlled career/job-source links, training administration, reports, protected MCQ backend, offline-aware operations and isolated staging. Latest known GitHub CI run: https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40200187349 (passed). The branch remains Draft PR #16, main unmerged.

These are **software acceptance checks**, not an independent institutional field pilot. No real placement or teacher-time outcome has been measured.

## Delivery gates for the next development sessions
| Priority | Build and test | Definition of done |
| --- | --- | --- |
| P0 | Student 90-second skill-to-career demo flow | Student from practical evidence to skill gap to next learning action without dead navigation; source dates and no-data states clear |
| P0 | Instructor verification editing and real role mapping | Authenticated instructor can verify/review only assigned trainee; student cannot promote their own skills |
| P0 | Skill-role-use-case catalog | Reviewed trade-specific skill mappings with source, updated date, reviewer; no model-invented employability claims |
| P0 | Teacher time-savings measurement | Pilot captures baseline and follow-up timing for two recurring workflows; no claimed percentage until observed |
| P1 | City/trade opportunities | Reviewed, live-linked legitimate listings, apprenticeship options, expired/withdrawn flags and link-break reporting; no false city-wide company counts |
| P1 | Mobile, accessibility, low-data | Chrome Android real-account routes; Marathi/Hindi/English guided help; error/empty state and safe offline continuation |
| P1 | Data privacy and pilot consent | No real Aadhaar or contact details in AI prompts, consent/retention, synthetic demo accounts and evaluation plan |
| P2 | Free-first optional AI | Backend-held key only; provider eligibility/quota verified; grounded replies, source citation, fallback on exhausted/free quota |
| P2 | Institutional expansion | Curriculum adapters and student protection reviewed with each adopting school/college; not a database rename alone |

## One-ITI 90-day pilot (proposed, needs written approval)
- 40 learners (two batches) and approximately two participating educators: **targets, not tested population**.
- Before: short career-usefulness questionnaire, completion rate baseline, instructor timing of two admin tasks, usability inventory.
- After: career plan completion, changes in career clarity, teacher-task elapsed time, verified evidence and reported issues.
- Aspirational goals: >=70% complete guided career plan; >=20% less time in those selected admin tasks. These are **not achieved results**.
- Indicative budget INR 20,000 for supervised 90-day pilot, not a vendor quote or sanctioned grant.

## Source and limitations
Maharashtra had **1,021 ITIs (2026)** and **1,30,810 ITI enrolments (2025–26)**. These are officially published **sector scale** statistics, not the number of trainees proven to lack career guidance, existing platform users or available placements. PIB / MSDE, 20 July 2026: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2286584

No licensed automatic all-company discovery, all-city vacancy census, guaranteed employment/placement, operational generative-AI provider, verified 20% time savings, or multi-sector rollout is claimed.

## Do not break
- Never rename existing Firebase institute IDs/workspace IDs or collections for presentation branding.
- Do not merge into main or modify production without explicit approval.
- Keep isolated staging and run existing full CI, Firebase Emulator permissions, role E2E and mobile checks.
- Preserve old stored student records and original project history.
