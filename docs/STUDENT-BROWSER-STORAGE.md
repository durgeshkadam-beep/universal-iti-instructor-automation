# Student browser draft isolation

Development follow-up to staging commit `0d6d2d1c159776c9f80f1b82d7a8a98f87e5eb64`.

Self-ratings and learning goals now use version 2 browser keys containing the exact Firebase project, institute, authenticated UID, workspace and trainee identity. JSON array encoding prevents separator collisions. Missing identity fields fail closed. The shared helper loads before the Student screens. Queued saves recheck that full scope before writing, and late reads cannot hydrate a newly selected scope.

Version 1 keys omitted project/institute information. Their ownership cannot be inferred safely from the currently selected workspace. The application therefore leaves those keys and pending markers intact, shows a notice, and never automatically imports or uploads them into a tenant. Existing cloud plans still hydrate through the authenticated current-institute Firestore path. New edits use version 2 only. A retained legacy offline-only edit will not appear as the current plan: keep the device/browser data and arrange reviewed recovery; automatic recovery, merge and a recovery UI are not implemented. Do not clear browser data while an older draft is needed.

This isolates application storage namespaces; it does not encrypt browser data or protect against another person using the same browser profile. Quick PIN remains a convenience screen lock. No Firestore schema/rules, backend, role grants, production configuration or real student records change in this follow-up.

Regression coverage demonstrates isolation for the same UID and workspace across institutes and projects; return to the original scope; current cloud hydration; preservation/non-upload of ambiguous legacy pending data; missing-project refusal; and the existing stale account/institute save regressions. These DOM tests are not hosted acceptance. Run full CI and browser/emulator suites before a staging release.
