---
name: promo-video
description: Make promotional, launch, demo or trailer videos for a web app, website, SaaS product, PWA or browser game straight from its codebase, including apps/games targeting phones and tablets (App Store / Google Play). Detects the framework, runs the dev server, drives the app with Playwright (desktop, phone or tablet viewport, mouse or touch) to record real footage and screenshots, then renders a polished MP4 with Remotion inside browser, phone or tablet frames, using ffmpeg for music, cuts and GIFs. Use whenever the user wants a promo video, product video, demo reel, launch video, Product Hunt video, app store / Play Store style trailer, mobile app promo, social ad, gameplay trailer, feature showcase or "video of my app/game", even if they don't name a tool, and when they want screen recordings or screenshots of their app turned into a video.
---

# Promo video from a codebase

You'll go from a project folder to a finished video in six stages:
**detect → run → capture → storyboard → render (Remotion) → post (ffmpeg)**. Every stage
leaves files in `<project>/promo/`, so you can redo any stage without starting over:

```
promo/
  shots.json          capture plan          (you write it)
  captures/           PNG + MP4 + manifest  (capture.mjs)
  storyboard.json     scenes and copy       (you write it)
  remotion/           Remotion project      (build_remotion.mjs, editable)
  assets/             music, voiceover, logo
  out/                final videos
  .run/               dev-server pid + log
```

Scripts live in `scripts/` inside this skill's base directory (shown when the skill
loads). Below, `$S` stands for that `scripts` path. Run them with the user's project as
the working directory.

## 0. Preflight (first use, or whenever something fails oddly)
```bash
node $S/doctor.mjs
```
If Playwright or Chromium is missing, run `npm install` in the skill directory. For ffmpeg or
Node, give the user the fix the doctor prints. Each video project's Remotion install takes
about 550 MB; it reuses Playwright's headless Chrome instead of downloading its own. Renders
need another 1–2 GB of temp space, so warn the user if the doctor reports less than 3 GB free.

## 1. Detect and understand the product
```bash
node $S/detect_project.mjs . --pretty
```
This reports the framework, dev command and port, whether it's a game (engine, input keys),
routes, brand colors, fonts and logo files. It also reports **`mobile`**: signals that the
product targets phones or tablets (Capacitor, Cordova, Ionic, Expo, a PWA manifest, store
links, README mentions). For each store it says `listed` (a real store URL), `coming-soon`
or `mentioned`. Only `listed` gets store badges without asking; for `coming-soon`, write
"Coming soon to…" copy. In a monorepo, run it again on the app
package.

Read enough of the code to know what the product does and which moments sell it: the
README, the main screens, and for a game the input code. Then follow
`references/creative.md` to pick the promise, 3–4 proof moments and the CTA.

**Decide the target device.** This drives both the capture viewport and the frame drawn in
the video:
- The user says it's a mobile app or game, mentions iPhone, Android, the App Store or
  Google Play, or `mobile.likely` is true: **mobile mode**. Read `references/mobile.md`.
  Use phone frames, or tablet frames if they say iPad or tablet, and phone/tablet viewports.
  Ask "phone, tablet or both?" only if it's unclear.
- Otherwise use **desktop mode** with browser-window frames.

**Agree on a brief.** Unless the user already said, confirm:
- length (default 30 s)
- aspect: 16:9 by default for desktop; for mobile, suggest 9:16 for social, or 16:9 for a
  website or YouTube
- music: they provide a file, or you use a placeholder beat
- headline claims and the CTA (URL and/or store badges)

Propose concrete defaults in one message rather than asking open questions. If the user
says "just do it", use your defaults.

## 2. Run the app
Install dependencies if detect says `needsInstall`, using its `installCommand`. Then:
```bash
node $S/run_app.mjs start .            # prints {"url": ...}; logs in promo/.run/app.log
```
Override with `--cmd "pnpm dev --port 4000" --port 4000` when detection is wrong. If startup
fails, read the log tail it prints. Missing env vars, an occupied port and a missing database
are the usual causes; fix what you can and ask the user about secrets. Never invent
credentials. For apps behind a login, use a test or seed account from the project, or ask
the user for one. Games often run smoother from a production build, so prefer
`--cmd "<buildCommand> && <previewCommand>"` when one is reported.

## 3. Capture footage
1. Explore. For each screen you plan to show, run:
   ```bash
   node $S/capture.mjs --probe /route [--device phone]
   ```
   This saves `promo/captures/probe.png` (look at it) and lists clickable elements with
   selectors. In mobile mode, probe with the same `--device`, because the layout differs.
   `overflowX: true` means the page isn't mobile-ready; tell the user.
2. Write `promo/shots.json`. The full format, actions and examples are in
   `references/shot-plan.md`. In mobile mode, set `"device": "phone"` (or `"tablet"`, or
   per shot) and use `tap`, `swipe` and `longPress` gestures. For games, also read
   `references/games.md`.
3. Record:
   ```bash
   node $S/capture.mjs --plan promo/shots.json
   ```
4. **Check what you got.** Open the PNGs. For each clip, run
   `bash $S/ff.sh frames promo/captures/<clip>.mp4 promo/captures/.review/<clip>` and look at
   the contact sheet. `manifest.json` has `marks` (when each action started in the clip,
   plus a `pressed` mark at the exact moment of each tap or click), which you can use to
   choose scene `from` offsets. Retake bad shots with `--only name1,name2`.
   Common fixes: wait for data to load, hide cookie banners and dev overlays
   (`hideSelectors`), seed realistic content instead of empty states, and record longer than
   the scene needs. For a laggy game (low `sourceFps` during motion), retake with `--headed`.

The footage decides how good the video is. Spend your iteration budget here before you
polish the composition.

## 4. Write the storyboard
Write `promo/storyboard.json` with brand, logo, copy and scenes. Field reference:
`references/storyboard.md`. In mobile mode, set `meta.device` to `"phone"` or `"tablet"` and
`meta.stores` for the CTA badges, and consider a `gallery` scene (2–4 phones side by side).
Captures taken on a phone or tablet automatically get the matching frame, status bar and
notch or punch-hole. Clip scenes use `from` to skip dead time, and `zoom.focus` to steer
attention.

If the user has no music, generate a placeholder beat so the timing feels right, and tell
them to swap in a licensed track:
`bash $S/ff.sh tone promo/assets/music.m4a <seconds> 112`.

## 5. Render with Remotion
Details and editing rules are in `references/remotion.md`.
```bash
node $S/build_remotion.mjs promo/storyboard.json   # syncs template, npm install, assets, fonts
cd promo/remotion
npx remotion still Promo ../out/check.png --frame 90   # spot-check frames first
npm run render                      # -> promo/out/promo.mp4 (storyboard size)
npm run render:vertical             # 1080x1920   (also render:square, render:landscape)
```
Check stills from several scenes before the full render. Pick frames at least 1.2 s into a
scene, after the entrance animations have settled. After the render, look at the final
video's contact sheet (`ff.sh frames`). Check for readable text, no overflow, clean footage,
and correct device frames and timing. Fix issues in the storyboard and run
`build_remotion.mjs` again. For bespoke motion you can edit `src/Promo.tsx` or
`src/devices.tsx` directly; later builds keep your edits.

## 6. Post-production (ffmpeg)
`bash $S/ff.sh` lists all recipes. The common ones:
```bash
bash $S/ff.sh music    promo/out/promo.mp4 promo/assets/track.mp3 promo/out/promo-music.mp4
bash $S/ff.sh gif      promo/out/promo.mp4 promo/out/promo.gif 960 15
bash $S/ff.sh compress promo/out/promo.mp4 promo/out/promo-small.mp4 24
bash $S/ff.sh storefit promo/captures/gameplay.mp4 promo/out/app-preview.mp4 886 1920   # raw store preview
```
Prefer the `render:vertical`, `render:square` and `render:landscape` compositions for other
aspect ratios, because they reflow the layout. `ff.sh vertical` is a quick blurred-fill fallback.

## 7. Wrap up
- Stop the dev server: `node $S/run_app.mjs stop .`. Only servers this script started are stopped.
- Suggest adding `promo/` to `.gitignore`, or at least `promo/remotion/node_modules`,
  `promo/out` and `promo/.run`. Ask before editing it.
- Report the output paths, length, resolution and file size. Say what's placeholder (music,
  copy, generic store badges) and offer the next steps: other aspect ratios, a phone or
  tablet variant, a voiceover, or a shorter cut.
