# Cloud setup — no Play Store required

## Recommended free-first stack
- Firebase Authentication: instructor/principal accounts
- Firestore: structured records
- Firebase Storage: uploaded PDFs/DOCX/Excel and generated files
- Firebase Hosting: web/PWA hosting
- Firebase AI Logic / Gemini: syllabus analysis and plan drafting
- Google Drive: optional archive/export, not the primary database

## 1. Create Firebase project
Go to Firebase Console and create one project.

## 2. Add a Web App
Project settings > Your apps > Web. Copy the web configuration into `config/firebase-config.js`.

## 3. Enable Authentication
Enable Email/Password initially. Later we can add Google sign-in if desired.

## 4. Create Firestore
Create the database, then deploy `firebase/firestore.rules`.

## 5. Hosting
Install Firebase CLI on your PC, run `firebase login`, then from this app folder run `firebase init hosting` and `firebase deploy`.

## 6. Storage
Enable Firebase Storage for syllabus files and generated documents.

## 7. AI
Enable Firebase AI Logic / Gemini according to the current Firebase documentation. Keep model calls behind Firebase's supported client protection or a backend. Never embed a Gemini secret key in this repository.

## 8. Google Drive
If you want Drive archive, connect Google Drive through OAuth. The app should save the Drive file ID/URL in Firestore. Do not use Drive itself as the relational database.

## Credentials
A Firebase Web App config is safe to place in the web app. A Firebase service-account JSON/private key is secret and must stay on a server/Cloud Function. Do not send it in chat.
