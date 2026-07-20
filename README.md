# Field Level Book — Offline PWA with Cloud Sync

A modern, offline-first field book application for surveyors. Work anywhere, anytime — with or without internet connection. Built with vanilla JavaScript, automatic cloud sync via Firebase, and full offline capability.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)

---

## Features

✅ **Fully Offline** — Works with zero internet signal; all data stored locally  
✅ **Auto Cloud Sync** — Seamlessly syncs to Firebase when connected  
✅ **Installable App** — Add to home screen on iOS and Android  
✅ **Multi-Device Sync** — Access your field books across all your devices  
✅ **Private & Secure** — Each surveyor has their own encrypted account  
✅ **Rise & Fall Calculations** — Automatic levelling calculations built-in  
✅ **Arithmetic Check** — Verify readings on the fly  
✅ **No Build Required** — Plain HTML/CSS/JS + Firebase SDK from CDN  

---

## Quick Start

### Prerequisites
- A Firebase project (free)
- A GitHub account
- 10 minutes

### 1. Set Up Firebase (5 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project
2. **Build → Authentication** → Enable **Email/Password** sign-in
3. **Build → Firestore Database** → Create database (pick a region near your team, start in production mode)
4. Open the **Rules** tab and paste these security rules, then **Publish**:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. **Project Settings** (gear icon) → **Your Apps** → Click Web (`</>`) → Register your app
6. Copy the `firebaseConfig` object and paste it into `firebase-config.js` in this repo

### 2. Deploy to GitHub Pages (5 minutes)

1. Create a new **public** GitHub repository (e.g., `field-level-book`)
2. Upload all files to the root, keeping the folder structure:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `firebase-config.js` (with your real Firebase keys)
   - `manifest.json`
   - `service-worker.js`
   - `icons/` (folder)

   **Tip:** Use GitHub's **Add file → Upload files** button and drag everything in
3. Go to **Settings → Pages**
4. Set **Source** to `Deploy from a branch`
5. Choose branch: `main`, folder: `/ (root)` → **Save**
6. Your app is live in ~1 minute at: `https://<your-username>.github.io/<repo-name>/`

---

## Using It on Your Phone

### First Time (need internet)
1. Open the GitHub Pages link while **connected to WiFi or mobile data**
2. Sign in (or create a new account)
3. Let the service worker cache the app

### Add to Home Screen
- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ Menu → *Install app*

### Now You're Offline-Ready
- Reopen the app anytime — it works with **zero signal**
- All readings, calculations, and field books run locally
- Changes sync automatically when you regain connection

---

## How It Works

### Accounts & Permissions
- Each surveyor creates their own account (email + password)
- Field books are **private to that account** — enforced by Firestore security rules
- Every keystroke auto-saves locally and syncs to the cloud when online

### Saving & Opening Field Books
- **Save As** — Name and save distinct field books (one per job/day)
- **Open** — Browse all your saved books; changes sync live across devices
- Save again under the same name to overwrite; use a new name to fork a copy

### Offline Behavior
- Firestore caches field books a device has opened while online
- On a brand-new phone, the surveyor needs just one moment of signal to pull down existing books before going fully offline

---

## File Structure

```
.
├── index.html              # Main app interface
├── app.js                  # All logic: readings, calcs, auth, sync
├── styles.css              # System fonts only (works offline)
├── firebase-config.js      # Your Firebase keys (you fill this in)
├── service-worker.js       # Caches app shell for offline use
├── manifest.json           # Makes app installable
├── icons/                  # App icons for home screen
└── README.md               # This file
```

---

## Updating the App

When you update the code:
1. Edit and re-upload changed files to your repo
2. **Bump the version** in `service-worker.js` (change `CACHE_NAME`, e.g., `field-book-v1` → `field-book-v2`)
3. Users' devices will fetch the new version on next load

---

## Costs

✅ **Firebase Spark Plan (Free)**
- Generous daily limits for authentication and Firestore reads/writes
- No credit card required
- Perfect for small teams of surveyors

You'll only be charged if your app scales significantly beyond the free tier limits.

---

## Privacy & Security

- All field books are encrypted in transit (TLS) and at rest (Firebase default)
- Each surveyor's data is isolated by Firestore security rules
- No two surveyors can see each other's books
- Future enhancement: Add team/foreman view if needed

---

## Browser & Device Support

| Browser | iOS | Android |
|---------|-----|---------|
| Safari | ✅ | — |
| Chrome | — | ✅ |
| Firefox | ✅ | ✅ |
| Edge | ✅ | ✅ |

All modern browsers supported. Best experience on mobile phones.

---

## Troubleshooting

### App won't load offline
- Make sure you opened it once **while online** to cache it
- Check that `service-worker.js` is present in your repo root

### Can't sign in
- Verify Firebase authentication is enabled (**Email/Password** method)
- Check your Firebase rules are correct (see Setup section)

### Changes aren't syncing
- Check your internet connection (WiFi or mobile data)
- Verify Firebase config keys are correct in `firebase-config.js`
- Open browser DevTools Console (F12) for error messages

### App icon won't install
- Make sure `manifest.json` is in the repo root
- Try in Chrome or Safari (some browsers don't support PWA installation)

---

## Contributing

Found a bug or have an idea? [Open an issue](https://github.com/Dennismtg7/Game3/issues) or submit a pull request.

---

## License

MIT License — Use freely for personal or commercial projects.

---

## Support

For questions or issues:
- 📧 Email: [your-email]
- 🐛 Bugs: [GitHub Issues](https://github.com/Dennismtg7/Game3/issues)
- 📖 Docs: Read this README or check the code comments

---

**Made for surveyors, by builders.**
