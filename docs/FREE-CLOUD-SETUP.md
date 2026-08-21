# Universal ITI Instructor Automation — Free Cloud Setup

## 1. What the current V7 does

The ZIP you have now is still a **local-first prototype**. Its data is stored in the browser using `localStorage`.

That means:
- Instructor A on phone A does not automatically see data on phone B.
- Closing the browser does not delete data, but clearing site data can delete it.
- Reports are downloaded to the device; they are **not automatically saved to Google Drive** yet.
- The Syllabus AI screen currently has a local parser/demo path. It is not yet connected to Gemini.

Do not put real multi-instructor production data into this version until Firebase is connected.

## 2. Recommended zero/near-zero-cost architecture

Use:

- **Firebase Authentication** — instructor/principal accounts
- **Cloud Firestore** — users, trades, batches, syllabus, calendar, attendance, evaluation
- **Firebase Hosting** — publish the web/PWA
- **Firebase AI Logic + Gemini Developer API** — syllabus analysis and plan generation
- **Firebase Storage** — uploaded syllabus PDFs and generated files
- **Google Drive (optional)** — archive/print reports when you specifically want them in Drive

Firebase currently provides no-cost quotas for Firestore and Hosting on the Spark plan. Firestore's current free quota is 1 GiB stored data, 50,000 reads/day, 20,000 writes/day and 20,000 deletes/day. Check the official pricing page before production because quotas can change.

## 3. Firebase project

1. Open the Firebase Console.
2. Create a project, for example: `universal-iti-automation`.
3. Add a **Web App**.
4. Copy the Firebase configuration into `config/firebase-config.js`.
5. Enable Authentication → Email/Password.
6. Create Firestore Database.
7. Enable Storage.
8. Enable Hosting.

Do not put a Gemini secret API key directly into this repository.

## 4. AI setup

Firebase AI Logic can call Gemini from a web application and can use Firebase App Check to protect the AI calls.

In Firebase Console:

1. AI Services → AI Logic → Get started.
2. Choose **Gemini Developer API** for the no-cost starting path.
3. Enable/configure App Check.
4. Add the Firebase AI Logic web SDK.
5. Use a model configured for structured JSON output.

The AI should be used for:

**AI work**
- Extract modules from PDF/DOCX.
- Extract practical topics.
- Extract theory topics.
- Identify hours and learning outcomes.
- Generate demonstration-plan content when official content is not supplied.
- Generate lesson/theory-plan content when official content is not supplied.

**Normal program logic — NOT AI**
- Calculate working days.
- Skip holidays.
- Allocate hours to dates.
- Generate week numbers.
- Calculate completion percentage.
- Detect schedule delay.

This separation makes the calendar predictable and auditable.

## 5. Google Drive

Google Drive should be treated as a **file archive**, not as the main database.

Recommended structure:

Google Drive
└── Universal ITI Automation
    ├── Institute
    │   ├── Syllabus
    │   ├── Annual Plans
    │   ├── Split-up Syllabus
    │   └── Reports
    └── Instructors
        ├── Instructor A
        └── Instructor B

Firestore stores the record and the Drive file ID/link.

For automatic Drive upload, the app will need Google OAuth/Drive API permission. This is a separate step and should be added after Firebase login/data sync is working.

## 6. Multi-instructor data model

Every record should carry ownership fields:

```text
instituteId
instructorId
tradeId
batchId
academicYear
```

Example:

```text
instructors/{instructorId}
trades/{tradeId}
batches/{batchId}
syllabi/{syllabusId}
modules/{moduleId}
calendar/{calendarId}
trainees/{traineeId}
attendance/{attendanceId}
reports/{reportId}
```

Firestore Security Rules must ensure an instructor can read/write only their own workspace, while Principal can see the institute-level records.

## 7. Suggested rollout

### Stage A — Free and safe
Local app + Firebase Hosting + Firestore + Authentication.

### Stage B
Connect Syllabus AI using Firebase AI Logic + Gemini.

### Stage C
Move generated files to Firebase Storage.

### Stage D
Add optional Google Drive archive.

### Stage E
Add Android PWA installation. A Play Store listing is not required for instructors to install the app on Android; they can use the browser's "Add to Home screen" / install option when the deployed PWA supports it.

## Important

Do not store passwords/PINs as plain text in Firestore. Firebase Authentication should own staff authentication. The current local PIN system is only a prototype and must be replaced during the cloud migration.
