# Roadmap

A **prioritized menu, not a to-do list.** Having the data is not a reason to build.

## The gate — cleared (2026-09-15)

| | |
| --- | --- |
| **Bar** | Day-7 return ≥ 25–30% on 50+ non-friend users within ~4 weeks |
| **Outcome** | Cleared — v1 (accounts, sync, reminders) built and shipped 2026-09-15 |
| **Measured by** | Vercel Analytics (visits) + testers' `/stats` copies (behavior) |
| **Still gated** | Billing stays blocked on a commercial-safe translation license (see v1 row 3) |

## v0 — shipped (live at mindfulverse.vercel.app)

| Feature | Notes |
| --- | --- |
| Reader (114 surahs) | Arabic (Uthmanic Hafs) + Itani/ClearQuran + Ibn Kathir, lazy-loaded, passage-grouped commentary, Arabic-only view toggle |
| Daily check-in | Rotating vetted verse of the day (25-verse pool), neutral emotion picker (8 × 5 vetted verses) |
| Tadabbur sessions | 20 sessions, verbatim assembly, progress + resume, tafsir excerpts |
| Dhikr & breath | 8 sets, breathing circle, tap counting, wake lock, adaptive sizing |
| Journal | Local-only, verse/session attribution, export, backup nudge |
| Search + topics browse | Translation search; verses-by-topic index into the reader |
| Modern English translation | Talal Itani / ClearQuran (CC BY-NC-ND — non-commercial; see v1 billing blocker) |
| User-controlled dark theme | Default light, user toggle; never follows OS |
| Growth & measurement | Share-a-verse, OG preview card, PWA install prompt, `/stats`, WhatsApp feedback link, analytics |
| Identity | West African indigo, adire band, Fraunces + KFGQPC Hafs, offline PWA |

## v1 — shipped 2026-09-15 (monetization spine)

| Priority | Feature | Status | Why | Effort | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | Accounts (email/OAuth) | **Shipped** | Identity for sync + billing | Medium | Backend (first server component) |
| 2 | Journal cloud sync | **Shipped** | The #1 trust gap — localStorage is fragile | Medium | Accounts |
| 3 | Subscription billing (Stripe + Play) | Blocked | Diaspora-pays hypothesis; paywall sessions library + journal history — **never the Qur'an itself** | Medium | Accounts + **commercial-safe translation license** (current Itani translation is CC BY-NC-ND: non-commercial — obtain publisher permission or swap before any revenue) |
| 4 | Push notifications / daily reminder | **Shipped** | Biggest retention lever a PWA lacks | Medium | Backend |
| 5 | React Native app | Deferred | Store presence, reliable notifications, better offline | High | v1 validated on web |

## v2 — deepen (pull by priority once v1 is stable)

| Priority | Feature | Unlocked by | Effort | Blocker / note |
| --- | --- | --- | --- | --- |
| 1 | New sessions on a cadence (2/week) | Themes + tafsir data | Low (authoring) | None — strongest retention play |
| 2 | Richer topic ontology (2,512 topics) | `topics.db` (unused) | Low | Enriches the existing verses-by-topic page; pipeline step + UI |
| 3 | Recitation audio + word highlighting | Timestamp data (4 reciters) | High | **Licensing first** — audio is on Tarteel's CDN, not ours |
| 4 | Related-wording links in reader | Similar-ayahs dataset | Low | Lexical matches — label "related wording," not "related meaning" |

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
