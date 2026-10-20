# Storyboard (`promo/storyboard.json`)

The storyboard is the single source for the video. `build_remotion.mjs` turns it into the
Remotion project. Media paths are relative to the storyboard file, so `captures/gameplay.mp4`
means `promo/captures/gameplay.mp4`. For phone and tablet promos, also read `mobile.md`.

```json
{
  "meta": {
    "title": "Orbit Notes",
    "width": 1920, "height": 1080, "fps": 30,
    "transition": 0.5,
    "url": "orbitnotes.app",
    "logo": "../public/logo.svg",
    "brand": {
      "primary": "#7c5cff", "secondary": "#22d3ee",
      "background": "#08080f", "surface": "#12121c",
      "text": "#f5f6fb", "muted": "#a3a8bd",
      "font": "Inter", "headingFont": "Space Grotesk"
    },
    "music": { "src": "assets/music.mp3", "volume": 0.8, "start": 0 }
  },
  "scenes": [
    { "type": "title", "duration": 2.6, "kicker": "Now in beta", "heading": "Notes that think with you", "subheading": "Capture, link and find anything in seconds" },
    { "type": "clip", "duration": 5, "src": "captures/create-note.mp4", "from": 0.4, "badge": "Capture", "heading": "Write at the speed of thought", "frame": "browser" },
    { "type": "image", "duration": 3.5, "src": "captures/graph.png", "heading": "See how ideas connect", "zoom": { "from": 1, "to": 1.18, "focus": [0.62, 0.4] } },
    { "type": "features", "duration": 5, "heading": "Everything in one place", "src": "captures/search.mp4",
      "items": ["Instant full-text search", { "text": "Offline-first sync", "icon": "⚡" }, "Markdown + backlinks"] },
    { "type": "text", "duration": 2, "heading": "Free for individuals." },
    { "type": "cta", "duration": 3.5, "heading": "Start writing today", "button": "Try Orbit Notes", "url": "orbitnotes.app" }
  ]
}
```

## meta

| field | default | notes |
|---|---|---|
| `width` × `height` | 1920×1080 | 1080×1920 for Reels, Shorts and TikTok; 1080×1080 for square feeds. Layouts adapt to portrait automatically. |
| `fps` | 30 | 60 only for fast gameplay captured at about 60 fps |
| `device` | `desktop` | `phone` or `tablet` makes that the default frame for media scenes (see mobile.md) |
| `deviceStyle` | from capture, else `ios` | `ios` (Dynamic Island, home indicator) or `android` (punch-hole) |
| `deviceColor` | `#1b1b20` | Phone or tablet body colour |
| `statusBar` | `true` | `false` for fullscreen games and apps captured with `fullscreen: true` |
| `homeIndicator` | `true` | `false` hides the iOS home bar |
| `stores` | – | `["app-store", "google-play"]`: generic store badges on the CTA |
| `transition` | 0.5 | Crossfade between scenes, in seconds. Scenes overlap by this amount, so total = Σ durations − (n−1)·transition. |
| `url` | – | Shown in the browser-frame address bar and the CTA |
| `logo` | – | Shown on the title and CTA scenes. Use an SVG or a transparent PNG. Detect lists candidates under `brand.logoCandidates`. |
| `brand` | violet/cyan on near-black | Use the product's real colors. `font` and `headingFont` can be any Google Font family name; `build_remotion.mjs` resolves them and falls back to Inter with a warning. |
| `music` | – | Path or `{src, volume, start}`. It's trimmed and faded to the video length. The volume drops to 0.35 automatically when any scene has a voiceover. |

## Scene types

All scenes take `duration` (seconds, default 3), plus `heading`, `subheading` and `badge`
(a small pill above the heading). They also take `transition`, which sets how the scene
enters: `fade` (default, a crossfade of `meta.transition` seconds), `slide` (pushes in from
the right), or `cut` (no overlap). Use `slide` or `cut` between two device scenes so the
bezels don't ghost.

| type | extra fields | use for |
|---|---|---|
| `title` | `kicker`, `logo: false` | Opening: logo, name, promise |
| `text` | – | A punchy statement between clips ("Built for speed.") |
| `clip` | `src` (mp4), `from` (seconds into the clip), `frame`, `zoom` | Product footage; the core of the video |
| `image` / `screenshot` | `src` (png/jpg), `frame`, `zoom` | Stills with a Ken Burns push-in toward `zoom.focus` |
| `features` | `items[]` (string or `{text, icon}`), optional `src` + `frame` | 2–4 benefits, with or without media beside them |
| `gallery` | `devices[]` of `{src, from?, frame?}` (2–4) | Devices side by side, app-store style. Defaults to phones. |
| `cta` | `button`, `url`, `stores`, `badges[]` (image paths), optional `src`, `logo: false` | Closing call to action. With `src`, the app is shown in a device beside the text. |

### `frame`
The default is `browser` for desktop captures and `phone`/`tablet` for captures taken on those
devices or when `meta.device` is set.
- `browser`: window chrome with traffic lights and the URL. Best for desktop web apps.
- `plain`: rounded card with a shadow and no chrome.
- `phone`: a modern phone with status bar, Dynamic Island (ios) or punch-hole (android), side
  buttons and home indicator. Portrait or landscape follows the media.
- `tablet`: an iPad-style tablet, portrait or landscape.
- `none`: full-bleed footage with the heading as a lower third on a dark scrim. Best for games
  and immersive visuals.

The builder fills in `mediaWidth`/`mediaHeight`, `statusBarRatio` and `topColor`/`bottomColor`
(the status bar and home indicator tint) automatically. Set `topColor`/`bottomColor` on a
scene yourself only if the sampled tint looks wrong.

### `zoom`
`{ "from": 1, "to": 1.15, "focus": [fx, fy] }`: a slow push-in across the scene. In browser
and plain frames it zooms into the UI. On phones and tablets it zooms the whole device, so the
app's edges never slide under the bezel. `focus` is
the **anchor point** (CSS transform-origin, as fractions of the media). That point stays fixed
on screen while everything grows away from it. It is not moved to the centre. At the end of the
zoom, the visible range on each axis is `[f − f/z, f + (1−f)/z]`. For example, focus 0.5 at
z=1.2 shows 0.08–0.92, and focus 0.9 shows 0.15–0.98. To keep a right-hand panel in view, push
fx toward 1. Use zoom to pull the eye to the feature the heading names. Keep `to` at or below
1.25 for UI, or the text gets soft. Check the end frame with `npx remotion still`.

### Vertical / square videos
Full-bleed (`frame: "none"`) landscape footage is cropped to fill a portrait canvas, so only
about a third of the width survives. `zoom.focus` picks which part: `[0.3, 0.5]` keeps the
left-centre. For a proper vertical cut, re-capture the key shots on a phone (`"device": "phone"`, see
mobile.md), or use a framed scene instead of full-bleed. The `PromoVertical`, `PromoSquare`
and `PromoLandscape` compositions reflow framed scenes automatically.

### Clip length
The clip must cover `from + duration`. The builder warns when it doesn't. Fix it by
shortening the scene or retaking the shot with more `tailMs`. Don't slow the footage down
to fill the gap.

### Voiceover (optional)
Add `"voiceover": "assets/vo-2.wav"` to a scene, and optionally `voiceoverDelay` in seconds
(default 0.25). The user can supply recorded lines. For a quick draft voice on macOS, use
`say -v Samantha -o promo/assets/vo-2.aiff "Write at the speed of thought."` and then
`ffmpeg -i promo/assets/vo-2.aiff promo/assets/vo-2.wav`. Label it a placeholder. Measure
each file with `ff.sh probe` and make the scene at least that long plus 0.5 s.
