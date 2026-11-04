# Gemini Free Tier for Instructor and Student — staging rollout (31 Oct 2026)

## Target
**Real generative AI for both roles** via the existing authenticated Render staging API, not only local guides. Use Gemini Free Tier if the actual Google AI Studio project qualifies. **Do not start billing to enable this.** Do not put the API key in GitHub, Firebase Hosting, client JavaScript, local storage, PR comments, logs, or ChatGPT.

The currently published Firebase Hosting release is `2a1a3c11a50c73a91839fd8d0138fc7394e4169d`. Source changes on PR #16 are **not hosted** until a separately validated new release. The existing Render service is `universal-iti-staging-api` in Singapore on the Render Free plan; Render's free server plan is separate from the **Google Gemini API Free Tier**.

## Features
- **Instructor**: `AI Assistant` → choose real approved Theory/Practical topic → `Open AI / Manual Draft`; with the secure backend configured, `Generate AI draft` requests a reviewable JSON Lesson/Demonstration Plan. The teacher must preview, edit and explicitly approve using the existing authoritative teaching-plan save. Free local starter is always available without a key.
- **Student**: `Career Guidance, Resume & Mock Interview` → Marathi, Hindi or English → practice/answer → agree to sharing only that text → `Request optional AI draft` when authenticated backend capabilities say configured. These are unofficial practice drafts, not jobs, placement guarantees, grades or certificates. Mock interview content receives qualitative guidance only.
- **Student Career Mentor — AI Chat**: same Career Coach page, separate chat section. After signed-in Student checks the per-chat consent box, `Send to AI Career Mentor` invokes backend `careerChat`. The provider receives the current question and **only recent complete user/assistant pairs** (bounded to 8 historical messages and 6000 characters including the current question). The conversation is **session-only**, not stored in Firestore or browser storage. `New chat / Clear`, workspace/account changes and language changes invalidate the local context. Plain text bubbles prevent script injection. No verified job vacancies, salaries, employer counts, placement or certification are invented.
- **Availability**: If the provider isn't configured the Send button stays disabled and free keyless practice remains available. AI provider quota and invalid/unsafe content show clear errors, preserving the unsent question; the app does not label static templates as AI-chat responses. An AI configured boolean is not evidence that a real provider call will succeed.
- **Both**: No direct browser API key. Verified Firebase user and workspace role are required. Quota errors leave deterministic, clearly labelled no-key guidance available. Visible app counters/limits are not proof of Google's remaining Free Tier quota.

## Google AI Studio and Render operator setup
1. In **Google AI Studio** confirm that the specific Google **API project/key** is eligible for the **Free Tier**, has **no paid billing enabled**, that `gemini-2.5-flash-lite` is available, and check the active project **RPM, TPM, RPD** limits. Rates can change; do not assume a fixed number of free daily requests. Google states Free Tier content may be used for product improvement, so **real student personal records must not be sent**.
2. In the existing **Render staging service** https://dashboard.render.com/web/srv-dbdfciks728c73botalg → **Environment** securely configure or confirm (do **not** reveal the actual value):
   - `AI_PROVIDER=gemini`
   - `AI_MODEL=gemini-2.5-flash-lite` (if shown eligible for your project)
   - `AI_API_KEY=<your-secret-only-in-Render>`
   - `AI_DAILY_LIMIT=5` (per authenticated user/app limit; adjust for the real pilot)
   - `AI_GLOBAL_DAILY_LIMIT=100` (shared across Instructor and Student; **app** guard, not provider quota)
   Keep existing Render staging service-account credentials and `GCLOUD_PROJECT=universal-iti-dk-staging`; do not overwrite/replace the rest of the environment.
3. Deploy the tested PR #16 **backend** to the isolated Render staging service only after its full CI passes. `autoDeploy` is currently off. Do **not** deploy backend code from main or a different project. The release should not change Firebase rules/data or other roles. Inspect deploy logs for success; no private prompts/key may appear in logs.
4. Deploy the matching, validated PR #16 **Hosting** release independently via the guarded helper. Hosting alone cannot turn on Gemini: the Render backend needs correct Free Tier env settings and deployment.
5. Using **synthetic/demo accounts**, confirm Instructor capability `aiConfigured=true`, request one small Lesson/Demonstration JSON draft; then confirm Student capability and test Career, Resume and Mock Interview in Marathi/Hindi/English. Verify consent, correct workspace context, rejection of Aadhaar/phone/email identifiers, quota/503 fallbacks and no automatic saving or grade updates.
6. For real institute rollout, obtain appropriate organisational approval and privacy review before sending any non-public training or learner text to Google's Free Tier. Free Tier alone does **not** guarantee zero cost if the API project is already paid. We do not provision paid billing or assume the Google key has a specific quota.

## Safety and testing limitations
The browser and backend never need a Gemini key in their public build. An input privacy gate blocks **obvious** Aadhaar-like 12-digit numbers, Indian phone numbers and email patterns before the external call. It cannot detect every possible name, address or identifier; don't use personal data. Instructor/student budgets are accounted transactionally per day with a project-wide guard. Even provider errors consume app allowance as a conservative anti-abuse measure. Real Google usage must be monitored in AI Studio and remains subject to its **separate project-level quotas**.

Sources: https://ai.google.dev/gemini-api/docs/pricing , https://ai.google.dev/gemini-api/docs/rate-limits , https://ai.google.dev/gemini-api/docs/billing
