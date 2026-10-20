# product-video-skills

A Claude Code skill, **`promo-video`**, that turns a web app or browser game codebase into a
promo video, for desktop products and for mobile apps and games headed to the App Store or
Google Play.

1. **Detect** the project: framework, dev command, port, game engine and controls, routes, brand colors, fonts, logo, and whether it targets **mobile** (Capacitor, Cordova, Ionic, Expo, PWA, store links)
2. **Run** the dev server in the background (also handles static sites and Godot/Unity web exports)
3. **Capture** real footage with Playwright on a **desktop, phone or tablet** viewport: clicks or touch taps and swipes, typing, scrolling, gameplay input, with a visible cursor or fingertip marker
4. **Storyboard** the scenes, copy, brand, device and music in one JSON file
5. **Render** with **Remotion** inside browser, **phone** (iOS or Android style) or **tablet** frames, at 16:9, 9:16 and 1:1
6. **Post-process** with **ffmpeg**: music, GIF, compression, trims, store-preview cuts

```
promo-video/                  ← the skill (this folder is what gets installed)
  SKILL.md                    workflow Claude follows
  scripts/                    detect, run, capture, build, ffmpeg helpers
  references/                 shot plan, storyboard, mobile, games, creative, remotion
  templates/remotion/         the Remotion project template (scenes + device frames)
examples/neon-dodge/          tiny canvas game (keyboard + touch) to try the skill on
install.sh                    one-shot installer
```

---

## Setup, step by step

### Step 1: Install the prerequisites

| Tool | Why | macOS | Check |
|---|---|---|---|
| **Node.js 18+** (20/22 LTS recommended) | Runs the scripts, Playwright and Remotion | `brew install node@22` (or nodejs.org) | `node -v` |
| **ffmpeg** | Encodes captures and handles post-production | `brew install ffmpeg` | `ffmpeg -version` |
| **Claude Code** | Runs the skill | see claude.com/claude-code | `claude --version` |
| **~3 GB free disk** | Playwright's Chromium (~570 MB, shared with Remotion), about 550 MB of Remotion per video project, 1–2 GB of render temp files | – | `df -h ~` |

On Linux: `sudo apt install ffmpeg` and Node from NodeSource or nvm. On Windows, use WSL2;
`ff.sh` is a bash script.

### Step 2: Install the skill

```bash
./install.sh
```

This does three things:
1. Runs `npm install` inside `promo-video/`. That installs Playwright and downloads Chromium.
2. Symlinks `promo-video/` to `~/.claude/skills/promo-video`, so every project uses this
   repo's copy and your edits apply everywhere immediately.
3. Runs the doctor, which checks Node, ffmpeg, Playwright, Chromium and disk space.

To install it for one project only, use `./install.sh /path/to/project`, which links it into
`/path/to/project/.claude/skills/`.

You can re-run the check any time:

```bash
node promo-video/scripts/doctor.mjs
```

Remotion needs no global install. Each video project gets its own copy from the bundled
template the first time the skill renders.

### Step 3 (optional): Add Remotion's official agent skills

```bash
npx skills add remotion-dev/skills
```

### Step 4: Restart Claude Code

Skills are discovered when a session starts. Open a new session and check that
`promo-video` shows up when you type `/`.

### Step 5: Try it on the example game

```bash
cd examples/neon-dodge
claude
```

Then ask:

> Make a 20-second vertical promo for this mobile game.

or

> Make a 20-second gameplay trailer for this browser game.

### Step 6: Use it on your own project

```bash
cd ~/code/my-app
claude
```

Example requests:

- "Make a 30s launch video for this web app for Product Hunt"
- "This is a mobile app on the App Store and Google Play. Make a 9:16 promo with phone frames"
- "Make an iPad promo for this app, landscape, 16:9"
- "Create a 15-second TikTok ad for my game, fast cuts, gameplay first"
- "Record the onboarding flow and make a feature showcase, use ~/Music/upbeat.mp3"

Everything is written to `<project>/promo/`. Add it to `.gitignore`, or at least
`promo/out`, `promo/.run` and `promo/remotion/node_modules`.

---

## Desktop vs mobile mode

| | Desktop (default) | Mobile (phone / tablet) |
|---|---|---|
| Chosen when | Nothing suggests mobile | You say mobile, iPhone, Android, iPad, App Store or Play Store, or detect finds mobile signals |
| Capture | 1600×900, mouse, arrow cursor | Phone 393×793 @3× or tablet 820×1156 @2×, touch taps and swipes, fingertip marker, mobile user agent |
| Video frame | Browser window | Phone (status bar, Dynamic Island or punch-hole, home indicator) or tablet |
| Extras | – | `gallery` scene (2–4 phones), App Store and Google Play badges, raw store-preview cut (`ff.sh storefit`) |

One storyboard renders every aspect ratio: `npm run render` (storyboard size),
`render:vertical` (9:16), `render:square` (1:1) and `render:landscape` (16:9). Layouts
reflow; on 16:9 the phone sits beside the text, App Store style.

## Running the pieces by hand

The skill is a set of plain scripts (`S` = path to `promo-video/scripts`):

```bash
node $S/detect_project.mjs . --pretty                    # what is this project? mobile?
node $S/run_app.mjs start .                              # start dev server → prints URL
node $S/capture.mjs --probe / --device phone             # clickable elements + screenshot
node $S/capture.mjs --plan promo/shots.json              # record clips/stills → promo/captures/
node $S/build_remotion.mjs promo/storyboard.json         # → promo/remotion/ (installs once)
(cd promo/remotion && npm run render)                    # → promo/out/promo.mp4
bash $S/ff.sh                                            # list ffmpeg recipes
node $S/run_app.mjs stop .
```

Formats: `promo-video/references/shot-plan.md`, `storyboard.md` and `mobile.md`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ENOSPC` / "no space left" | Free disk space. `npm cache clean --force` usually frees several GB. |
| Doctor says Chromium is missing | `cd promo-video && npx playwright install chromium` |
| Dev server times out | Read `promo/.run/app.log`. Usually it's missing `.env` values, a port already in use, or a database that isn't running. Pass `--cmd` / `--port` to override detection. |
| Phone capture looks like the desktop site | The app isn't responsive. `--probe / --device phone` reports `overflowX: true`. |
| Choppy game footage (`sourceFps` < 20) | Desktop: `--headed` or a smaller viewport. Phone: `"deviceScaleFactor": 2`. |
| Clip shows a spinner or empty state | Add `waitFor` / `wait` actions, or seed data through `before` / `localStorage` |
| Remotion version errors | All `remotion` / `@remotion/*` versions must match exactly |

## Licensing note

Remotion is free for individuals and companies of up to 3 people. Larger companies need a
Remotion company license. The generated store badges are generic text placeholders; for
official App Store and Google Play badge artwork, use Apple's and Google's marketing
resources.

## Updating

- **Remotion**: bump every `4.0.x` in `promo-video/templates/remotion/package.json`
  together. Existing video projects pick up the new template on their next
  `build_remotion.mjs`, which reinstalls because `package.json` changed.
- **Playwright**: bump it in `promo-video/package.json`, then run `npm install`, which
  downloads the matching Chromium.
