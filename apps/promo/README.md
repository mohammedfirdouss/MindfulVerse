# MindfulVerse promos

Motion promos rendered with [Remotion](https://www.remotion.dev), using the app's own mark (`packages/core/brand.ts`), fonts and palette.

```bash
npm run studio -w @mindfulverse/promo   # preview and scrub in the browser
npm run render -w @mindfulverse/promo   # out/heart-promo.mp4, 1080x1920, 30 fps
```

## HeartPromo (44 s, 9:16, with nasheed)

Story: hook ("What if the Qur'an asked how you're doing first?"), pain at night (meant to read, felt like a lot, scrolled instead, further away), the question turns the screen to daylight, a tap on "Weary" (Ad-Duha 93:3), "Or maybe today feels different", a tap on "Anxious" (Ash-Sharh 94:6), "One verse. One minute.", what else is inside (read, ponder, keep), then the تدبر mark and the call to action. Scene lengths live in `SCENES` in `src/HeartPromo.tsx`.

Audio: "Alhamdulilah (Vocal Only Nasheed)" by Jawad Syed, CC BY 3.0, faded in and out in the video. The licence requires credit: it is on the closing card, and any caption or post should carry it too. See `public/audio/CREDITS.md`.
