# Dependency maintenance (25 October 2026)

Use Node 22 and the checked-in lockfile: `npm ci --ignore-scripts`. Run `npm test`, `npm run test:rules`, `npm run test:e2e`, `npm run build:web`, `npm run audit:production` and `npm run audit:all`. CI also builds and checks the real Docker image. Both audit commands fail on moderate/high/critical findings and on an unavailable registry after bounded retries. The full gate explicitly includes development dependencies, even when the operator has a production-only npm configuration. Audit JSON reports are written into `test-results` and included in CI artifacts.

The 25 October audit initially reported six findings (one high, five moderate), all through development tooling. Production-only audit had no findings. Same-range lockfile updates replace body-parser 1.20.8/2.3.0 with 1.20.9/2.4.0. See [body-parser advisory](https://github.com/advisories/GHSA-27r3-jxmh-p828).

Firebase CLI 15.34.1 remains installed. Its latest available manifest still pulls old transitive dependencies, so two narrowly scoped overrides are used instead of accepting npm's suggested breaking CLI downgrade:

| Consumer | Override | Reason and compatibility check |
| --- | --- | --- |
| `@google-cloud/pubsub` (CLI dependency) | `@opentelemetry/core` 2.8.0 | [Baggage parsing advisory](https://github.com/advisories/GHSA-8988-4f7v-96qf). Pub/Sub uses the W3C trace-context propagator; the executable test injects/extracts an actual trace through its tracing implementation. |
| `gaxios@6` (CLI dependency) | `uuid` 11.1.1 | [Buffer bounds advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq). CommonJS export compatibility is exercised by sending a real multipart HTTP request to a loopback server and checking its generated boundary and payload. |

These overrides cross the consumers' declared dependency ranges. They are restricted to those consumers; the production Admin SDK dependency tree is unchanged. Full Emulator and browser validation is required when changing them. This does not certify every optional Firebase CLI service or Pub/Sub feature; this application does not provision/use a Pub/Sub service. Keep the existing grpc override unchanged. When upstream adopts patched compatible versions, remove each override in a reviewed update and rerun the same checks. Do not use `npm audit fix --force` without reviewing its proposed major-version/downgrade changes.

A clean advisory report is a point-in-time registry result, not a penetration-test certificate. Deprecation warnings may remain without a current advisory. This maintenance changes development dependencies and CI only; no hosting/backend/rules/provider deployment, student migration or real-record write is required. Latest complete results are recorded in Draft PR #16.
