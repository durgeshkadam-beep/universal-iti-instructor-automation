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
