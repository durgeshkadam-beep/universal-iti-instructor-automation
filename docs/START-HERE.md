# Universal ITI Instructor Automation — Full Plan Viewer / Print Fix

## What this version is
This is the production-test package based on the DTPO app you supplied. It is a Progressive Web App (PWA): it works in a browser and can be installed on Android from Chrome without publishing to Google Play.

## Important honesty about the database
The supplied application currently runs in **Local Mode** using browser localStorage. That is intentional in this package so it can be tested immediately without requiring your Firebase account.

It is **not yet a shared cloud database**. Different phones/browsers do not automatically share data.

The package includes the Firebase rules/configuration needed for the next Cloud Mode step. Do not paste passwords or service-account private keys into chat or into frontend files.

## Demo accounts
- Principal: `principal` / `5678`
- Instructor: `durgesh` / `1234`

Create additional instructor accounts from Principal > Instructor Accounts.

## Android / browser
1. Upload the folder to Firebase Hosting, GitHub Pages, Netlify, or another static host.
2. Open the HTTPS address in Android Chrome.
3. Chrome menu > Add to Home screen / Install app.
4. The app opens in standalone mobile mode. No Play Store is required.

## AI
The current syllabus analyser is a deterministic browser parser/prototype. It does not silently pretend to be Gemini.
For production AI, connect Gemini through Firebase AI Logic or a secure backend. AI should extract/interpret the syllabus and draft demonstration/theory plans; the calendar engine should calculate dates/hours deterministically.
