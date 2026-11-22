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

1. **Get the testers.** 50 people from real study circles. This is the actual bottleneck.
2. **Ship the Android build** with the latest changes, then Play closed testing.
3. **Move to mindfulverse.app.** Register the domain, then update the links.

## Next, in order

| # | What | Why | Uses | Effort |
| --- | --- | --- | --- | --- |
| 1 | **Passage titles in the reader** | A surah opens as a short map of titled passages, so you know what each part is about before you read. Our answer to ScrollQuran, joined to reflection | Ayah themes (2,098 passages, already shipped for Themes and Circles) | Low |
| 2 | **Type your own feeling in Check-in** | People rarely feel exactly one of 12 words. What they type is matched on the phone to the approved feelings; nothing leaves the device | Emotions list plus a word list | Low |
| 3 | **New sessions, two a week** | The strongest reason to come back | Themes and tafsir | Low (writing) |
| 4 | **Khatm plan** | Finish the Qur'an in 30 days (a juz a day) or 7 days (a manzil a day), with a gentle daily marker | Juz (shipped) and manzil (in QUL) | Low |
| 5 | **More topics** | The topic index shows 499 of 2,512 topics | Topics | Low |
| 6 | **Related wording** | Verses with near-identical wording, labelled "similar wording", not "similar meaning" | Similar ayahs (1,162 entries) | Low |

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
| Ayah themes | Used: Themes page and Circles portions. **Next: reader titles** |
| Topics | Partly used: 499 of 2,512 |
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
- **Since (Oct to Nov 2026):** surah journal on Home, week-later follow-up, Circles with QR invites, rhythm and a gentle streak, word by word, daily verse API, privacy policy and full account deletion.
- **Dropped:** subscriptions. MindfulVerse stays free.
