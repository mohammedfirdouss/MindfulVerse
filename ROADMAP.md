# Roadmap

A **prioritized menu, not a to-do list.** Nothing beyond v0 gets built until the
gate clears. Having the data is not a reason to build.

## The gate

| | |
| --- | --- |
| **Bar** | Day-7 return ≥ 25–30% on 50+ non-friend users within ~4 weeks |
| **Clears** | Build v1 (accounts + payments first), then pull from v2 by priority |
| **Fails (< ~15%)** | Fix the core experience or pivot — the rest of this file is irrelevant |
| **Measured by** | Vercel Analytics (visits) + testers' `/stats` copies (behavior) |

## v0 — shipped (live at mindfulverse.vercel.app)

| Feature | Notes |
| --- | --- |
| Reader (114 surahs) | Arabic (Uthmanic Hafs) + Yusuf Ali + Ibn Kathir, lazy-loaded, passage-grouped commentary |
| Daily check-in | Rotating vetted verse of the day (25-verse pool), neutral emotion picker (8 × 5 vetted verses) |
| Tadabbur sessions | 20 sessions, verbatim assembly, progress + resume, tafsir excerpts |
| Dhikr & breath | 8 sets, breathing circle, tap counting, wake lock, adaptive sizing |
| Journal | Local-only, verse/session attribution, export, backup nudge |
| Search + themes browse | Translation search; 1,049-theme browse into the reader |
| Growth & measurement | Share-a-verse, OG preview card, PWA install prompt, `/stats`, WhatsApp feedback link, analytics |
| Identity | West African indigo, adire band, Fraunces + KFGQPC Hafs, offline PWA |

## v1 — after the gate clears (monetization spine)

| Priority | Feature | Why | Effort | Depends on |
| --- | --- | --- | --- | --- |
| 1 | Accounts (email/OAuth) | Identity for sync + billing | Medium | Backend (first server component) |
| 2 | Journal cloud sync | The #1 trust gap — localStorage is fragile | Medium | Accounts |
| 3 | Subscription billing (Stripe + Play) | Diaspora-pays hypothesis; paywall sessions library + journal history — **never the Qur'an itself** | Medium | Accounts |
| 4 | Push notifications / daily reminder | Biggest retention lever a PWA lacks | Medium | Backend |
| 5 | React Native app | Store presence, reliable notifications, better offline | High | v1 validated on web |

## v2 — deepen (pull by priority once v1 is stable)

| Priority | Feature | Unlocked by | Effort | Blocker / note |
| --- | --- | --- | --- | --- |
| 1 | New sessions on a cadence (2/week) | Themes + tafsir data | Low (authoring) | None — strongest retention play |
| 2 | Topics browse (2,512-topic ontology) | `topics.db` (unused) | Low | Pipeline step + UI |
| 3 | Recitation audio + word highlighting | Timestamp data (4 reciters) | High | **Licensing first** — audio is on Tarteel's CDN, not ours |
| 4 | Related-wording links in reader | Similar-ayahs dataset | Low | Lexical matches — label "related wording," not "related meaning" |
| 5 | Modern English translation | Open alternatives to Yusuf Ali | Low | License check, then `raw-data/` swap + rebuild |
| 6 | User-controlled dark theme | Existing palette work | Low | Default light; never follow OS |

## Later / niche

| Feature | Audience | Note |
| --- | --- | --- |
| Hausa / Yoruba | Nigeria growth base | Blocked on sourcing tafsir data in those languages |
| Arabic tafsirs (Uthaymeen, Saadi) | Arabic readers | Data already in hand |
| Mutashabihat pairs | Memorizers | Narrow but loyal audience |
| Page-accurate mushaf view | Traditionalists | Heavy; layouts + fonts in hand |
| Scholar-vetted emotion guidance | All | Needs a named scholar's endorsement — upgrade from the neutral sets |

## Not blocked by anything (do regardless)

| Task | Why it matters |
| --- | --- |
| Distribution — 50 honest non-friend testers | The entire experiment; the actual bottleneck |
| Day-3 / day-7 tester follow-ups | Where the retention data comes from |
| Written evaluation memo before data arrives | So the numbers get judged by pre-committed rules, not mood |
