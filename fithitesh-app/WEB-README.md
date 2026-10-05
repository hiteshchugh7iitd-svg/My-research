# FitHitesh 2.0 — build, host, and publish guide

A private, offline health app: food diary (Indian + Japanese foods, barcode scan), water, workouts with rest timer and PRs, sports log, smart weight trend with adaptive calorie target, weekly plan, habits, and a calm-mind tab. One HTML file, no frameworks, no server, no build step.

## What it learned from the popular apps

| Feature in FitHitesh | Inspired by |
|---|---|
| Meal-by-meal diary, food search, recent foods, "copy yesterday", quick add, custom foods | MyFitnessPal |
| Barcode scanning (camera) with the free Open Food Facts database | MyFitnessPal / Cronometer |
| Smoothed weight trend + calorie target that learns your real expenditure from your logs | MacroFactor |
| Protein, carbs, fat **and fibre** targets | Cronometer |
| Gym logger: routines, sets × reps × kg, "previous" column, rest timer, estimated 1RM, PRs | Strong |
| Indian food database and plan built around dal, roti, paneer, sprouts | FITTR / HealthifyMe |
| Water with quick-add sizes and a plant that grows to full bloom | Plant Nanny / WaterMinder |
| Sports sessions with calorie estimate (MET), 7-day active-minutes chart vs WHO guideline | Strava / Google Fit |
| Box-breathing timer, mood, sleep and a 3-line journal | Headspace / Calm |

## Files

```
fithitesh/
├── index.html          ← the whole app (HTML + CSS + JavaScript)
├── manifest.json       ← makes it installable (name, icons, colours)
├── sw.js               ← service worker: opens offline
├── privacy.html        ← privacy policy (required by Play Store)
├── .nojekyll           ← lets GitHub Pages serve the .well-known folder
├── .well-known/        ← put assetlinks.json here later (Play Store step)
└── icons/              ← app icons (192, 512, maskable, Play Store 512)
```

## Step 1 — Put it on your phone (about 10 minutes, free)

The app must be served over **https** to install and work offline.

**Option A: Netlify (easiest)**
1. Create a free account at netlify.com (sign up first, so the site doesn't expire).
2. Open app.netlify.com/drop and drag the whole `fithitesh` folder onto the page.
3. You get a link like `https://something.netlify.app`. In *Site configuration → Change site name* rename it, e.g. `fithitesh.netlify.app`.
4. On your Android phone open that link in **Chrome** → menu ⋮ → **Install app** (or *Add to Home screen*).
5. To update later: Netlify → your site → *Deploys* → drag the folder again.

**Option B: GitHub Pages**
1. Create a repository named exactly `<your-username>.github.io` (so the app sits at the domain root — needed for the Play Store step).
2. Upload all files (including `.nojekyll` and `.well-known`).
3. *Settings → Pages → Deploy from branch → main*. Your app is at `https://<your-username>.github.io`.

**iPhone:** open the link in Safari → Share → *Add to Home Screen*. (Barcode live-scanning needs Chrome on Android; on iPhone type the number.)

## Step 2 — Make it yours

Everything editable is near the top of the `<script>` in `index.html`:

| What | Where |
|---|---|
| App name, version, first-run defaults (name, 81 → 71 kg…) | `CONFIG` |
| Food list (name, serving, kcal, protein, carbs, fat, fibre) | `FOODS` |
| Gym routines | `ROUTINES` |
| Exercises list | `EXERCISES` |
| Sports and MET values | `SPORTS` |
| Weekly plan, daily habits, mind checklist | `DEFAULT_PLAN`, `DEFAULT_HABITS`, `DEFAULT_MIND` (also editable inside the app) |
| Colours | `:root { --accent … }` at the top of `<style>` |

**Every time you upload a new version, change `VERSION` in `sw.js`** (e.g. `fithitesh-v2.0.1`) or phones will keep the old copy.

Before publishing to the public, set `CONFIG.defaults` to blanks (e.g. `name:''`, `weightKg:''`, `goalKg:''`) so strangers don't see your numbers, and put your contact email in `privacy.html`.

## Step 3 — Publish on Google Play

The app is wrapped as a **Trusted Web Activity** (a full-screen Android shell around your website). You don't need Android Studio.

1. **Developer account** — sign up at play.google.com/console (one-time US$25 fee, ID verification).
   - New *personal* accounts must run a **closed test with at least 12 testers for 14 days in a row** before production access. *Organisation* accounts are exempt. Line up 12 friends/classmates with Android phones early.
2. **Package it** — go to pwabuilder.com, enter your app URL, click *Package for stores → Android → Generate*. Use package ID like `com.hitesh.fithitesh`. Download the zip. It contains:
   - `.aab` file → upload to Play Console
   - `.apk` → install on your own phone to test
   - `signing.keystore` + `signing-key-info.txt` → **back these up in two safe places**. Lose them and you can never update the app.
   - `assetlinks.json`
3. **Prove you own the site** — upload `assetlinks.json` to `/.well-known/assetlinks.json` on your site, so `https://your-site/.well-known/assetlinks.json` opens. Without it the app shows a browser address bar.
   After you upload the `.aab`, Play Console re-signs the app: copy the **SHA-256 fingerprint** from *Test and release → App integrity → App signing* and add it to the `sha256_cert_fingerprints` list in `assetlinks.json`, then re-upload.
4. **Store listing** — app name, short and full description, `icons/play-store-icon-512.png`, a 1024×500 feature graphic, and at least 2 phone screenshots.
5. **App content forms** — privacy policy URL (`https://your-site/privacy.html`), Data safety (no data collected or shared; all stored on device), Health apps declaration if asked, content rating questionnaire, target audience **18+**, ads: none.
6. **Release** — closed testing first (the 12 testers), then apply for production.

## Good to know

- **Your data lives on the phone.** Use *Settings → Export backup* every week or two. Clearing Chrome data or uninstalling deletes it.
- **Steps aren't automatic.** Websites can't read Google Fit / Health Connect. Type the day's steps in the evening. For automatic steps and sleep later, the next step is wrapping the same code with **Capacitor** and a Health Connect plugin.
- **Reminders:** web apps can't reliably schedule notifications when closed. Use a phone alarm or calendar alerts for water and bedtime.
- **Smart target:** after about two weeks of weigh-ins and food logs, the app compares what you ate with how your trend weight moved and learns your real daily expenditure. It never sets calories below your BMR or 1,500 kcal (men) / 1,200 kcal (women), and caps the pace at 1% of body weight per week.
- Nutrition numbers are typical estimates. Barcode data comes from Open Food Facts (ODbL licence) and may be incomplete.

## Test checklist before each release

- [ ] Opens with no internet (airplane mode) after first load
- [ ] Log food, water, a workout, a sport session and a weigh-in
- [ ] Export backup → Erase → Import backup restores everything
- [ ] Barcode scan on an Android phone
- [ ] `VERSION` in `sw.js` bumped
