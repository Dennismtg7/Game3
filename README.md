# Field Level Book — offline PWA

A rise-and-fall levelling field book for surveyors. Works fully offline once installed, saves projects on-device, no build tools, no server, no account.

## What's inside
- `index.html` — the app
- `styles.css` — styling (system fonts only, so it never needs the internet to look right)
- `app.js` — all logic: readings, rise/fall/RL calculation, arithmetic check, saving/loading projects
- `manifest.json` — makes it installable as an app icon on a phone
- `service-worker.js` — caches everything so it works with no signal
- `icons/` — app icons

## Deploy it with GitHub Pages (free, ~5 minutes)

1. Create a new **public** GitHub repository (e.g. `field-level-book`).
2. Upload all the files in this folder to the root of that repo — keep the `icons/` folder as-is.
   - Easiest way: on the repo page, click **Add file → Upload files**, drag all of them in (including the `icons` folder), and commit.
3. Go to the repo's **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Branch: `main`, folder: `/ (root)`. Save.
6. Wait about a minute, then your app is live at:
   `https://<your-username>.github.io/<repo-name>/`

That's it — no build step, because this is plain HTML/CSS/JS.

## Using it offline on a phone

1. Open the GitHub Pages link once **while connected to the internet** (this lets the service worker cache everything).
2. Add it to the home screen:
   - **iPhone (Safari):** Share button → *Add to Home Screen*
   - **Android (Chrome):** ⋮ menu → *Install app* / *Add to Home screen*
3. From then on, it opens and works with **no signal at all** — readings, calculations, and saved projects all run locally on the device.

## How saving works

- Every keystroke autosaves to the device's local storage, so closing the app or losing signal never loses work.
- **Save As** lets a surveyor name and keep multiple distinct field books (one per job/day).
- **Open** lists saved field books to switch between.
- Data is stored **per device, per browser** — it does not sync between phones. If you need multiple surveyors' books in one place, they'd need to be exported/shared manually (e.g. photo of the sheet, or copy-pasting values) — this version has no shared server/cloud.

## Updating the app later

If you (or I) change the code, re-upload the changed files to the repo. Bump the `CACHE_NAME` version string at the top of `service-worker.js` (e.g. `field-book-v1` → `field-book-v2`) so devices that already installed it pick up the update next time they're online.
