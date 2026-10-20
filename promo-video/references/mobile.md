# Mobile mode: phone and tablet promos

Many web apps and games are really mobile products: PWAs, Capacitor/Cordova/Ionic wrappers,
Expo web builds, or HTML5 games published to the App Store and Google Play. Their promo
should look like a phone app, not a website. Mobile mode changes three things:

| | desktop mode | mobile mode |
|---|---|---|
| Capture viewport | 1600×900 CSS px | phone 393×793 @3× (iPhone-class) or tablet 820×1156 @2× (iPad-class) |
| Input | mouse with a visible cursor | touch (`tap`, `swipe`, `longPress`) with a fingertip marker |
| Frame in the video | browser window | phone or tablet with status bar, Dynamic Island or punch-hole, and home indicator |

## When to use it
- The user says the app or game is for mobile, iPhone, iPad, Android, tablets, the App Store or Google Play.
- `detect_project.mjs` reports `mobile.likely: true`. Mention the signals it found and confirm with the user.
- The product is clearly touch-first: a portrait canvas game, bottom tab bar navigation, a
  `user-scalable=no` viewport.

Ask "phone, tablet or both?" only if it isn't obvious. A single video can mix them, for
example phone scenes plus one "great on iPad too" scene.

## Capture (shots.json)
```json
{
  "device": "phone",
  "shots": [
    { "name": "home", "type": "screenshot", "path": "/" },
    { "name": "add-item", "path": "/", "actions": [
      { "do": "tap", "selector": "[data-testid=add]" },
      { "do": "type", "selector": "input[name=title]", "text": "Buy oat milk" },
      { "do": "tap", "selector": "text=Save" },
      { "do": "swipe", "direction": "up", "distance": 0.4 },
      { "do": "wait", "ms": 800 }
    ]},
    { "name": "ipad-dashboard", "type": "screenshot", "device": "tablet", "path": "/dashboard" }
  ]
}
```
- **Devices:** `phone` (iPhone-style), `phone-android` (Pixel-style), `tablet` (iPad-style),
  `tablet-android`, or any Playwright device name (`"Pixel 7"`, `"iPad Mini"`). Set one for
  the whole plan with `device`, or per shot. Shots on different devices run in separate
  browser sessions.
- **`orientation: "landscape"`** turns the device sideways. Use it for landscape games and
  tablet dashboards. Landscape phones have no status bar.
- **`fullscreen: true`** captures the whole screen height with no status-bar gap. Use it for
  games and other apps that hide the status bar, and set `meta.statusBar: false` in the
  storyboard to match.
- The presets leave the status-bar area out of the capture, because the video template draws
  a realistic status bar there (9:41, signal, Wi-Fi, battery), tinted to match the app's top
  edge.
- Clicks become taps automatically on touch devices, and `hover` is skipped. `drag` becomes a
  touch drag. Use `longPress` (`ms`) for press-and-hold and `swipe` for scrolling carousels,
  pull-to-refresh and game gestures.
- Mobile captures record at full device resolution (1179×2556 for a 3× phone). That's about
  15–30 fps on an idle machine, and less while something else is rendering, so don't capture
  during a Remotion render. That's enough for UI. For games, use `"deviceScaleFactor": 2`
  (about 30 fps, still sharp in the frame) and check `sourceFps`.
- **Independent shots:** shots on one device share state. Add `"fresh": true` to a shot to
  clear storage and cookies before it, so it starts from the seeded state. Use it when a shot
  must look the same whatever ran earlier, or when you retake it with `--only`.
- **Tap timing:** in `marks`, a `tap` entry is when the action started. The finger actually
  lands at the following `pressed` mark, about 0.15 s later, and the UI reacts after that.
  Leave about 0.6 s after the press in the scene so the result is visible.
- Probe with the device too: `capture.mjs --probe / --device phone`. If `overflowX` is true
  the page isn't responsive. Tell the user, because a broken mobile layout will show in the video.

## Storyboard
```json
{
  "meta": { "device": "phone", "deviceStyle": "ios", "stores": ["app-store", "google-play"], "width": 1080, "height": 1920 },
  "scenes": [
    { "type": "clip", "src": "captures/add-item.mp4", "heading": "Add anything in a tap" },
    { "type": "gallery", "heading": "Everything in one place", "devices": [ { "src": "captures/home.png" }, { "src": "captures/add-item.mp4", "from": 2 }, { "src": "captures/stats.png" } ] },
    { "type": "image", "src": "captures/ipad-dashboard.png", "heading": "Great on iPad too" },
    { "type": "cta", "heading": "Get it free", "src": "captures/home.png" }
  ]
}
```
- `meta.device` (`phone` / `tablet`) makes that the default frame for every media scene.
  Captures from a phone or tablet session get the right frame even without it, because the
  manifest records the device.
- `deviceStyle`: `ios` (Dynamic Island, home indicator) or `android` (punch-hole camera).
  It comes from the capture device by default.
- `deviceColor`: the body colour, for example `"#e3e4e6"` for a silver phone.
- `statusBar: false` hides the status bar, for fullscreen games. `homeIndicator: false` hides
  the iOS home bar if it sits on top of the app's own tab bar (common in apps that ignore
  `safe-area-inset-bottom`).
- The status bar's tint is sampled from the app's top edge, using the most common colour
  across the scene. If it comes out wrong, for example when a modal backdrop dominates, set
  `"topColor": "#ffffff"` (and `bottomColor`) on that scene.
- **Zoom on a phone or tablet** moves the camera onto the whole device; it doesn't zoom the
  screen content. Use `zoom.focus` to push toward part of the device.
- **Back-to-back device scenes:** a crossfade between two phones shows two ghosted bezels.
  Give the second scene `"transition": "slide"` or `"cut"`.
- **Layouts adapt.** On a 16:9 canvas a phone sits beside the heading, App Store style; on
  9:16 it sits below. `gallery` lines up 2–4 devices; on 9:16, three phones fan out with the
  middle one in front. `cta` with `src` shows the app beside the call to action.
- **Store badges:** `meta.stores` or `cta.stores` renders generic "App Store" and "Google Play"
  badges in text only. For the official artwork, download the badges from Apple's and
  Google's marketing pages, put them in `promo/assets/`, and list them in `cta.badges`.
  Only show a store the product is actually on (`listed` in detect), and say in your report
  if a badge is a placeholder. For `coming-soon`, write "Coming soon to iPhone and Android"
  and leave out badges unless the user wants them.

## Aspect ratio for mobile products
- **9:16 (1080×1920):** Reels, TikTok, Shorts, Stories. This is the default for mobile
  promos shared on social.
- **16:9:** websites, YouTube, Product Hunt, and Google Play's promo video (a YouTube link).
  Phones sit beside the text.
- **1:1:** feed ads.
Render all three from one storyboard with `npm run render:vertical`, `render:landscape` and
`render:square`.

## Store preview videos
The App Store's *app preview* slot has strict rules: in-app footage only, no device frames,
specific resolutions (for example 886×1920 for current iPhones), 15–30 s. The framed promo is
for marketing everywhere else. For the store slot, cut raw captures to size:
```bash
bash $S/ff.sh storefit promo/captures/add-item.mp4 promo/out/app-preview.mp4 886 1920
```
Check Apple's and Google's current specs before uploading. They change, and the user should
confirm them.
