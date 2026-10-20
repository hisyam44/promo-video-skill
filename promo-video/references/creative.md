# Creative direction for promo videos

A promo video has to sell, not just show. The tools handle the pixels; this page is about
choosing what goes in front of the viewer and in what order.

## Find the story before you capture anything
From the README, landing page copy, routes and main components, write down:
1. **Who it's for**, in one phrase ("indie devs shipping side projects")
2. **The promise**: the outcome, not the feature ("ship your landing page in 5 minutes")
3. **3–4 proof moments**: things the app does on screen that back up the promise. Each one
   should be visible in a single 3–6 s clip. These moments are your shot list.
4. **The CTA**: URL, app store, "play free in your browser", waitlist

If the project doesn't make these obvious, ask the user. A promo built around the wrong
selling point is wasted work.

## Structures that work

**15 s (social ad)**: hook clip 3 s → 2 proof clips × 4 s → CTA 3 s. No title scene; the
logo goes on the CTA.

**20 s**: hook clip or title 2.5 s → 2 proof clips × 5 s → `features` 4.5 s → CTA 3 s.

**30 s (default)**: title 2.5 s → 3 proof clips (4–5 s each, one a `features` scene) →
statement 2 s → CTA 3.5 s.

**45–60 s (launch / Product Hunt)**: hook → problem statement (`text`) → 4–5 proof scenes
→ social proof or stats (`text`/`features`) → CTA. Usually needs a voiceover or music to
hold attention.

**Mobile app (15–30 s, usually 9:16)**: hook clip in a phone 3 s → 2–3 proof clips → `gallery`
of key screens → CTA with store badges and the app beside it. See mobile.md.

**Game trailer (20–40 s)**: cold-open gameplay 2–3 s → title → 3–5 rapid gameplay beats
with one-word headings → "Free in your browser" → CTA. See games.md.

## Copy rules
- Headings of 2–6 words, written in benefit language ("Find any note instantly", not "Search feature")
- Subheadings are optional and stay under 12 words
- Use the product's real terms and real data in captures. Avoid lorem ipsum and empty states:
  seed demo content via `before` actions, `localStorage` or the app's seed scripts.
- Use one idea per scene. If a scene needs two headings, split it into two scenes.

## Pacing and motion
- Scene length: about 0.35 s per word of heading, plus however long the action in the clip takes
- Change something on screen every 2–3 s: a click, a scroll, a zoom, or a cut
- Use `zoom.focus` to steer attention to where the action happens, because a full-screen UI
  shrunk into a frame is hard to read
- For UI recordings, slow, deliberate cursor moves (650 ms glides plus 400–800 ms holds) read
  better than fast ones

## Visual consistency
- Use the brand colors from detect (`brand.cssColors`, `themeColor`) and the app's own font
- Dark backgrounds make UI footage pop. If the app is light-themed, still prefer a dark
  canvas so the bright browser frame stands out, unless the brand is clearly light.
- Logo: prefer an SVG. If there's only a favicon, leave the logo out rather than blowing up
  a 32 px icon.

## Before you call it done
Look at stills from several scenes (`npx remotion still Promo out.png --frame N`) and check:
- Is every heading readable, and does any text overflow its box?
- Does any clip show a loading spinner, an error, a dev overlay or a cookie banner?
- Does the first second hook the viewer? Social viewers decide that fast.
- Is the CTA on screen long enough to read (at least 2.5 s)?
