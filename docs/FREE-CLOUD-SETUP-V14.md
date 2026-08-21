# V14 Free Cloud Setup

## What stays free/local
The app works without Firebase or Google Drive. Existing records remain in the browser and can be exported as JSON.

## A. Firebase / Firestore sync
1. Create a Firebase project.
2. Register a Web App and copy the Firebase configuration object as JSON.
3. Create one Cloud Firestore database.
4. Enable Firebase Authentication → Sign-in method → Google.
5. In Firestore Rules, use the included `firestore.rules`. Do **not** leave Firestore in public/test mode.
6. Host the app on an HTTPS site (Firebase Hosting is suitable) or use localhost for setup/testing. Add the hosting domain to Firebase Authentication authorized domains if required.
7. Open the app → Cloud & Drive → paste Firebase Web configuration → Connect Google + Firebase.
8. On the first device, press **Push This Device → Cloud**.
9. On another device, sign into the same Google account and press **Restore Cloud → This Device** once. After initialization, auto-sync can remain enabled.

### Firestore structure
Data is split into section documents under the signed-in user's UID. This avoids one oversized database document and keeps each Google account isolated by security rules. Gallery image binaries are intentionally not uploaded to Firestore in V14.

## B. Google Drive archive
1. In Google Cloud Console, enable Google Drive API.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Client ID of type **Web application**.
4. Add the URL where this app is hosted to Authorized JavaScript origins.
5. Copy the Client ID into Cloud & Drive → Google OAuth Web Client ID.
6. Leave Drive folder ID blank the first time. The app will create `Universal ITI Instructor Automation` and remember its ID on that device.
7. Click **Connect Google Drive**.
8. Use **Save Full Backup to Drive** for JSON backups.
9. Generate any report from Reports, then use **Save Last Generated Report PDF** to archive that report.

The Drive connection requests `drive.file`, a limited scope intended for files the app creates/manages. If you manually paste a folder ID, use a folder previously created/authorized through this app; otherwise Google may reject access under the limited scope.

## C. Safe upgrades
V14 uses schema version 14. When older local records are first opened, the app creates `iti-v14-pre-upgrade-snapshot` in browser storage before migration. Importing a backup creates a pre-import snapshot as well.

Before a major future upgrade:
1. Cloud & Drive → Download Safety Backup.
2. If Drive is connected → Save Full Backup to Drive.
3. Install/update the app files.
4. Open and verify trainee count, attendance, syllabus and plans.
5. If needed, restore the JSON backup.
