# Prototype acceptance status — 27 October 2026

## Current verified application source

Application source `0f01524c246e4b1c1676c29567c6fd15cf374c5f` passed [CI 40530975943](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40530975943): **194 native tests**, the additional regression scripts, all three Auth/Firestore/backend Emulator suites, **54 desktop/mobile browser cases**, public build, container smoke, and production/development-inclusive dependency audits. Every required step succeeded. These are synthetic automated acceptance results; they do not certify production readiness or every hosted user journey.

Work remains on branch `phase1/security-student-career-20261021` in draft [PR #16](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/pull/16). No main merge or production deployment is certified. Later documentation-only commits do not change the application source identified above.

## Deployment and live evidence

| Component | Verified state | Evidence boundary |
|---|---|---|
| Firebase staging website | https://universal-iti-dk-staging.web.app/v15/ | Fresh public `ai.js`, `app.js` and `style.css` matched the complete-plan-preview source `96869ea9754c1e5b22ed37d9d9f18aff20d956fb` during 27 October verification. Subsequent application changes were backend-only. This does not prove an already-open browser tab has reloaded those files. |
| Render staging API | `universal-iti-staging-api`, Free service; application source `0f01524...` live | Cleanup deployment `dep-dbgc6v6c6qcc73evv0gg` is live. Its post-deploy health check returned HTTP 200. A health check is not a model-generation or authenticated-save test. |
| Gemini teaching generation | Server-configured `gemini-3.5-flash-lite`; key remains on the backend | Fixed synthetic theory and practical probes both returned HTTP 200 and passed strict teaching JSON validation at 15:29 UTC / 20:59 IST on 27 October. The temporary startup probe was then disabled. No student records or user prompts were used. |
| Instructor's own browser | Synthetic skill verification/save/reload and a generated multimeter draft were visible in owner-supplied screenshots | The latest screenshot still displayed the old count-only preview. Final full-document review/save/reopen/PDF acceptance on the intended device remains pending. |

The earlier `gemini-3.1-flash-lite` model returned an explicit high-demand HTTP 503 during a fixed synthetic test. Changing models within the confirmed free-tier setup produced the successful probes above; this is no uptime guarantee. One explicit provider 503 is retried once after two seconds, within the original 45-second total request deadline. Quota/access errors and ambiguous network failures are not automatically repeated. A recovered request consumes one application allowance.

The app currently permits **50 AI attempts per authenticated UID per UTC day**, including failed requests. It resets at 00:00 UTC / 05:30 IST. The operator's AI Studio screenshot showed 500 requests/day, 15 requests/minute and 250,000 input tokens/minute for the selected model. Those provider limits are shared across the project and can change; the app's per-user cap does not enlarge them. No paid billing or compute upgrade was enabled in this work.

## Acceptance by role

| Area | Automated acceptance | Remaining hosted acceptance |
|---|---|---|
| System Admin | Authenticated role/routes/mobile; other roles denied technical Admin console | Existing authorised owner session and intended administrative integrations on the current release |
| Principal | Authenticated role/routes/mobile; cross-month leave/attendance reopening boundaries | Independent intended-device login, institute approval procedures and current-release review |
| Instructor | Skill verification; reviewed plans/materials; reports; leave review; secure MCQ authoring; queue and training backup flows | Full plan header/content, save/reopen and PDF on the intended device; physical printing and external integrations |
| Staff | Authenticated role/routes/mobile; backend/rules restrictions | Existing authorised synthetic Staff identity on the current hosted release |
| Student | Instructor-verified skills; self-rating separation; private plan save/fresh-browser cloud hydration; Marathi/Hindi/English guided assistance; protected MCQ grading; private-data denials | Fresh authorised synthetic Student session on the deployed storage-isolation release, including Passport → Skill Gap → Learning Plan save/reload |

Earlier hosted five-role and MCQ checks are recorded in [STAGING-TEST-GUIDE.md](STAGING-TEST-GUIDE.md). They are historical evidence, not a substitute for acceptance of the current release.

## Completed and verified

- Browser Student storage is scoped by project, institute, UID, workspace and trainee. Ambiguous legacy drafts are retained without automatic import/upload. Fresh-browser cloud restoration and stale-account/workspace responses are covered by tests.
- Unsaved AI lesson/demonstration drafts use the existing complete document template: institute, instructor, trade, batch/session, unit, topic, schedule, objectives, materials/tools, procedure/information, safety/key points, spot hints, questions and signatures. Preview does not write records. Save/Approve is explicit; stale identity/workspace/topic drafts cannot be saved.
- The bundled 58 DTPO lesson and 119 demonstration records were inspected as format references. Their trade-specific content is not reused for unrelated trades. Current V15 headers use workspace metadata; missing fields are identified rather than filled with another account's legacy profile.
- The provider request asks for usable demonstration procedures and four-phase lesson teaching detail. Generated content still requires instructor review; schema validation cannot certify technical correctness.
- Attendance lock, server-only leave approval, protected exam keys/results, role restrictions, account-scoped queues, training-only backup/restore and common report/PDF paths have automated acceptance coverage in the linked CI.
- Marathi/Hindi/English structured career, resume-outline and text-interview practice works without a provider key. Optional generative Student-task quality is not certified by the teaching-only live probes.

## Pending and blocked

- **Independent live role acceptance:** Only the owner's Instructor account is available in this interaction. Use existing synthetic identities through secure sign-in; do not promote that account or reset real-user credentials for a demo.
- **Production MFA and recovery:** Application-enforced privileged MFA, account recovery/anti-lockout design and intended-device enrollment/recovery acceptance remain outstanding. Google login alone is not evidence of application-level MFA enforcement. Institute-ID aliases without a deliverable email have no safe automatic email-recovery flow.
- **Backup/integrations:** Training-resource export/preview/create-only restore excludes trainee records, attendance, marks, exams, accounts and files. Full disaster recovery is not implemented. Actual Drive OAuth/upload, OS download handling and physical printing remain separate acceptance checks.
- **Hosting automation:** Automatic GitHub-to-Firebase staging deployment is not configured. Cloud Shell is used for publishing updates, not for keeping the website or AI running. No Firebase CLI login is available to the Work executor; its local execution/browser environment is currently unavailable. GitHub/Render connectors remain usable for repository/status work.
- **Impact and employment evidence:** No measured time saving, placement improvement, employer relationship, live vacancy or certification is claimed without evidence. Source-linked opportunities and pilot measurements must be checked and dated.

See [DEMO-WALKTHROUGH.md](DEMO-WALKTHROUGH.md) for the demonstration sequence, acceptance observations and presentation outline. This is a tested staging prototype, not a production release certificate.
