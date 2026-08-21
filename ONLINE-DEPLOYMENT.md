# Online deployment

This package is prepared for free GitHub Pages hosting.

## One-time owner actions
1. Create an empty GitHub repository named `universal-iti-instructor-automation` under your account.
2. Allow GitHub Pages / GitHub Actions for the repository if GitHub prompts you.
3. Later, create a Firebase project and Google OAuth Web Client ID to enable cloud sync and Google Drive. Those steps require your Google account consent.

## Data safety
- GitHub Pages hosts only the app code; it does not contain your instructor database.
- Until Firebase is connected, records remain in the browser's local storage.
- After Firebase is connected, structured records can sync online.
- Google Drive is used for backups/reports when connected.
- Do not commit service-account JSON, private keys, trainee personal data, or API secrets to GitHub.

## Updates
Future app versions can be deployed by replacing application files in the repository. Cloud data remains separate from the website code, so UI/app updates do not intentionally overwrite instructor records.
