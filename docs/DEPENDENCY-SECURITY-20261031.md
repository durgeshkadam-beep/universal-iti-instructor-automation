# Dependency advisory correction — 31 October 2026

The continuing MCQ work detected failing dependency gates on the unchanged previously deployed dependency tree: 6 production and 13 development-inclusive moderate findings. Application validation run 41152289304 passed its application, Docker, emulator and browser steps but failed the production audit. Earlier successful audit results describe their run time, not a permanent clean bill of health.

Primary upstream advisories inspected:

- [glob GHSA-3g3m-2fjr-6pw4](https://github.com/isaacs/node-glob/security/advisories/GHSA-3g3m-2fjr-6pw4): cancellation can leave an asynchronous filesystem walk running. The documented patched range starts at 14.0.2.
- [minimatch GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249): glob-parts amplification can consume excessive resources. The advisory identifies 11.0.1 as patched; the registry audit applies a broader affected range than the maintainer's specifically reproduced version.

The lockfile now resolves glob **14.0.3** and minimatch **11.0.3**. No audit finding is suppressed and no obsolete Firebase CLI downgrade is used. Root package ranges and their previously resolved SDK/tool versions are retained (Firebase CLI 15.34.1, Admin 14.5.0, Web SDK 12.16.0, Playwright 1.56.1); exact transitive versions and integrity hashes are checked in. Final production and development-inclusive audit results are maintained on PR #16.

## Preserving existing tooling

Firebase CLI and Superstatic still call CommonJS `require('minimatch')` as a function. The patched minimatch package exposes a named `minimatch` function. A private five-line adapter in `vendor/minimatch-compat` exports that unmodified function with the upstream named properties attached. It delegates all matching/limits to the exact pinned `minimatch-engine` npm alias for upstream minimatch 11.0.3; it contains no copied matching algorithm. Other modern consumers receive the upstream class/object API directly.

The scoped local-file overrides resolve from the hoisted Firebase CLI/Superstatic packages to the repository's vendor directory. The direct development dependency and checked-in lockfile record the adapter. Docker copies its package files before `npm ci --omit=dev --ignore-scripts`; this avoids relying on install scripts or patching downloaded `node_modules`. The adapter and dependencies are outside the public web build allowlist. No API key, environment variable, auth role, paid resource, production rule or real institute record is changed by this dependency commit.

An isolated candidate install initially produced dangling local override links. A surrounding old dependency directory masked that problem during a superficial callable check. The resolved module path was then inspected, the relative paths were corrected, and a clean isolated install confirmed the actual vendored adapter and patched engine. An unconstrained lock regeneration also updated root development tools; its browser run failed because the newly required browser binary was unavailable. Root SDK/tool versions were then constrained back to their existing tested resolutions. Those initial candidates and failed browser attempts are not presented as final validation.

Five executable compatibility tests cover Firebase app/Firestore compat registration, Firebase CLI callable/named/defaults matching, actual Hosting file preparation excluding private files/source maps, Superstatic redirect/header patterns, and ZIP directory traversal plus asynchronous glob/cancellation. A broadly regenerated lockfile also split Firebase compat registrations and failed the first emulator suite; the correction starts from the original lockfile and targets the affected packages instead. Full native, all eight emulator, complete browser and CI Docker checks are required against the final dependency tree. A previous 401-native/96-browser run used the old dependency tree and is retained as feature evidence, not final dependency acceptance.

Staging remains the authorized deployment target. This scoped correction does not certify all dependencies against future advisories or complete production acceptance. MFA/recovery, complete backups, live account/integration acceptance and the remaining role work remain separate.
