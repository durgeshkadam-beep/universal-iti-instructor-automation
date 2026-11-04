# Staging Hosting release — Instructor PR #16

**Scope:** Publish **only Firebase Hosting** for `universal-iti-dk-staging`. Keep `main`, production, Auth users, Firestore data/rules, Cloud Functions, the Render API, and existing trainee records unchanged. This procedure does **not** create or test real MCQ papers or Drive uploads.

## Prerequisites

1. Identify the **exact 40-character commit** of the approved Instructor branch. Confirm that **Application validation (no deployment)** passed for that exact SHA. The older **Published staging verification** checks only the already-published release; it is not evidence that the new UI is hosted.
2. Use a clean checkout of that exact commit, with Node 22, Git, and Firebase CLI access for the **staging project only**. The authenticated operator needs permission to deploy Staging Hosting. Do not paste any credentials or tokens into this repository or ChatGPT.
3. If GitHub run metadata is private, supply a GitHub token through an operator-controlled `GITHUB_TOKEN` environment variable with read-only Actions metadata access. The helper fails closed on an inaccessible CI check.

## Commands from the repo root

```bash
node scripts/deploy-staging-hosting.js --commit FULL_VALIDATED_40_HEX_SHA
```

This performs read-only local and GitHub CI preflight; it **does not deploy**.

After confirming the project, commit and successful CI run, the **authorized staging operator** can execute:

```bash
node scripts/deploy-staging-hosting.js --commit FULL_VALIDATED_40_HEX_SHA --execute
```

The helper performs locked dependency installation, builds the explicit staging runtime, deploys **only Hosting** with `firebase.staging.json` and `--project universal-iti-dk-staging`, then compares all public hosted asset hashes with the exact commit and checks the staging backend's public health/version. A deployment command succeeding without post-deployment asset verification is **not** sufficient acceptance.

## Post-deployment acceptance

- In a **synthetic/demo Instructor account**, open **Secure MCQ Exams** on desktop and mobile. Verify Advanced template download, JSON upload, preview, explicit review, and publish. Do not publish into a real class without separate authorization.
- Check **Records & Backup → Plans & Other Formats** after switching between assigned demo workspaces: refreshed trainee/practical selectors, print/PDF orientation, and explicit Drive consent.
- Validate synthetic Student MCQ start/submit and protected answers/results via the authorized staging backend.
- Save the run link and exact published SHA on PR #16. Update any pinned read-only verification workflow to that SHA only after the release is independently verified.
- This is **not** a production approval or full database backup. Real-account Drive authorization, MFA/recovery and genuine student-data acceptance remain separate.

If staging authorization is not configured, leave Hosting unchanged and record the blocking permission; **never** substitute a production Firebase account/project.
