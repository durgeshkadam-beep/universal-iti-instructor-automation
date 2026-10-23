# Deploy the isolated staging API on Render

Status: the backend implementation, container and staging Blueprint are supplied.
**No Render service has been created and the hosted MCQ/AI API is not yet enabled.**
The Render account is connected to DURGESH's workspace. Firebase Hosting serves the frontend
at https://universal-iti-dk-staging.web.app/v15/.

## Account and cost boundary

Connect a Render account with access to this repository. Use `render.yaml` from
`phase1/security-student-career-20261021`, not `main`. The Blueprint selects the
Free Docker web service in Singapore, manual deployment, and `AI_PROVIDER=none`.
It provisions no additional database, disk, worker or AI subscription. Creating
this file alone does not deploy anything.

Free web services sleep after 15 idle minutes and can take about a minute to wake.
Monthly instance-hour, bandwidth and build limits apply. With no payment method,
exhausted allowances can suspend services/builds; a payment method can allow
overage charges. Review the account's current plan and spending controls before
creating the service. Free hosting is for this synthetic staging demonstration,
not reliable scheduled production examinations. No paid upgrade is authorized.

## Backend identity (private setup)

Use a dedicated service account **in `universal-iti-dk-staging` only**. Give it
Firestore read/write permissions (`roles/datastore.user`) and Auth user-read
permissions (`roles/firebaseauth.viewer`) for revoked/disabled-token checks.
Do not grant Owner, Editor or Firebase Admin, and do not reuse an operator login
or a production identity. Server Firestore SDKs use IAM rather than client rules;
the service itself enforces membership, role and workspace authorization.

Prefer workload identity on a host that supports it. This Render staging recipe
uses an isolated service-account JSON secret because Render does not supply a
Google workload identity by default. If organization policy forbids account keys,
use an approved workload-identity host instead; do not weaken that policy.

1. In the service's **Environment → Secret Files**, mount the staging credential
   as `iti-staging-service-account.json`. Render exposes it at
   `/etc/secrets/iti-staging-service-account.json` at runtime.
2. Keep the JSON out of Git, chat, public hosting, build arguments and image
   layers. Keep any operator copy outside this checkout with restricted access.
3. The Blueprint sets `GOOGLE_APPLICATION_CREDENTIALS` to that private mount.
   Without it the first deployment deliberately fails before opening the server.
4. `ITI_STAGING_ONLY=true` checks the exact staging project, credential project,
   service-account email, RSA key, HTTPS origin allowlist and optional AI config.
   Emulator/alternate Firebase settings and production origins are rejected.
   This validates configuration, not IAM access; authenticated acceptance below
   must still succeed. Do not disable the guard to make a deployment pass.

The direct MCP deployment can instead set backend-only
`ITI_STAGING_SERVICE_ACCOUNT_JSON` to the service-account JSON, leaving
`GOOGLE_APPLICATION_CREDENTIALS` unset. The same project/key/origin validation
applies; selecting both sources is rejected. The value is consumed in memory
and removed from the process environment before Firebase initialization. Never
put this value in a Docker build argument or source. Direct MCP configuration is
managed on the Render service; the supplied Blueprint remains a separate
secret-file recipe and must not be applied over that service without reconciling
credential sources. Connection alone does not establish hosted API readiness.
Rotate/revoke the staging key when the demonstration ends.

## Deploy, connect and verify

1. Create the Blueprint/service from the development branch. Add the secret
   file, then manually deploy the latest CI-passing commit. Do not merge main.
2. Verify `GET https://YOUR-SERVICE.onrender.com/healthz` returns `{"ok":true}`.
   This checks process availability only. `POST /api` without a Bearer token must
   return 401, and an unrelated browser Origin must return 403.
3. Set **only** `apiUrl` in `config/staging.public.json` to
   `https://YOUR-SERVICE.onrender.com/api`. Preserve the isolated Firebase config.
   Keep all service-account and AI secrets exclusively in the backend.
4. Build and redeploy the frontend using `firebase.staging.json`, explicitly
   selecting `--project universal-iti-dk-staging`. Clear old service-worker state
   or refresh the site so the new public runtime file is loaded.
5. In two browser profiles, use the synthetic Instructor and Student fixtures.
   Publish a small synthetic exam with a current schedule; start and submit it
   as the Student. Confirm the expected score, reload, and retry submission:
   the official result must remain unchanged. Confirm the Student cannot publish
   or retrieve `examKeys`/`examSessions`, and Staff cannot publish or start exams.
6. Try an inactive/revoked synthetic test account, an unassigned workspace, a
   late submission and offline/slow recovery. Confirm failures are visible and
   never fall back to browser grading. Do not alter a real student's account.
7. Re-run all five role portals and mobile navigation. Record the deployed commit,
   API origin, tested paths and results in the validation report. Until these
   pass, hosted MCQ remains unverified even if `/healthz` is green.

AI remains optional: keyless multilingual templates already work. To enable
generation later, configure a model and backend-only provider secret, consent,
quota and provider spending controls as described in PRODUCTION-READINESS.md.
Test actual Marathi, Hindi and English responses with an instructor before
claiming live AI quality. A free Render service is not an Ollama model host.

## Stop or roll back

Keep automatic deployments off. If hosted acceptance fails, restore staging
`apiUrl` to empty, redeploy the frontend, and suspend the API. Guided features
remain available; secure online exams remain unavailable. Preserve synthetic
results for diagnosis. Revoke the staging service-account key when retiring the
service. No production migration or data cleanup is part of this procedure.

References checked 22 October 2026:
- https://render.com/docs/blueprint-spec
- https://render.com/docs/configure-environment-variables
- https://render.com/docs/free
- https://firebase.google.com/docs/firestore/security/iam
- https://firebase.google.com/docs/auth/admin/manage-sessions
