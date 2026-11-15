# MindfulVerse promos

Motion promos rendered with [Remotion](https://www.remotion.dev), using the app's own mark (`packages/core/brand.ts`), fonts and palette.

```bash
npm run studio -w @mindfulverse/promo   # preview and scrub in the browser
npm run render -w @mindfulverse/promo   # out/heart-promo.mp4, 1080x1920, 30 fps
```

## HeartPromo (44 s, 9:16, with nasheed)

Story: hook ("What if the Qur'an asked how you're doing first?"), pain at night (meant to read, felt like a lot, scrolled instead, further away), the question turns the screen to daylight, a tap on "Weary" (Ad-Duha 93:3), "Or maybe today feels different", a tap on "Anxious" (Ash-Sharh 94:6), "One verse. One minute.", what else is inside (read, ponder, keep), then the تدبر mark and the call to action. Scene lengths live in `SCENES` in `src/HeartPromo.tsx`.

Audio: "Alhamdulilah (Vocal Only Nasheed)" by Jawad Syed, CC BY 3.0, faded in and out in the video. The licence requires credit: it is on the closing card, and any caption or post should carry it too. See `public/audio/CREDITS.md`.

## WhatsNew (66.5 s, 9:16, with nasheed)

Story: one message, "Read a surah together, each in your own words." Hook on indigo ("Reading the Qur'an is better together."), the تدبر mark and "What's new in MindfulVerse", the pain (a surah opened alone, chat bubbles pulling away), "Now there are circles.", then the circle flow on real screens: name it and pick Al-Kahf, share the link, a friend's Home ("Al-Noor halaqa is reading Al-Kahf"), pondering a verse with Ibn Kathir, the privacy line, and the anonymous weekly count. "Also new" tours Home's surah lead, the private week dots, session actions and their follow-up a week later, the Android app (surah page, sessions, search) and Circles in the desktop sidebar. It closes on "Start a circle." and the end card. Scene lengths live in `LENGTHS` in `src/WhatsNew.tsx`.

Screens come from `scripts/capture-whatsnew.mjs` (output in `public/screens/whatsnew`, with measured positions in `layout.json`). It seeds invented localStorage data (a circle "Al-Noor halaqa", journal entries, a session draft) and answers every InsForge request with `page.route`, including a fake signed-in test account for the "Start a circle" form, so nothing reaches the real backend. It needs the web preview and the Expo web server running:

```bash
npm run build                                                        # repo root
npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
(cd apps/mobile && CI=1 npx expo start --web --port 8099)            # Android screens
npm run capture:whatsnew -w @mindfulverse/promo                      # SKIP_MOBILE=1 to skip Expo
npm run render:whatsnew -w @mindfulverse/promo                       # out/whats-new.mp4
npm run render:whatsnew:silent -w @mindfulverse/promo                # out/whats-new-silent.mp4
```

Audio: the 46 s nasheed plays twice, crossfaded over two seconds, and fades out on the end card. The licence (CC BY 3.0) requires credit: the end card of `WhatsNew` reads "Nasheed: “Alhamdulilah” by Jawad Syed, CC BY 3.0", and any caption or post using the video should carry it too. `WhatsNewSilent` has no music and no credit line. See `public/audio/CREDITS.md`.

## OneSurahOneWeek, StandLoop and StartACircle

Three shorter videos that share one set of screens and one helper file (`src/threeKit.tsx`).

- **OneSurahOneWeek** (39 s, 9:16, with nasheed; `OneSurahOneWeekSilent` has no music). One person stays with Ash-Sharh: picks it on Home, says why, reads verse 94:5 with Ibn Kathir, writes a reflection and an action, and a week later Home asks "Did you do it?". Scene lengths live in `LENGTHS` in `src/OneSurahOneWeek.tsx`.
- **StandLoop** (31 s, 16:9) and **StandLoopVertical** (31 s, 9:16), silent, for a laptop or phone on an exhibition stand. Six large-type scenes with a small QR code for the site in a corner all the way through, and the large code at the end. The video loops without a jump: the last scene hands back to the first inside the timeline, so the final frame runs straight into frame 0. Set the player to repeat. The QR code is drawn from `QR_PATH` in `src/StandLoop.tsx`; if the site address changes, replace that path.
- **StartACircle** (30.5 s, 9:16, with nasheed; `StartACircleSilent` has no music). How to start a circle in three steps (name it, pick a surah, share the link), then what a friend sees after tapping the link: the circle's surah on Home and the anonymous weekly count. The chat message is a plain drawn bubble with the app's own share text.

Screens come from `scripts/capture-three.mjs` (output in `public/screens/three`, with measured positions in `layout.json`). Like the WhatsNew script, it uses invented data only ("Friday friends", a test account, one week-old journal entry) and answers every backend request itself, so nothing reaches the real project. Verse text, translation and commentary are whatever the app renders from its bundled data. It needs the web preview running:

```bash
npm run build                                                        # repo root
npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
npm run capture:three -w @mindfulverse/promo
npm run render:onesurah -w @mindfulverse/promo          # out/one-surah-one-week.mp4
npm run render:onesurah:silent -w @mindfulverse/promo   # out/one-surah-one-week-silent.mp4
npm run render:stand -w @mindfulverse/promo             # out/stand-loop-landscape.mp4
npm run render:stand:vertical -w @mindfulverse/promo    # out/stand-loop-vertical.mp4
npm run render:circle -w @mindfulverse/promo            # out/start-a-circle.mp4
npm run render:circle:silent -w @mindfulverse/promo     # out/start-a-circle-silent.mp4
```

Credits: the translation credit ("English translation by Talal Itani (ClearQuran)") is on screen whenever English verse text shows. The versions with the nasheed carry "Nasheed: “Alhamdulilah” by Jawad Syed, CC BY 3.0" on the closing card, and any caption or post should carry it too. The nasheed plays once through with a fade in and out.

## Explainer (61 s, 9:16, with nasheed; `ExplainerSilent` has no music)

What MindfulVerse is, in a minute: most of us read a surah and move on; the app helps you stay with one. It walks the three steps (pick a surah, go verse by verse with Ibn Kathir, write what it says to you and one thing you will do), the follow-up a week later, the surah's own journal page, reading with friends in a circle, and closes on "Every word from a real source. No AI.", "Free. No ads." and the end card. Scene lengths live in `LENGTHS` in `src/Explainer.tsx`.

It reuses `src/threeKit.tsx` and the screens from `scripts/capture-three.mjs`, which also captures the journal page (`surah-journal.png`). The silent version is made for a voiceover: the phone sits higher than in the other videos and nothing but the translation credit is in the bottom 12% of the frame. In the nasheed version the 46 s track plays twice, crossfaded over two seconds, and fades out on the end card, which carries the nasheed credit.

```bash
npm run capture:three -w @mindfulverse/promo             # needs the web preview, as above
npm run render:explainer -w @mindfulverse/promo          # out/explainer.mp4
npm run render:explainer:silent -w @mindfulverse/promo   # out/explainer-silent.mp4
```
