# Server-authorised leave review

Student requests remain available through the existing durable offline queue. A request must contain a valid 1–90 day UTC calendar span, allowed type, bounded reason/certificate fields and the Student's linked trainee identity. Requests are private to the assigned Student and authorised institute staff. Instructor/System Admin pending-request creation remains subject to the same schema and date constraints.

**Approve/Reject requires the secure backend and connectivity.** The V15 client calls `reviewLeave` through its authenticated HTTPS API. There is no direct Firestore approval fallback when the backend is missing, unavailable or cold. Guided non-AI features and creating a queued Student request do not need an AI key. Free Render cold starts can delay online review; no new paid service or provider is required.

The server verifies the Firebase ID token and workspace access, then rereads active Instructor membership and institute ownership in the same transaction as the application. An active Instructor with the assigned workspace (or institute owner operating as Instructor) may review. Student, Staff, Principal-as-reviewer, unassigned/revoked Instructor and foreign-tenant calls are rejected. Principal/System Admin still reopen locked attendance months through the existing governance workflow; review itself remains the Instructor action.

The authoritative stored application is validated, including calendar dates, 90-day limit, HTTPS certificate URL, bounded/required fields and trainee link. Approval reads every affected month lock before any write. Any submitted/approved lock aborts the entire operation; ask the Principal to reopen it. Otherwise the server saves status/reviewer/server time, all `L` attendance dates and section discovery in one transaction. Rejection changes no attendance entries. Concurrent same-decision retries return the stored result; conflicting/reversing decisions fail. Role revocation before the transaction is detected by the membership reread.

Firestore clients may create only pending, unreviewed requests or replay identical application data. Review fields/status are immutable to clients, including direct privileged SDK calls. Delete is denied, closing the delete/recreate bypass. These are **prototype Security Rules** and still require review before broad sharing. Historical reviews are not retroactively certified, corrected or imported. No original student migration is performed.

The backend helper and client validation share `shared/leave.js`; it contains no secrets. Admin SDK authority remains only on the server. The public build allowlist includes the policy; the Docker image copies it explicitly. Backend requests capture their institute/workspace/user/role before token resolution and stop before sending if that context changes. Responses from an old context cannot update the newly selected workspace. A request already sent may have committed; reload its original workspace before retrying.

## Rollout and verification

1. Complete native, actual Firebase Emulator, desktop/mobile HTTP workflow, Docker and dependency-audit checks.
2. Deploy the reviewed development commit to the existing isolated Render staging API, with auto-deploy still disabled and the Free plan unchanged. Verify the actual deployed commit and API behavior. No secret export/configuration is needed for this update.
3. Deploy Firestore rules and Hosting only to `universal-iti-dk-staging` using `firebase.staging.json`. Backend-first order avoids publishing a client that depends on an unavailable action. Existing open tabs should reload after the change.
4. In the synthetic-only workspace, test Student request, direct SDK denial, locked cross-month abort/no partial writes, Principal reopen, Instructor approval/rejection, Student reload and unchanged unrelated trainee records. Verify no production-project requests.

See [JSON audit](LEAVE-REVIEW-AUDIT-20261025.json) and Draft PR #16 for exact source and complete test/deployment evidence. Remaining Google popup/physical-device/printing/Drive and production rules/legacy acceptance are separate. This audit is not a penetration-test certificate.
