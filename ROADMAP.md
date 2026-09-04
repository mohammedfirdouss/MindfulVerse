# Roadmap — what to build next, by the data we already have

This maps the datasets in `QUL copy/` to the features they could unlock. It is a
**prioritized menu, not a to-do list.** Nothing here gets built until v0 proves
people come back (see "The gate" below). Having the data is not a reason to build.

## The gate (read first)

Do **not** start anything below until v0 clears its bar:
**Day-7 return ≥ 25–30% on 50+ non-friend users within ~4 weeks.**
- If it clears → build v1 (accounts + payments) first, then pull from this menu.
- If it doesn't → fix the core experience or pivot. This menu is irrelevant until then.

## Data we already use (v0)

Arabic text · Yusuf Ali translation · Ibn Kathir tafsir (English) · Ayah themes.

## Data we have but haven't used yet

Each item lists: what it is → what it could unlock → what's needed first.

### High value, low effort
- **Topics ontology (2,512 topics, with descriptions + verse lists)**
  → Browse-by-topic and search. A second way into the Qur'an besides themes/emotions.
  → Needs: a pipeline step to export it + a simple browse UI.
- **More tadabbur sessions**
  → We shipped 10. The themes + tafsir data can back many more, authored the same way.
  → Needs: only authoring time. Release on a cadence (e.g. 2/week) to keep people returning.

### High value, higher effort
- **Word-level recitation timestamps (Husary, Minshawi, Al-Dosari, Abdul Basit)**
  → Play recitation with each Arabic word highlighted as it's recited.
  → Needs: the audio itself is **remote (Tarteel CDN)** — must confirm licensing and
    decide hosting/download before shipping. This is a licensing task first, code second.
- **Similar ayahs**
  → "Verses that echo this one" links inside the reader and sessions.
  → Note: this dataset matches on **shared words, not meaning** — present it as
    "related wording," not "related themes," or it will mislead.

### Later / niche
- **Arabic tafsirs (Uthaymeen, Saadi)** → only useful once there are Arabic-reading users.
- **Mutashabihat (similar-passage pairs)** → a study/memorization aid; narrow audience.
- **Mushaf layouts + fonts** → page-accurate mushaf view; nice-to-have, heavy.
- **Surah info (en/ur)** → short "about this surah" intros in the reader; small, easy add.

## Not blocked by data (product/business, do these regardless)

- **Distribution** — the real risk. Getting 50 honest non-friend users in front of v0.
- **v1 essentials once validated** — accounts, subscription billing, journal cloud sync.
- **A more modern English translation** — Yusuf Ali is public-domain but archaic; source an
  open modern one and swap it in (`raw-data/` + `npm run build:data`).
- **Languages** — Hausa/Yoruba need tafsir data we don't have yet; sourcing it is step one.

## Suggested order (only after the gate)

1. More tadabbur sessions on a release cadence (retention).
2. Topics browse + search (a second door in).
3. Surah "about" intros + related-wording links (small enrichers).
4. Recitation audio with word highlighting (after licensing is settled).
