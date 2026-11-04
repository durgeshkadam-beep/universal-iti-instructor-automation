# AI-first? No: evidence-first career guidance (audit dated 22 Oct 2026)

## User objective
Help an ITI trainee choose a city, explore recorded employers and vacancies, see frequently mentioned skills, compare the appeal of a chosen skill, and later receive AI interview and career advice. Phase 1 work must not change production or require a paid API key.

## Functionality review

| Function | Current implementation | Needs an LLM? | Evidence / limitations |
| --- | --- | --- | --- |
| Student login, roles, verified skill profile | Google/Firebase with Firestore role rules | No | Firebase Emulator tests. Not yet tested with real institute accounts. |
| Skill self-assessment | Local browser storage | No | Self-report cannot grant instructor verification. |
| Instructor skill verification | Firebase student UID + assigned workspace | No | Cloud-backed, permission tests. |
| Skill Gap & Learning Plan | Verified practicals vs student-selected target practicals | No | This is training coverage, **not** official occupation qualification. |
| Jobs and recorded companies by city | `v15/v15-local-market.js` + curated `careerOpportunities` records | No | No data automatically imported, no geographic radius, no real-time census. Counts refer ONLY to manually reviewed records. Zero records does not mean no employers or jobs. |
| Most-mentioned skills and chosen-skill frequency | Deterministic count per recorded active, unexpired posting | No | Sample-size warning under five postings; never claim general market popularity. |
| Personalized industry-demand forecast | Not implemented | Usually AI for text; data still needed | Needs licensed evidence, snapshots with timestamps and bias warnings. LLM alone is not a labour-market database. |
| AI Career Adviser | Not implemented | Optional | A free Gemini tier can be considered for grounded explanations **only after** the secure backend is built. |
| AI Interview Coach | Not implemented | Yes for adaptive feedback, optional static questionnaire without AI | No live calls or privacy-safe production integration yet. |
| AI Resume Builder | Not implemented | Optional | A rules-based template can run with no key; generative wording optional. |
| Instructor syllabus/planning assistant | `ai.js` | AI optional, manual fallback present | Runtime-session Gemini key, manual prompt exchange, deterministic fallback. This legacy approach must not be reused as a shared student production key. |
| Official exam grading | Student attempts paused | Backend required, LLM not required | Trusted deterministic answer-key evaluation must be implemented on server. |

## First deliverable: Local Skill Market Explorer

**Instructor** sees Job Sources, entering a real employer/job title, manually chosen city, skills, original HTTPS job URL and expiry date. All records carry reviewer and timestamp, reside in current workspace, can be withdrawn, and cannot be self-created by students.

**Student** sees Job Market. Student manually selects city/district and preferred skill. Dashboard shows number of distinct tracked employers, tracked active listings, skill mention frequencies, sample size warnings and original job source links. There is an external link to the National Career Service portal `https://ncs.gov.in/`, but listings are **not** imported or mirrored from NCS.

**Added on 22 Oct 2026:** After selecting a city and optional skill, Students can open a Google Maps company search via a URL with `api=1` and URL-encoded terms. Google confirms Maps URLs require **no Google API key**. Search results remain on Google Maps, not collected or counted in the app; a business listing does **not** imply recruitment. This does not request GPS permission or incur Places API usage.

**Not yet offered**: precise GPS distance, all registered companies nearby, real-time vacancy count for an entire city, market-wide popularity ranking, salary forecast, job applications, scraping, automatic NCS API.

**Data integrity**: Count among reviewed listings only, deduplicate repeated skill tags within each posting, ignore expired/withdrawn/invalid-URL entries, compute per-city frequencies, never silently turn missing evidence into a positive assessment. No fake seed listings in production.

## Why no AI key is necessary for phase 1

Skill mention frequency, job/company counts, verified skill comparison and learning coverage are deterministic arithmetic on real data. Artificially generating those counts would mislead trainees.

Existing instructor `ai.js` has optional `gemini-3.6-flash` key in `sessionStorage`, manual JSON prompt/paste workflow and a local fallback. The model is listed as supported for the Interactions API in Google's current docs. An active free account/key must be obtained separately and quotas vary. No key, account or billing entitlement is bundled in the app; no model API was called by this change.

## AI upgrade path — FREE first, PAID only if user opts in

1. Keep all deterministic career, Skill Gap and Job Market features **100% usable without a key**.
2. Future backend (not delivered here): secure Firebase Authentication and role checks, an HTTPS function/proxy with `GEMINI_API_KEY` in managed server secrets, request limits, privacy redaction and usage budgets. Never send an institute-wide key to browsers.
3. Ask Gemini Free-tier models to explain only approved postings and verified skills already available; block hallucinated figures, source-less claims and personal identifiers. Respond in Marathi, Hindi or English. Display source URLs, dates and uncertainty.
4. If the free quota returns 429 or cannot be used, show deterministic analysis and optional manually prepared practice prompts—**no crashes, no fabricated statistics**.
5. If approved later, upgrade the backend's provider/model/configuration to a paid tier without changing Student UI or Firestore skill/market schemas. Configure budgets, logging, rate limiting and billing alerts before payment.

## Source and security review
- Gemini pricing/free tier: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API key safety: https://ai.google.dev/gemini-api/docs/api-key
- Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini Interactions supported models: https://ai.google.dev/gemini-api/docs/interactions-overview
- National Career Service location searches: https://ncs.gov.in/
- Google's Places API requires a billed project: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing/
- Employer samples do not represent the entire labour market; do not infer city-wide market share or exhaustiveness from recorded postings.

## Production gates (not satisfied by CI alone)
- Firestore Emulator must deny student writes and cross-workspace instructor writes; verify active-only reads and withdrawn-only updates.
- On a staging Firebase project, test account activation and student role-scoped reads end-to-end; verify `main` and production remain unchanged.
- Instructor must review legitimate job posting URLs, terms of use, potential scams and expiry before students see them.
- Confirm external job-provider APIs/permission separately before automatic importing; avoid unlicensed scraping.
- Check Chrome Android WebView/PWA navigation, empty states and no-GPS behavior on physical devices.
- Do not deploy or merge this Draft PR until a reviewer accepts these gates.

No private credentials, live job data or user-specific location were added.
