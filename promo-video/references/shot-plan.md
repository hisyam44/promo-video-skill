# Shot plan (`promo/shots.json`)

`scripts/capture.mjs --plan promo/shots.json` reads this file. It drives a Chromium page
through the app in order: one page per device, so desktop, phone and tablet shots can be
mixed in one plan. Each shot makes one PNG (`type: "screenshot"`) or one MP4
(`type: "video"`) in `promo/captures/`, and the script writes `manifest.json` with sizes
and durations.

## Top-level fields

| field | default | notes |
|---|---|---|
| `baseUrl` | from `promo/.run/app.json` | `--url` overrides it |
| `device` | `"desktop"` | `desktop`, `phone` (393×793 @3×, iOS style), `phone-android` (412×883 @2.6×), `tablet` (820×1156 @2×, iPad style), `tablet-android`, or any Playwright device name (`"Pixel 7"`). Phone and tablet get touch input, a mobile user agent and a fingertip marker. See mobile.md. |
| `orientation` | `portrait` | `"landscape"` turns phone and tablet presets sideways |
| `fullscreen` | `false` | Phone/tablet: include the status-bar area in the capture (games, fullscreen apps) |
| `viewport` | per device (desktop 1600×900) | Overrides the CSS-pixel size of the plan's main device. For desktop games, match the canvas, for example 1280×720. |
| `deviceScaleFactor` | per device (desktop 1) | Above 1, videos are recorded with full-resolution screenshots: sharp, at about 20–30 fps. At 1, they use the screencast: up to 60 fps, CSS-pixel size. Desktop UI at `2` gives crisp zooms; keep `1` for fast desktop games. |
| `fps` | `30` | Output fps of the clips. Use 60 only for fast games, and only when the `sourceFps` in the manifest gets close to it. |
| `cursor` | `true` | Desktop: a visible arrow cursor with a click ripple. Touch devices: a fingertip marker that appears on each tap or swipe. Set `false` for keyboard-only games and pointer-lock games. |
| `recorder` | `"auto"` | `auto` picks `screenshot` when deviceScaleFactor > 1 and `screencast` otherwise. `playwright` records the whole session with the built-in recorder and cuts it into clips; it's a fallback, at CSS resolution. |
| `headed` | `false` | Opens a visible browser window, which gets real GPU and WebGL frame rates. The `--headed` flag does the same. |
| `colorScheme` | `no-preference` | `"dark"` / `"light"` |
| `localStorage` | – | `{key: value}` seeded before page scripts run, for example to skip onboarding, mark a tutorial as seen or unlock levels |
| `storageState` | – | Path to a Playwright storage-state JSON, for a logged-in session made with a test account |
| `initScript` | – | A JS string run before every page load, for example `"Math.random = () => 0.42"` to make games repeatable |
| `hideSelectors` | – | Selectors hidden with `display:none` (cookie banners, dev toolbars, chat widgets) |
| `setup` / `setupPath` | – | Actions run once before any shot, for example a login with test credentials |
| `shots` | – | The list of shots, run in order. Shots on the same device share one page. |

## Shot fields

| field | notes |
|---|---|
| `name` | File name stem, unique, kebab-case |
| `type` | `"video"` (default) or `"screenshot"` |
| `path` | When set, navigates there first. Omit it to continue from the previous shot's state, which helps gameplay continuity. |
| `fresh` | `true` clears localStorage, sessionStorage and cookies before the shot, so the `localStorage` seeds re-apply. Use it for shots that must not inherit earlier shots' state. |
| `before` | Actions that run before recording starts and are not captured, for example opening a menu or seeding data |
| `actions` | Actions that run while recording, or before the still is taken |
| `after` | Actions after the shot, not captured |
| `leadMs` / `tailMs` | Idle time recorded before and after the actions (300 / 500 ms) |
| `fullPage` | Screenshot only: capture the whole scroll height. Useful for long-landing-page pan scenes. |
| `selector` | Screenshot only: capture just that element |
| `device` | Run this shot on another device, for example one `"tablet"` shot in a phone plan |
| `note` | Free text that gets copied into the manifest |

## Actions

Every action is `{ "do": "<name>", ... }`. A target can be a `selector` (Playwright
selector syntax: CSS, `text=Sign up`, `button:has-text("Play")`, `[data-testid=x]`), plus
an optional `at: [fx, fy]` fraction inside that element. It can also be `at` on its own
(a fraction of the viewport) or `x`/`y` in pixels.

| action | fields | what it does |
|---|---|---|
| `wait` | `ms` | Pause. Leave breathing room after important moments. |
| `waitFor` | `selector` / `text` / `js`, `timeout` | Wait for an element, some text, or a JS condition |
| `goto` | `path`, `settleMs` | Navigate |
| `reload` | | Reload the page |
| `move` / `hover` | target, `duration`, `pause` | Eased cursor glide, about 650 ms. Skipped on touch devices. |
| `click` / `tap` | target, `duration`, `clicks`, `button`, `after` | Desktop: glide to the target, then press and release, with a ripple. Touch devices: a real tap with the fingertip marker. Both names work everywhere. |
| `swipe` | `direction` (`up`/`down`/`left`/`right`) + `distance` (0–1 of the viewport) + optional `at`/`selector`, or `from`/`to` targets; `duration` | Finger swipe: scrolls feeds, flips carousels, triggers game gestures. Desktop falls back to a mouse drag. |
| `longPress` / `touch` | target, `ms` | Press and hold, for context menus or holding one side of the screen in a game |
| `type` | `selector?`, `text`, `delay`, `clear`, `enter` | Types like a person, 65 ms per key by default |
| `fill` | `selector`, `text` | Fills the field instantly (off-camera setup) |
| `select` | `selector`, `value` | Picks an option in a `<select>` |
| `press` | `key`, `times`, `interval` | Key press. Playwright key names: `Enter`, `ArrowLeft`, `Space`, `KeyW`, `Shift+Tab`… |
| `hold` | `key` or `keys[]`, `ms` | Holds keys down. This is the main gameplay action, for example `{"do":"hold","keys":["ArrowRight","Space"],"ms":800}`. |
| `keyDown` / `keyUp` | `key` | Manual key control |
| `mash` | `keys[]` or `taps[]` (targets), `ms`, `minHold`, `maxHold`, `gap`, `seed` | Semi-random gameplay input for a duration: key presses, or touch holds on random zones (`taps`) for mobile games. Seeded, so every take is the same. |
| `mouseDown` / `mouseUp` | target?, `button` | For drawing and aiming |
| `drag` | `from` target, `to` target, `dragMs` | Drag and drop, sliders, drawing (a touch drag on touch devices) |
| `scroll` | `to` (`"bottom"`, `"top"`, a px number or a selector) or `by` px, `duration`, `container` | Smooth eased scroll. `container` is a selector for an inner scroll area. |
| `wheel` | `dx`, `dy` | Raw wheel event, for canvas zoom and maps |
| `eval` | `js` | Runs JS in the page, for example `"window.game.player.invincible = true"` |
| `screenshot` | `name`, `fullPage?`, `selector?` | Takes an extra still in the middle of a shot |
| `repeat` | `times`, `actions[]` | Loop |

## Example: SaaS web app

```json
{
  "viewport": { "width": 1440, "height": 900 },
  "deviceScaleFactor": 2,
  "hideSelectors": ["#cookie-banner", "[data-nextjs-toast]"],
  "localStorage": { "onboardingDone": "true" },
  "shots": [
    { "name": "hero", "type": "screenshot", "path": "/" },
    { "name": "landing-scroll", "path": "/", "actions": [
      { "do": "wait", "ms": 600 },
      { "do": "scroll", "to": "#features", "duration": 1800 },
      { "do": "wait", "ms": 800 },
      { "do": "scroll", "to": "bottom", "duration": 2200 }
    ]},
    { "name": "create-project", "path": "/dashboard", "actions": [
      { "do": "click", "selector": "button:has-text(\"New project\")" },
      { "do": "type", "selector": "input[name=title]", "text": "Q3 launch plan" },
      { "do": "click", "selector": "text=Create" },
      { "do": "waitFor", "text": "Q3 launch plan" },
      { "do": "wait", "ms": 1200 }
    ]},
    { "name": "dashboard", "type": "screenshot", "path": "/dashboard" }
  ]
}
```

## Example: canvas game

```json
{
  "viewport": { "width": 1280, "height": 720 },
  "cursor": false,
  "initScript": "Math.random = (() => { let s = 42; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();",
  "shots": [
    { "name": "title-screen", "type": "screenshot", "path": "/" },
    { "name": "gameplay", "path": "/", "before": [{ "do": "press", "key": "Enter" }, { "do": "wait", "ms": 500 }],
      "actions": [
        { "do": "hold", "key": "ArrowRight", "ms": 900 },
        { "do": "press", "key": "Space" },
        { "do": "mash", "keys": ["ArrowLeft", "ArrowRight", "Space"], "ms": 6000, "seed": 3 }
      ]},
    { "name": "game-over", "type": "screenshot" }
  ]
}
```

## Example: mobile web app
See mobile.md for a phone and tablet plan, with taps, swipes and a tablet shot.

## Manifest
`manifest.json` lists every capture with `width`, `height`, `duration` and the device it was
taken on (`device`, `deviceKind`, `statusBar`, `orientation`). `build_remotion.mjs` reads this
to pick the right frame automatically. Video captures also get:
- `marks`: when each action ran, in seconds into the clip, for example
  `{"t": 2.41, "do": "click", "target": "text=Create"}`. A `click` or `tap` is followed by a
  `pressed` mark at the moment the press lands (about 0.15 s after a tap starts, or after the
  roughly 0.65 s cursor glide on desktop). There's also a final `end-of-actions` mark.
  Use them to choose a scene's `from`. For example, start 0.4 s before the click that matters,
  and make the scene last until about 0.6 s after the result appears.
- `sourceFps`: how many frames per second were actually captured. With the screencast recorder,
  Chrome only sends frames when something changes, so a low value (10–20) on mostly static UI is
  normal and still looks smooth. The screenshot recorder (mobile) runs at about 15–30 fps on an
  idle machine, and less while other heavy work runs, such as a Remotion render. It only
  matters for animation and games.

## Tips
- **Shots on the same device share one page and its state.** A check-in in shot 2 is still there in shot 3.
  `--only x` replays only shot x, starting from a fresh page, so anything x depended on from
  earlier shots is missing. Give shots that depend on state their own `before` setup, or
  `"fresh": true` for a clean slate, so each one can be retaken on its own.

- **Find selectors first.** Run `capture.mjs --probe /some/path`. It saves `probe.png` and lists the visible clickable elements with suggested selectors. Prefer `data-testid`, aria labels and visible text over generated class names.
- **Retake only what failed:** `--only gameplay,create-project`. The manifest is merged, so earlier shots stay.
- **Check every clip.** Run `ff.sh frames promo/captures/x.mp4 /tmp/x` and look at the contact sheet. A clip can encode fine and still show a spinner, an error toast or an empty state.
- **Record a bit longer than the storyboard needs.** You can trim later with the scene `from` and `duration`, but you can't add footage that was never recorded.
- A failure doesn't stop the run. The script saves `<name>.error.png` and goes on, then lists the failures at the end.
