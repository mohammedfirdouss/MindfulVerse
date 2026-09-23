import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAyahsByKeys, loadSurahs } from "../lib/data";
import { todayVerseKey } from "../lib/dailyVerse";
import { checkedInToday } from "../lib/journal";
import { currentStreak, getLastRead, latestSurahTadabbur } from "../lib/progress";
import type { Ayah } from "../lib/types";

function greeting(hour: number): string {
  if (hour < 5) return "Peace be upon you tonight";
  if (hour < 12) return "Peace be upon you this morning";
  if (hour < 18) return "Peace be upon you today";
  return "Peace be upon you this evening";
}

// The daily check-in is the habit and leads from the verse above; these are
// the places to go when there is more time, or a need.
const entries = [
  { to: "/sessions", title: "Tadabbur", desc: "Ponder the Qur’an, surah by surah." },
  { to: "/read", title: "Read", desc: "The Qur’an, with translation and commentary." },
  { to: "/dhikr", title: "Dhikr & breath", desc: "Remembrance, paced to your breath." },
];

export default function Home() {
  const [hero, setHero] = useState<Ayah | null>(null);
  const [surahName, setSurahName] = useState<string>("");
  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());
  const [mounted, setMounted] = useState(false);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    document.title = "MindfulVerse";
  }, []);

  useEffect(() => {
    let active = true;
    // Today's verse — from anywhere in the Qur'an, same as the check-in page.
    todayVerseKey()
      .then((key) => loadAyahsByKeys([key]))
      .then(async (a) => {
        if (!active) return;
        const ayah = a[0] ?? null;
        setHero(ayah);
        const surahs = await loadSurahs().catch(() => []);
        if (!active) return;
        setSurahNames(new Map(surahs.map((s) => [s.number, s.name])));
        if (ayah) {
          setSurahName(surahs.find((s) => s.number === ayah.surah)?.name ?? "");
        }
      })
      .catch(() => {});
    const id = requestAnimationFrame(() => active && setMounted(true));
    return () => {
      active = false;
      cancelAnimationFrame(id);
    };
  }, []);

  const reveal = (delay: number): React.CSSProperties =>
    reduced
      ? { opacity: mounted ? 1 : 0, transition: "opacity .5s ease" }
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(10px)",
          transition: "opacity .6s var(--ease-out), transform .6s var(--ease-out)",
          transitionDelay: `${delay}ms`,
        };

  const hours = new Date().getHours();
  const streak = currentStreak();
  const lastRead = getLastRead();
  const doneToday = checkedInToday();
  const deeper = latestSurahTadabbur();
  const navEntries = lastRead
    ? entries.map((e) =>
        e.to === "/read"
          ? {
              ...e,
              to: `/read/${lastRead.surah}?v=${lastRead.ayah}`,
              desc: `Continue where you stopped — Surah ${lastRead.surah}, verse ${lastRead.ayah}`,
            }
          : e
      )
    : entries;

  return (
    <div>
      <p className="eyebrow" style={{ marginTop: 8, ...reveal(0) }}>
        {greeting(hours)}
      </p>

      {streak >= 2 && (
        <p className="soft" style={{ fontSize: ".9rem", marginTop: 6, ...reveal(60) }}>
          Day {streak} of returning to the Qur’an
        </p>
      )}

      <section aria-label="A verse to begin with" style={{ margin: "26px 0 34px", ...reveal(120) }}>
        {hero ? (
          <>
            <p className="arabic" lang="ar" style={{ fontSize: "calc(2.4rem * var(--read-scale,1))" }}>
              {hero.arabic}
            </p>
            <p
              className="translation"
              style={{ fontSize: "1.2rem", lineHeight: 1.6, marginTop: 14, color: "var(--ink)" }}
            >
              {hero.translation}
            </p>
            <p className="eyebrow" style={{ marginTop: 12 }}>
              {surahName ? `${surahName} · ` : ""}
              {hero.surah}:{hero.ayah}
            </p>
          </>
        ) : (
          <p className="muted">Opening today’s verse…</p>
        )}

        <div className="home-today">
          {doneToday ? (
            <>
              <p className="soft" style={{ margin: 0 }}>
                Today’s reflection is saved.
              </p>
              <Link
                to={deeper ? `/tadabbur/${deeper.surah}` : "/sessions"}
                className="btn secondary"
              >
                {deeper
                  ? `Go deeper — continue ${surahNames.get(deeper.surah) ?? `Surah ${deeper.surah}`}`
                  : "Go deeper — begin tadabbur"}
              </Link>
            </>
          ) : (
            <Link to="/checkin" className="btn">
              Reflect on today’s verse
            </Link>
          )}
        </div>
      </section>

      <nav aria-label="Sections" className="home-entries" style={reveal(260)}>
        {navEntries.map((e) => (
          <Link key={e.to} to={e.to} className="home-entry">
            <span>
              <span className="home-entry-title">{e.title}</span>
              <span className="home-entry-desc">{e.desc}</span>
            </span>
            <span className="home-entry-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </nav>

      <footer style={{ marginTop: 30, ...reveal(320) }} className="stack">
        {/* Required attribution — the translation is CC BY-NC-ND. */}
        <p className="muted" style={{ fontSize: ".8rem", margin: "10px 0 0" }}>
          English translation by{" "}
          <a href="https://www.clearquran.com" target="_blank" rel="noopener noreferrer">
            Talal Itani (ClearQuran)
          </a>
        </p>
      </footer>


      <style>{`
        .home-today { margin-top: 24px; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
        .home-entries { border-top: 1px solid var(--line); }
        .home-entry {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 14px 2px; border-bottom: 1px solid var(--line);
          color: var(--ink); transition: padding-left .18s var(--ease-out);
        }
        .home-entry:hover { padding-left: 8px; }
        .home-entry-title { display: block; font-size: 1.05rem; font-weight: 500; }
        .home-entry-desc { display: block; color: var(--ink-faint); font-size: .92rem; margin-top: 2px; }
        .home-entry-arrow { color: var(--lapis); font-size: 1.1rem; flex: none; }
        @media (prefers-reduced-motion: reduce) { .home-entry, .home-entry:hover { transition: none; padding-left: 2px; } }
      `}</style>
    </div>
  );
}
