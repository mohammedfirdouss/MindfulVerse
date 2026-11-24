# Roadmap

A menu, not a to-do list. Having the data is not a reason to build.

## What MindfulVerse is

Quran.com is where you read. **MindfulVerse is where you sit with one surah, write what it means to you, and get asked a week later whether you did what you wrote.** Everything comes from real sources, never AI. Free for everyone, with no ads and no paywall.

## The launch test

|  |  |
| --- | --- |
| **Who** | 50+ installs from 3+ Qur'an study circles (Nigeria and diaspora) |
| **Where** | Android app (Play testing) and the web app for iPhone |
| **Pass** | 30% or more come back on day 7, over 4 weeks |
| **Also watch** | 20% or more answer their week-later follow-up |
| **Below 15%** | Stop building. Talk to 5 people who left and fix the first session |
| **Measured by** | The anonymous `active_days` signal (`scripts/retention.sql`) |

## Now

1. **Get the testers.** 27 so far (22 November); the aim is 50 from real study circles. This is the actual bottleneck.
2. **Read the first clean numbers.** Only real visits count since 22 November (#74), so day-7 return for real testers can be read from early December.
3. **Ship the Android build** with the latest changes, then Play closed testing. The reader passage map, the welcome back and the spacing fixes are web only until then.
4. **Move to mindfulverse.app.** Register the domain, then update the links.

## Next, in order

| # | What | Why | Uses | Effort |
| --- | --- | --- | --- | --- |
| 1 | **Type your own feeling in Check-in** | People rarely feel exactly one of 12 words. What they type is matched on the phone to the approved feelings; nothing leaves the device | Emotions list plus a word list | Low |
| 2 | **New sessions, two a week** | The strongest reason to come back | Themes and tafsir | Low (writing) |
| 3 | **Khatm plan** | Finish the Qur'an in 30 days (a juz a day) or 7 days (a manzil a day), with a gentle daily marker | Juz (shipped) and manzil (in QUL) | Low |
| 4 | **More topics** | The index shows 499 named topics. About 840 have 2 or more verses; the rest were left out for having more than 15, which a topic page needs a way to handle | Topics | Low |
| 5 | **Related wording** | Verses with near-identical wording, labelled "similar wording", not "similar meaning" | Similar ayahs (1,162 entries) | Low |
| 6 | **Passage map on Android** | The web reader's map of titled passages, on the app | Ayah themes (shipped) | Low |

## Later

| What | For | Note |
| --- | --- | --- |
| Hausa and Yoruba | The Nigerian base | Next after the launch test. Needs a licensed translation first |
| Scholar-reviewed feelings | Everyone | A named scholar reviews new feelings and verse pairings |
| Arabic tafsirs (Sa'di, Ibn Uthaymeen) | Arabic readers | Data in hand |
| Mutashabihat practice | People memorising | 2,232 entries in hand. Narrow but loyal audience |
| Mushaf page view | Traditional readers | Layouts and fonts in hand. Heavy |
| Recitation with word highlighting | Everyone | **Licence first.** The audio is on Tarteel's servers, not ours |

## QUL data: what we use

| Dataset | Status |
| --- | --- |
| Quran text and metadata | Used: reader, search, juz, hizb, quarters |
| Ibn Kathir | Used: reader and Deeper look |
| Al-Mukhtasar | Used: short explanations |
| Surah info (English) | Used: surah introductions |
| Word by word | Used: Deeper look, with Dr Shehnaz's permission |
| Ayah themes | Used: Themes page, Circles portions, and the reader's passage map (1,049 passages; the file lists each twice). 36 verses have no passage in the source (2:134, 40:61, 54:45 to 55, 55:56 to 78); the map shows them as "No title in the source" |
| Topics | Partly used: 499 shown. The file has 2,512 rows, but only about 840 are named topics with 2 or more verses |
| Manzil | Not used. **Next: 7-day khatm** |
| Similar ayahs | Not used. **Next: related wording** |
| Ruku | Not used. Ayah themes split surahs more finely and have titles, so they come first |
| Mutashabihat | Not used. Later |
| Sa'di and Ibn Uthaymeen tafsirs (Arabic) | Not used. Later |
| Mushaf layouts and fonts | Not used. Later |
| Recitation and timing | Not used. Licence first |
| Surah info (Urdu), Albanian tafsir | Not planned |

## Shipped

- **v0 (2026-09):** reader with Arabic, ClearQuran and Ibn Kathir; daily check-in; 20 tadabbur sessions; dhikr; journal; search; offline web app.
- **v1 (2026-09-15):** accounts, journal sync, daily reminders, Android app (built, not yet on the Play Store).
- **Oct to Nov 2026:** surah journal on Home, week-later follow-up, Circles with QR invites, rhythm and a gentle streak, word by word, daily verse API, privacy policy and full account deletion.
- **22 November 2026 (web):**
  - **Passage map in the reader:** "In this surah: N passages" opens a list of titled passages; a tap goes to the first verse. Titles exactly as written, credited to QUL inside the map.
  - **Gentler streak:** after a break Home says "Welcome back to the Qur'an", with no count; Stats hides "Days in a row" under 2.
  - **Returning devices get new data:** Qur'an and feelings files refresh in the background instead of staying a year old.
  - **Only real visits count** toward the launch test: the live site, no automated browsers, release Android builds.
  - **Reading view on phones:** natural word spacing and tighter lines.
  - **Smaller polish:** an empty Journal with two ways to begin, tidier Circles dropdowns, a more readable faint text colour, robots.txt and a sitemap, no failed sign-in check for people who never signed in.
  - **Video:** "Passage by passage", 45 s, Yusuf, Al-A'raf and Al-Ma'idah.
- **Dropped:** subscriptions. MindfulVerse stays free.
