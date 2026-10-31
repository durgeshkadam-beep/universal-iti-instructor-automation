# Free-first assistance

See [production readiness](PRODUCTION-READINESS.md) for configuration, costs, limits and deployment steps.

- Offline: `shared/guidance.js` supplies Marathi/Hindi/English career guidance, honest resume outlines and text mock-interview questions without a key.
- Optional AI: client `V15Sync.backendRequest` sends only explicitly entered text, with consent, using a Firebase ID token. No shared key is accepted or stored by the browser.
- Trusted API: `server/service.js` checks active roles/workspace membership and quotas, then calls a configured Ollama server or Gemini. `AI_PROVIDER=none` makes no external calls.
- Keys and model settings exist only in backend environment/secrets. Responses are plain-text drafts. Teaching-plan JSON also goes through this boundary.
- Market counts come from reviewed source records, never model guesses. An AI-generated vacancy or salary claim must not be entered as evidence.

Adapters have deterministic contract tests. Live provider quality/availability is not verified without owner configuration. Paid use is configurable later, not enabled automatically.
