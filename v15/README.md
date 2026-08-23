# Universal ITI Instructor Automation — V15 Pilot

This folder is an **isolated pilot**. The existing root V14 app remains unchanged.

## Why this pilot exists

V14 is local-first and synchronizes large sections. V15 is designed for Principal, Instructor and Student/Trainee users working from different devices at the same time.

V15 uses:

- Google Authentication for all roles.
- Approved Google/Gmail access only.
- One-time 6-digit activation code on first approved login.
- Shared Firestore institute/workspace membership.
- Record-per-document Firestore writes so two devices adding different trainees/entries do not replace the whole list.
- Realtime listeners so changes from another device appear automatically.
- LocalStorage only as a cache/offline fallback after V15 is active.

## Existing records are preserved

The pilot does not delete the root V14 app, V14 browser database, or the V14 Firestore collection.

The first V15 owner login is intentionally allowed to create the shared institute only when that same Firebase user already owns the existing V14 cloud workspace manifest. The V14 source remains in place after migration for rollback.

## Pilot URL

`https://durgeshkadam-beep.github.io/universal-iti-instructor-automation/v15/`

The pilot loader reuses the current app shell and adds the isolated V15 runtime. The normal root URL remains V14 during testing.

## Required Firestore rules before first V15 login

Copy the complete contents of `v15/firestore.rules` into:

Firebase Console → Firestore Database → Rules → Publish

These rules continue to allow the owner's V14 private workspace, so V14 rollback/migration remains possible.

## First owner migration test

1. On the desktop/browser where V14 cloud already contains the current records, open the V15 pilot URL.
2. Select Instructor (or Principal if that is the intended owner role).
3. Click **Continue with Google** and use the same Google account that owns the V14 cloud workspace.
4. V15 verifies the legacy V14 manifest, creates the shared institute/workspace, and copies the records into V15 record-level collections.
5. Confirm trainees, attendance, theory/practical records and notices are present.
6. Do not delete the V14 Firestore collection.

## Multi-device test

After owner migration:

- Add one test trainee on desktop.
- Open the V15 pilot on mobile with the same approved staff Google account; the trainee should appear without Firebase JSON, Push or Restore.
- Add a second different test trainee on mobile; desktop should receive it through the realtime listener.
- Confirm both records remain.

## Student access

In Trainee Master, use **Set Gmail** for a trainee. V15 creates an approved access entry and a one-time activation code. The student selects Student/Trainee, signs in with that exact Google account, and enters the code once. An unapproved Google account is denied.

## Safety

Keep V14 and V15 in parallel until the two-device staff test and at least one student login test succeed. Only then should V15 replace the root app.
