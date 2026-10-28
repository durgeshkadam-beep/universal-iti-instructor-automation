# Prototype acceptance status — 28 October 2026

## Current verified application source

Application source `093bb8a732ce0e44bf2c7c06eeba1929f5afd4a1` passed [CI 40541388162](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/actions/runs/40541388162): **200 native tests**, the additional regression scripts, all three Auth/Firestore/backend Emulator suites, **54 desktop/mobile browser cases**, public build, container smoke, and production/development-inclusive dependency audits. Every required step succeeded. These are synthetic automated acceptance results; they do not certify production readiness or every hosted user journey.

Work remains on branch `phase1/security-student-career-20261021` in draft [PR #16](https://github.com/durgeshkadam-beep/universal-iti-instructor-automation/pull/16). No main merge or production deployment is certified. Documentation-only commits do not change the application source identified above. The CI job logs confirm 54 browser cases passed in 2.8 minutes and both dependency audits reported zero advisories.

## Deployment and live evidence

| Component | Verified state | Evidence boundary |
|---|---|---|
| Firebase staging website | https://universal-iti-dk-staging.web.app/v15/ | Fresh public `ai.js`, `app.js` and `style.css` matched the complete-plan-preview source `96869ea9754c1e5b22ed37d9d9f18aff20d956fb` during 27 October verification. The institute-header fallback in source `093bb8a...` is newer and has not been deployed. This does not prove an already-open browser tab has reloaded those files. |
| Render staging API | `universal-iti-staging-api`, Free service; application source `0f01524...` live | Cleanup deployment `dep-dbgc6v6c6qcc73evv0gg` is live. Its post-deploy health check returned HTTP 200. A health check is not a model-generation or authenticated-save test. |
| Gemini teaching generation | Server-configured `gemini-3.5-flash-lite`; key remains on the backend | Fixed synthetic theory and practical probes both returned HTTP 200 and passed strict teaching JSON validation at 15:29 UTC / 20:59 IST on 27 October. The temporary startup probe was then disabled. No student records or user prompts were used. |
| Authorised Instructor cloud-browser acceptance | In the isolated Electrician / 2026–27 / TEST workspace, Practical Plan 3 generated a complete multimeter document with 10 procedure rows, 4 objectives, 7 tools and 4 questions. Save as Draft succeeded; full-page reload and reopening retained AI DRAFT / Version 1 and the same procedure. Print / Save PDF opened the full print-ready document. | Observed in the preceding work session. The draft was not approved or marked conducted. A downloaded PDF, physical print, technical content approval and intended-device checks remain pending. The latest browser session is signed out of the application. |

The earlier `gemini-3.1-flash-lite` model returned an explicit high-demand HTTP 503 during a fixed synthetic test. Changing models within the confirmed free-tier setup produced the successful probes above; this is no uptime guarantee. One explicit provider 503 is retried once after two seconds, within the original 45-second total request deadline. Quota/access errors and ambiguous network failures are not automatically repeated. A recovered request consumes one application allowance.

The app currently permits **50 AI attempts per authenticated UID per UTC day**, including failed requests. It resets at 00:00 UTC / 05:30 IST. The operator's AI Studio screenshot showed 500 requests/day, 15 requests/minute and 250,000 input tokens/minute for the selected model. Those provider limits are shared across the project and can change; the app's per-user cap does not enlarge them. No paid billing or compute upgrade was enabled in this work.

## Acceptance by role

| Area | Automated acceptance | Remaining hosted acceptance |
|---|---|---|
| System Admin | Authenticated role/routes/mobile; other roles denied technical Admin console | Existing authorised owner session and intended administrative integrations on the current release |
| Principal | Authenticated role/routes/mobile; cross-month leave/attendance reopening boundaries | Independent intended-device login, institute approval procedures and current-release review |
| Instructor | Skill verification; reviewed plans/materials; reports; leave review; secure MCQ authoring; queue and training backup flows | Institute-header fallback deployment and hosted check; intended-device PDF download, physical printing and external integrations. Synthetic cloud-browser draft/save/reload and print-view checks passed. |
| Staff | Authenticated role/routes/mobile; backend/rules restrictions | Existing authorised synthetic Staff identity on the current hosted release |
| Student | Instructor-verified skills; self-rating separation; private plan save/fresh-browser cloud hydration; Marathi/Hindi/English guided assistance; protected MCQ grading; private-data denials | Fresh authorised synthetic Student session on the deployed storage-isolation release, including Passport → Skill Gap → Learning Plan save/reload |

Earlier hosted five-role and MCQ checks are recorded in [STAGING-TEST-GUIDE.md](STAGING-TEST-GUIDE.md). They are historical evidence, not a substitute for acceptance of the current release.

## Completed and verified

- Browser Student storage is scoped by project, institute, UID, workspace and trainee. Ambiguous legacy drafts are retained without automatic import/upload. Fresh-browser cloud restoration and stale-account/workspace responses are covered by tests.
- Unsaved AI lesson/demonstration drafts use the existing complete document template: institute, instructor, trade, batch/session, unit, topic, schedule, objectives, materials/tools, procedure/information, safety/key points, spot hints, questions and signatures. Preview does not write records. Save/Approve is explicit; stale identity/workspace/topic drafts cannot be saved.
- The bundled 58 DTPO lesson and 119 demonstration records were inspected as format references. Their trade-specific content is not reused for unrelated trades. Current hosted V15 headers use workspace metadata. Tested source `093bb8a...` additionally uses the authorised root institute name when the workspace name is empty, scoped to the same Firebase project, UID and institute. Tests cover whitespace, cross-account/project isolation, stale async responses and escaped names. That fallback awaits Hosting deployment; absent metadata is never filled from another account's legacy profile.
- The provider request asks for usable demonstration procedures and four-phase lesson teaching detail. Generated content still requires instructor review; schema validation cannot certify technical correctness.
- Attendance lock, server-only leave approval, protected exam keys/results, role restrictions, account-scoped queues, training-only backup/restore and common report/PDF paths have automated acceptance coverage in the linked CI.
- Marathi/Hindi/English structured career, resume-outline and text-interview practice works without a provider key. Optional generative Student-task quality is not certified by the teaching-only live probes.

## Pending and blocked

- **Independent live role acceptance:** Only the owner's Instructor account is available in this interaction. Use existing synthetic identities through secure sign-in; do not promote that account or reset real-user credentials for a demo.
- **Production MFA and recovery:** Application-enforced privileged MFA, account recovery/anti-lockout design and intended-device enrollment/recovery acceptance remain outstanding. Google login alone is not evidence of application-level MFA enforcement. Institute-ID aliases without a deliverable email have no safe automatic email-recovery flow.
- **Backup/integrations:** Training-resource export/preview/create-only restore excludes trainee records, attendance, marks, exams, accounts and files. Full disaster recovery is not implemented. Actual Drive OAuth/upload, OS download handling and physical printing remain separate acceptance checks.
- **Hosting automation:** Automatic GitHub-to-Firebase staging deployment is not configured. Cloud Shell is used for publishing updates, not for keeping the website or AI running. The Work executor has no authorised Firebase CLI account. On 28 October, Firebase Console opened the exact staging project, but its integrated Cloud Shell displayed `Site Unavailable / Unable to access this site` in this browser. Local build verification passed: all 56 public source files plus 5 release inputs match tested source `093bb8a...`. GitHub/Render connectors remain usable. No deployment was attempted through credentials from another service.
- **Impact and employment evidence:** No measured time saving, placement improvement, employer relationship, live vacancy or certification is claimed without evidence. Source-linked opportunities and pilot measurements must be checked and dated.

Fresh public asset requests on 28 October returned HTTP 200. `ai.js`, `style.css` and `v15/v15-student-storage.js` matched the tested release build; `app.js` and `v15/v15-auth-roles-v2.js` did not. This independently confirms that the pending institute-header source is not fully deployed.

## Exact pending Hosting release

An authorised operator can run the following inside their existing authenticated Cloud Shell. The subshell preserves the interactive session if a command fails. It uses a dedicated checkout and does not force-discard local edits.

```bash
(
set -e
cd ~
if [ ! -d eduskill-staging-deploy/.git ]; then
  git clone --single-branch --branch phase1/security-student-career-20261021 https://github.com/durgeshkadam-beep/universal-iti-instructor-automation.git eduskill-staging-deploy
fi
cd eduskill-staging-deploy
git fetch origin phase1/security-student-career-20261021
git checkout 093bb8a732ce0e44bf2c7c06eeba1929f5afd4a1
npm ci --ignore-scripts
npx firebase deploy --only hosting --project universal-iti-dk-staging --config firebase.staging.json
)
```

This is Hosting only. Confirm CLI success, compare fresh deployed assets with the tested build, then reload the authorised synthetic Instructor plan and verify the institute name. A prepared command or passing CI is not evidence of deployment.

See [DEMO-WALKTHROUGH.md](DEMO-WALKTHROUGH.md) for the demonstration sequence, acceptance observations and presentation outline. This is a tested staging prototype, not a production release certificate.
