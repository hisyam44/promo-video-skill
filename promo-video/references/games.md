# Capturing web games

Games break the usual assumptions about web pages. They render to a canvas, they're
driven by the keyboard, timing matters, and they're often random. Here's how to get footage
worth putting in a trailer.

## 1. Learn the controls from the code
`detect_project.mjs` reports `input.keys`, which are the key names it found compared
against in the source. Treat that as a lead and confirm it in the code. Grep for
`keydown`, `addKeys`, `createCursorKeys`, `isKeyDown`, `onKeyPress` and `pointerdown`.
Also find:
- How a run starts (press Enter/Space, click a canvas button, a title-screen state)
- What makes a good moment: power-ups, combos, boss fights, level transitions, high scores
- Debug hooks you can use with `eval`: `window.game`, a Phaser `game.scene.scenes[...]`,
  god mode, level select, query params like `?level=3`

## 2. Make it repeatable
Randomness ruins retakes. In order of preference:
1. A seed the game already supports (a query param or config)
2. `initScript` to replace `Math.random` with a seeded PRNG (example in shot-plan.md)
3. `mash` with a fixed `seed`, so the input sequence is identical between takes

Invincibility via `eval` keeps a 10-second gameplay clip from ending at second 3.
Make sure it doesn't show up on screen as a debug label.

## 3. Frame rate
Headless Chromium renders WebGL in software (SwiftShader). Simple 2D canvas games are fine
headless. For three.js, Babylon or heavy Phaser games:
- Check `sourceFps` in `manifest.json`. Below about 24 looks choppy.
- Retake with `--headed`. A real window uses the GPU, and a window briefly appears on
  screen while it records.
- Lower the capture viewport (1280×720) and keep `deviceScaleFactor: 1`.
- A production build (`buildCommand` + `previewCommand`) is often much faster than dev mode.

## 4. Audio
Playwright can't record audio. Game SFX are lost. Use music in the storyboard, or mix in
recorded SFX with `ff.sh`. If the user wants the real game audio, ask them to screen-record
a short gameplay take with sound (QuickTime / OBS) and use that file as a `clip` source.

## 5. Composition tips for game trailers
- Use `frame: "none"` (full-bleed) for gameplay. Browser chrome around a game looks like
  a web page, not a game.
- Cut fast: 1.5–3 s per gameplay moment, and 4–5 s at most for the money shot.
- Open on action, not the title screen. Put the logo and title after the first hit
  (a cold open), or overlay them.
- Short verb headings work best: "Dodge.", "Dash.", "Survive." Use a `badge` for the
  genre or platform ("FREE · PLAYS IN BROWSER").
- End on the CTA with the URL. Put "Play free in your browser" in the subheading,
  because it's the strongest hook a web game has.

## 6. Exported engine builds
- **Godot 4 web export**: needs COOP/COEP headers. Detect sets `static_server.mjs --coop`.
- **Unity WebGL**: pre-compressed `.br`/`.gz` files are served with the right encoding by
  `static_server.mjs`. The first load can take a while; add a `waitFor` on the canvas plus
  a generous `wait`.
- **Pointer-lock FPS games**: pointer lock doesn't work headless. Set `cursor: false` and
  drive the camera with mouse `move` actions if the game supports it without the lock.
  Otherwise use `--headed`.

## 7. Mobile games
For HTML5 games aimed at phones (Capacitor/Cordova builds, Poki/CrazyGames-style portrait
games, games headed for the App Store or Google Play):
- Capture on the device: `"device": "phone"`, plus `"fullscreen": true` because games draw
  under the status bar. Add `"orientation": "landscape"` for landscape games. Set
  `meta.statusBar: false` in the storyboard to match.
- Find the touch controls in the code (`touchstart`, `pointerdown`, virtual joysticks,
  swipe detection) and drive them with `tap`, `longPress` (hold a side of the screen),
  `swipe` and `mash` with `taps` zones, for example
  `{"do":"mash","taps":[{"at":[0.15,0.8]},{"at":[0.85,0.8]}],"ms":6000,"seed":5}`.
- Keep `cursor` on. The fingertip marker shows viewers how the game is played. Set it to
  `false` for pure cinematic cuts.
- The phone recorder runs at about 15–20 fps at 3× for canvas games. Use
  `"deviceScaleFactor": 2` (about 30 fps, still sharp in the frame) and check `sourceFps`.
  Don't capture while a render is running.
- Storyboard: open full-bleed (`frame: "none"`) on a 9:16 canvas, then show the game inside the
  phone frame with a heading that explains the touch controls ("Hold to steer. Swipe to
  dash."), then a `gallery`, then a CTA with `stores` and the game beside it.
