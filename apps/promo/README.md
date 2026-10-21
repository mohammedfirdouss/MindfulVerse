# MindfulVerse promos

Motion promos rendered with [Remotion](https://www.remotion.dev), using the app's
own mark (`packages/core/brand.ts`), fonts and palette.

```bash
npm run studio -w @mindfulverse/promo   # preview and scrub in the browser
npm run render -w @mindfulverse/promo   # out/heart-promo.mp4, 1080x1920, 30 fps
```

## HeartPromo (29 s, 9:16)

Story: hook ("What if the Qur'an asked how you're doing first?"), pain at night
(meant to read, felt like a lot, scrolled instead, further away), the question
turns the screen to daylight, a tap on "Weary", Ad-Duha 93:3 on indigo cloth,
"One verse. One minute.", then the تدبر mark and the call to action.
Scene lengths live in `SCENES` in `src/HeartPromo.tsx`.

Sound is added when posting (TikTok / Reels sound library), so the video works
silently with every line on screen. Beats to land a nasheed or effect on:

| Time | Moment | Suggested sound |
|---|---|---|
| 0.0 s | Hook words appear | soft rise |
| 3.2 s | "You meant to read today." | quiet |
| 7.2 s | The feed flicks | low whoosh |
| 11.7 s | Adire band sweeps, daylight | gentle chime |
| 15.3 s | Tap on "Weary" | soft tap |
| 16.9 s | The verse rises on cloth | swell, then hold |
| 24.6 s | The mark builds | light percussive ticks |
