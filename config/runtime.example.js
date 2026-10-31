// Public configuration only. Copy to config/runtime.local.js (ignored by git).
// Load before app scripts on a staging host. No credentials or AI keys belong here.
window.ITI_RUNTIME={apiUrl:'https://your-staging-api.example/api',firebaseConfig:{apiKey:'public-firebase-web-api-key',authDomain:'your-staging-project.firebaseapp.com',projectId:'your-staging-project',appId:'public-web-app-id'}};
