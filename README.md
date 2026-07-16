# Field Level Book — offline PWA with cloud sync

A rise-and-fall levelling field book for surveyors. Each surveyor signs in with their own account; their field books sync to the cloud (Firebase) and are also fully usable with no signal, syncing automatically once back online.

## What's inside
- `index.html` — the app
- `styles.css` — styling (system fonts only, so it never needs the internet to look right)
- `app.js` — all logic: readings, rise/fall/RL calculation, arithmetic check, auth, cloud sync
- `firebase-config.js` — **you fill this in** with your own Firebase project's keys (step 1 below)
- `manifest.json` — makes it installable as an app icon on a phone
- `service-worker.js` — caches the app shell so it loads with no signal
- `icons/` — app icons

## 1. Create your Firebase project (free, ~5 minutes)

1. Go to console.firebase.google.com and create a new project.
2. **Build → Authentication → Get started.** Under Sign-in method, enable **Email/Password**.
3. **Build → Firestore Database → Create database.** Pick a region close to your surveyors, start in production mode.
4. Open the **Rules** tab of Firestore and paste in the rules below, then Publish.
5. **Project settings** (gear icon) → **Your apps** → click the Web icon (`</>`) → register an app (name doesn't matter, skip hosting).
6. Firebase shows a `firebaseConfig` object — copy those values into `firebase-config.js` in this folder, replacing the placeholders.

### Firestore security rules

Each signed-in surveyor should only be able to read/write their own field books. Paste this into the Rules tab:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 2. Deploy it with GitHub Pages (free, ~5 minutes)

1. Create a new **public** GitHub repository (e.g. `field-level-book`).
2. Upload all the files in this folder to the root of that repo — keep the `icons/` folder as-is, and make sure `firebase-config.js` has your real values (not the placeholders) before you upload.
   - Easiest way: on the repo page, click **Add file → Upload files**, drag everything in (including the `icons` folder), and commit.
3. Go to the repo's **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Branch: `main`, folder: `/ (root)`. Save.
6. Wait about a minute, then your app is live at:
   `https://<your-username>.github.io/<repo-name>/`

That's it — no build step, this is plain HTML/CSS/JS plus the Firebase SDK loaded from Google's CDN.

## 3. Using it offline on a phone

1. Open the GitHub Pages link once **while connected to the internet**, and sign in (or create an account). This lets the service worker cache the app and lets Firestore cache that surveyor's field books locally.
2. Add it to the home screen:
   - **iPhone (Safari):** Share button → *Add to Home Screen*
   - **Android (Chrome):** ⋮ menu → *Install app* / *Add to Home screen*
3. From then on, it opens and works with **no signal at all** — readings, calculations, and their saved field books all run locally on the device. Anything typed while offline is queued and syncs automatically the next time the device gets signal.

## How saving and accounts work

- Each surveyor creates their own account (email + password) — their field books are only visible to them, enforced by the Firestore rules above.
- Every keystroke autosaves in the background (instantly to local cache, to the cloud when online).
- **Save As** lets a surveyor name and keep multiple distinct field books (one per job/day). Saving again under the same name overwrites it; a different name forks a new one.
- **Open** lists that surveyor's saved field books, kept in sync live across their devices.
- Firestore only caches documents a device has actually opened while online at least once — so on a brand-new phone, the surveyor needs one moment of signal to pull their books down before going fully offline.
- There's currently no way for surveyors to see each other's field books — each account is private. If you want a shared/team view later (e.g. a foreman seeing everyone's bookings), that's a small addition to the security rules and a bit of UI — just ask.

## Updating the app later

If the code changes, re-upload the changed files to the repo. Bump the `CACHE_NAME` version string at the top of `service-worker.js` (e.g. `field-book-v2` → `field-book-v3`) so devices that already installed it pick up the update next time they're online.

## Costs

Firebase's free tier (Spark plan) comfortably covers a small team of surveyors — generous daily read/write limits and free authentication. You won't hit a paywall unless usage grows a lot; Firebase will prompt you to upgrade to the pay-as-you-go Blaze plan if you ever get close.
