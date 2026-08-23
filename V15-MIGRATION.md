# Universal ITI Instructor Automation V15 — Realtime Multi-User Upgrade

## What V15 changes

V15 changes the app from a local-first backup/sync model to a shared Firebase workspace.

- Google Authentication is used for Principal, Instructor and Student/Trainee access.
- Every user must be approved before first login.
- Students are approved by exact Google/Gmail address from Trainee Master.
- First login also requires a one-time 6-digit activation code created by the approving staff member.
- The Google Firebase UID is then linked to that approved member record.
- Different devices store separate Firestore documents for individual records instead of replacing one full local array.
- Attendance, marks and submissions are split by trainee entry to reduce cross-device overwrite conflicts.
- LocalStorage remains a device cache/offline fallback, not the shared source of truth.

## Existing V14 records are preserved

V15 does **not** delete the V14 local database or the V14 private Firestore workspace.

On the first approved owner/staff Google login, V15:

1. Checks whether a V15 shared workspace already exists.
2. If it does not exist, reads the existing V14 Firebase workspace for that same Google account.
3. Copies the V14 records into the new V15 shared institute/workspace structure.
4. Leaves the old V14 data in place as a rollback/safety copy.
5. Starts realtime listeners only after migration succeeds.

If V15 Firestore rules are not yet published, the migration stops and the V14 data is left unchanged.

## Firestore structure

`institutes/brdbagiti-mumbai-01`

- `members/{firebaseUid}` — approved Principal/Instructor/Student membership
- `access/{approvedEmail}` — role/workspace/trainee assignment visible only to that same email or staff
- `inviteSecrets/{approvedEmail}` — one-time activation-code hash, staff-only
- `workspaces/{workspaceId}` — shared institute/trade/session metadata
  - `trainees/{traineeId}`
  - `attendance/{date--traineeId}`
  - `marks/{practical--traineeId}`
  - `submissions/{practical--traineeId}`
  - `theory/{recordId}`
  - `practicals/{recordId}`
  - `notices/{recordId}`
  - `leaves/{recordId}`
  - `examAttempts/{recordId}`
  - other record-per-document collections

## First rollout sequence

1. Publish the V15 `firestore.rules` from this repository in Firebase Console → Firestore → Rules.
2. Open the app on the Google account that already owns the V14 Firebase data.
3. Choose Instructor or Principal and click **Continue with Google**.
4. V15 automatically migrates the existing V14 Firebase records into the shared workspace.
5. Confirm trainee/attendance/plan records are visible.
6. In Trainee Master, use **Set Gmail** for each trainee who should be allowed to log in.
7. Give each trainee the one-time activation code shown by the app.
8. On a second device, the same approved user signs in with Google; no Firebase JSON, Push or Restore step is needed.

## Important safety notes

- Do not delete the old V14 Firestore collection until V15 has been tested on at least two devices and a backup has been saved.
- Gallery photo binaries remain local/Drive-oriented in this V15 layer; metadata can be preserved, but photo binary multi-device storage should be moved to a dedicated Drive/Storage workflow.
- If two devices edit the exact same record at nearly the same time, the newest Firestore write wins for that one record. Different trainees/attendance entries do not replace the whole list.
