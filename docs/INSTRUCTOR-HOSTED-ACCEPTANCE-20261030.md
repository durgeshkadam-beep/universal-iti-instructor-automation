# Instructor staging publication and hosted checks — 30 October 2026

## Published release 74b106b

The operator reported completion of the approved staging deployment. Independent HTTPS checks against `https://universal-iti-dk-staging.web.app/` verified every one of the **68 public manifest entries**: all response bytes matched the manifest, the 67 source files matched commit `74b106b96de6a46b495a821834742db8a2c7bf44`, and generated public runtime matched `config/staging.public.json`. Year planning, safe reports, Drive guards and the updated service worker are available live. This is Hosting evidence; the active Firestore rules release was not independently read back through an authenticated operator API.

Real Chromium HTTPS navigation through the environment's trusted network certificate opened the hosted `/v15/` login screen at 1440×1000 and 390×844. V15, planning and Drive globals were present, there were no JavaScript page errors, screenshots were inspected, and body width matched the viewport. No credentials were used and no institute/trainee record was changed. This does **not** accept password/Google sign-in or post-login business flows. Initial direct navigation failed because this Work environment requires its network proxy/trusted CA; configuring that browser environment resolved navigation without disabling certificate verification.

Backend `/healthz` returned 200 with `ok: true`; `/security-version` returned `adminDelegation: v1`, `yearPlanning: v1`. An anonymous capabilities POST was denied with 401 and the expected staging CORS origin. The existing Render backend remains unchanged.

## Defect discovered during hosted checks

Both browsers failed to load the existing Chart.js CDN script. Independent HTTP checks confirmed `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js` returned **404**. `Dashboard.renderCharts` silently skips rendering when Chart is absent, so a clean JavaScript error log alone did not prove working dashboard charts.

The correction retains Chart.js **4.4.4**, using its unmodified official npm UMD asset and MIT license inside `assets/vendor`. The shell loads the same-origin asset; the public build and both existing cache allowlists include it. No dashboard calculation, role, Firestore rule or backend change is made. Native regression checks pin the SHA-256 and public/cache inclusion. The desktop/mobile browser regression blocks every external HTTPS request, signs into a synthetic Instructor using real Auth/Firestore emulators, checks the chart dataset against actual fixture records, inspects nontransparent canvas pixels, and checks repeat render/viewport containment. Vendor assets are outside npm advisory scanning.

Validation and exact publication status for this small follow-up are maintained in PR #16. Until this follow-up Hosting release is separately published, the live verified release remains **74b106b** and the CDN chart defect remains live. No production deployment or whole-project readiness is certified.

## Remaining acceptance

- Actual hosted Instructor sign-in/save/reload, individual lesson/demo plan history and full module acceptance.
- Real Google Drive consent plus upload/download; existing emulator PDF tests mock OAuth/Drive.
- Reviewed scanned-PDF OCR, source-backed practical/industry guidance and secure optional personal AI configuration.
- Supplied MCQ-file acceptance; then Student, Admin/Principal and Staff review.
- Production MFA/recovery and full disaster recovery remain separate unfinished work.

## Follow-up deployment reported by operator

The operator subsequently reported completing the Hosting publication of **7c4f641**. Initial direct checks in this Work session were blocked by its network approval/tunnel, the browser plugin could not initialise, and the web retrieval fallback could not open the staging endpoints. Those attempts do not prove a Hosting failure or successful release.

A separate **Published staging verification (read only)** Actions workflow now checks the public release from a GitHub runner. It compares the exact pinned source commit's generated staging manifest against the live manifest and downloads/hashes every listed asset, checks public backend health/version and opens fresh desktop/mobile browser contexts. The browser permits only GET requests to public static hosts, loads the same-origin Chart.js, renders a detached synthetic chart and checks canvas pixels plus login-screen containment. It does not sign in, write data or access Firestore/Drive. Credentials and private records are not provided to this job. Its exact results are recorded on PR #16.

The workflow runs when its own configuration changes (and supports manual dispatch after becoming available on the default branch); ordinary future app commits do not silently redefine the expected deployed release. It checks commit **7c4f6415abc885f4ffc8a6464bc081153a018b89** explicitly, without deploying anything. Verifier-only commits are outside the web build allowlist and do not require another app deployment. This checks public assets and an unauthenticated browser shell, not Instructor password/Google login, business saves, active security rules or real Drive/AI acceptance.
