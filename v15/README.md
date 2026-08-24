# Universal ITI Instructor Automation — V15

V15 remains isolated under `/v15/` so the root V14 app and V14 Firestore collection stay available as rollback/migration sources.

## Consolidated runtime

The V15 loader now uses a small set of purpose-built modules instead of the previous chain of role/auth patch scripts:

1. `v15-core.js` — Firebase references, migration primitives and base helpers.
2. `v15-data.js` — record-level Firestore reads/listeners.
3. `v15-access.js` — approved Gmail/student linking helpers.
4. `v15-ui.js` — base UI bridge.
5. `v15-auth-roles-v2.js` — Google authentication, redirect/session restore and role authorization.
6. `v15-workspaces-v2.js` — Trade + Session + Batch isolation, workspace lifecycle and Principal summary documents.
7. `v15-governance-v2.js` — durable operation queue, audit trail, recycle bin, attendance locks, trainee identity index and Drive gallery archive.
8. `v15-portals-v2.js` — System Admin, Principal, Instructor, Staff and Student portals.

The old V15 patch files remain in the repository only as history/rollback material; `v15/index.html` no longer loads them.

## Role model

- **System Admin** — technical account/workspace setup, recovery and recycle controls.
- **Principal** — highest institute operational authority; institute-wide Trade/Batch summaries, staff access, notices, inspection and reports.
- **Instructor** — teaching, attendance, trainee, evaluation and student-account workflow for assigned Trade/Batch workspaces.
- **Staff** — read-only support portal.
- **Student** — own trainee/attendance/marks/leave/test/training data only.

The original V14 migration owner may deliberately enter System Admin, Principal or Instructor views. Other accounts must match the role approved for their Gmail.

## Multi-trade + academic-session model

One Firestore workspace represents exactly one **Trade + Session + Batch**. Workspaces can be **active** or **archived**. Principal reads all active workspaces; Instructor/Staff/Student remain limited to their assigned workspace IDs.

Each Instructor workspace maintains a compact `state/principalSummary` document. Principal dashboards and reports use these summary documents instead of reading every daily attendance record from every Trade.

## Governance

V15 now includes:

- durable local operation queue for temporary offline work;
- append-only audit log;
- recycle bin for deleted official records;
- institute-wide trainee identity index (Application/PRN/Registration when available);
- monthly attendance submit → Principal approve/reopen workflow;
- Institute notices targeted to all users or one Trade/Batch;
- Google Drive gallery archive metadata;
- archived academic sessions/workspaces;
- consolidated Principal institute reports and inspection readiness.

## Required Firestore rules

After any governance/rules update, publish the current root `firestore.rules` in:

**Firebase Console → Firestore Database → Rules → replace all → Publish**

The root rules and `v15/firestore.rules` are kept aligned. The V14 private collection is still permitted for the same V14 owner so rollback/migration remains possible.

## Automated tests

Run locally or in GitHub Actions:

```bash
node tests/v15-production-test.js
```

The test checks JavaScript syntax, consolidated-loader architecture, role/governance features, Firestore rule markers and responsive PWA orientation. GitHub Actions workflow: `.github/workflows/v15-production-tests.yml`.

## Pilot URL

`https://durgeshkadam-beep.github.io/universal-iti-instructor-automation/v15/`

Keep V14 until real-account testing passes for System Admin, Principal, two Instructors in different Trades, Staff and at least one Student, including realtime sync and an offline/reconnect test.
