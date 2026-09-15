# MindfulVerse

A quiet app for reflecting on the Qur'an. Read verses with translation and
commentary, sit with a short guided reflection, count your dhikr, and keep a
private journal.

It works in the browser, needs no sign up, and works offline. This is an early
version. It is free.

Live at [mindfulverse.vercel.app](https://mindfulverse.vercel.app)

## Features

- **Daily check-in.** A verse for today, a gentle mood picker, and a place to journal.
- **Tadabbur sessions.** 20 short guided reflections. Each one has a theme, a few verses, and a prompt.
- **Dhikr and breath.** A breathing circle paced to remembrance, with tap counting.
- **Read.** All 114 surahs with Arabic, English translation, and Ibn Kathir's commentary.
- **Search and topics.** Search the translation, or find verses by topic and jump into the reader.
- **Journal.** Your reflections, saved on your device, with the verse they were written about.

All Qur'an text, translation, and commentary are shown exactly as they are.
The app never rewrites or generates religious content.

## Screenshots

| Home | Reader | Daily check-in |
| --- | --- | --- |
| ![Home](docs/screenshots/home.png) | ![Reader](docs/screenshots/reader.png) | ![Daily check-in](docs/screenshots/checkin.png) |

| Tadabbur sessions | Browse by theme | Dhikr and breath |
| --- | --- | --- |
| ![Tadabbur sessions](docs/screenshots/sessions.png) | ![Browse by theme](docs/screenshots/themes.png) | ![Dhikr and breath](docs/screenshots/dhikr.png) |

## Run it

```bash
npm install
npm run build:data
npm run dev
```

Other commands: `npm run build` makes a production build, and `npm run preview` serves it.

## How it is built

React, TypeScript, and Vite, with a service worker for offline use. There is no
server. All data is bundled, and the journal lives in your browser.

```text
src/lib/       data loaders, journal, analytics
src/pages/     the screens
scripts/       build-data.mjs, which turns raw datasets into app data
public/data/   generated Qur'an, tafsir, themes, sessions, emotions
raw-data/      source datasets, not committed
```

To change the data, update the files in `raw-data/` and run `npm run build:data` again.

## Acknowledgments

The Qur'anic datasets come from the [Quranic Universal Library](https://qul.tarteel.ai)
by [Tarteel](https://tarteel.ai). This app would not exist without their work.

The English translation is [ClearQuran](https://www.clearquran.com) by Talal Itani,
used under the CC BY-NC-ND 4.0 license. The Arabic typeface is the KFGQPC Uthmanic
Hafs script from the King Fahd Glorious Qur'an Printing Complex in Madinah.

## Accounts & sync (v1)

Signing in is optional — the whole app works signed-out, offline, on-device.
An account only backs up your journal and progress so they follow you to
another device. Auth, storage, and Postgres are provided by
[InsForge](https://insforge.dev); there is no other server.

| Env var | Used for |
| --- | --- |
| `VITE_INSFORGE_URL` | The InsForge project's base API URL |
| `VITE_INSFORGE_ANON_KEY` | Public anon key for unauthenticated/auth requests |
| `VITE_VAPID_PUBLIC_KEY` | Public key for the daily verse reminder (Web Push) |

Set these in `.env` (or `.env.local`) for local development — see
`.env.example`. On Vercel, add all three under Project → Settings →
Environment Variables for both **Production** and **Preview**, then redeploy;
they are `VITE_*` so Vite inlines them at build time, not at runtime.

Backend setup — SQL migrations live in `migrations/`, and the reminder/push
edge functions live in `functions/`; both are applied to the InsForge
project directly (see the InsForge CLI), not run from this repo.

The merge story, in three sentences: everything is written to `localStorage`
first, so the app never blocks on the network; signing in, reconnecting, or
returning to the tab triggers a sync that pulls the account's remote journal
and progress and merges them with what's on this device — journal entries
by union-by-id with soft-delete tombstones, progress by per-key max /
earliest-completion / latest-read / set-union — then pushes back only the
resulting diff. Every merge is deliberately commutative and idempotent —
running it twice, or on two devices at once, converges to the same state
rather than duplicating or clobbering entries.

## Good to know

- The translation renders the divine name as "God". It is shown word for word,
  as the license requires.
- Ibn Kathir wrote commentary on passages, so some verses share a note with a
  neighboring verse.
- Recitation audio, accounts, payments, and more languages are planned for later.
  See `ROADMAP.md`.
