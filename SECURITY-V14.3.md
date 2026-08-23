# Universal ITI Instructor Automation — V14.3 Security Notes

## Fixed in V14.3

- High-risk free-text rendering (trainees, notices, gallery captions, extra topics, leave/discipline, holidays, visits and projects) now uses DOM/textContent rendering or neutralised free-text instead of trusting raw HTML.
- URL fields used for certificates/teaching materials accept only HTTP/HTTPS links.
- Staff and trainee role-bearing app sessions are no longer trusted from persistent localStorage after a full reload. Users authenticate again after reload/restart.
- Change PIN now updates the actual `DATA.users` credential used by staff login; the default principal/instructor legacy PIN is kept consistent where applicable.
- Principal-only and instructor-only mutating actions receive explicit runtime role guards in addition to hidden UI controls.
- Google Drive JSON backups exclude instructor PIN, principal PIN, staff account PINs and trainee PINs.
- Firebase auto-sync pauses when cloud data is newer than the device's verified sync base, reducing accidental last-writer overwrites. A new/unbased device is told to restore first rather than silently overwrite existing cloud records.
- Google Drive archive attempts to reuse an existing folder created through the same `drive.file` OAuth permission before creating a new folder.
- The obsolete duplicate `firebase/firestore.rules` file was removed. `firebase.json` continues to use the root `firestore.rules` file.
- The service worker now removes the legacy persistent session before `app.js` starts and loads `security-patch.js` before the DVET admission importer.

## Active Firestore security model

The active root rule permits access only when Firebase Authentication is present and the signed-in Firebase UID matches the top-level `itiInstructorUsers/{userId}` path. All other document paths are denied.

## Important remaining architecture limits

V14 remains a local-first browser/PWA application. These limits cannot be made cryptographically secure only with client-side JavaScript:

1. A person who fully controls an unlocked device/browser and DevTools can inspect or alter local browser data. Runtime role guards are defence-in-depth, not a server-side authorization boundary.
2. Trainee Roll No. + PIN accounts are local app credentials, not Firebase Authentication accounts. A future production version should move trainee/staff authorization to Firebase Auth/server-enforced roles if trainees will use the system independently.
3. Staff users/PINs are intentionally not synced to Firestore. This protects PINs but means staff-account provisioning is not yet a true cross-device identity system.
4. Firebase App Check is not enabled yet. It should be enabled before broad public rollout to reduce automated abuse of the Firebase backend.
5. Some third-party browser libraries are still loaded from external CDNs. A later production hardening pass should self-host/pin critical dependencies or apply integrity controls where practical.

## Operational recommendations

- Keep Google and GitHub accounts protected with passkeys/2-step verification.
- Keep the Google Drive OAuth scope at `drive.file`; do not broaden it to full Drive access.
- Use the `/start.html` entry point / installed PWA so the latest service worker and security patch are prepared before the main app opens.
- On a new device with existing cloud data, use Restore from Cloud first. Do not force-overwrite the cloud copy unless the newer cloud data is intentionally being discarded.
- Treat downloaded local safety backups as sensitive because local/manual backups may still include credentials needed for complete offline recovery; Drive backups are sanitised automatically.
