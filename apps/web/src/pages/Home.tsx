import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import { loadAyahsByKeys, loadSurahs } from "@mindfulverse/core/data";
import { checkedInToday } from "@mindfulverse/core/journal";
import {
  currentStreak,
  getLastRead,
  latestSurahTadabbur,
} from "@mindfulverse/core/progress";
import { useAccount } from "@mindfulverse/core/sync/auth";
import { TRANSLATION_SOURCE_URL } from "@mindfulverse/core/translation";
import type { Ayah } from "@mindfulverse/core/types";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  ChevronIcon,
  DhikrIcon,
  DyeRule,
  ReadIcon,
  TadabburIcon,
} from "../components/Adire";

import "./home.css";

function greeting(hour: number): string {
  if (hour < 5) {
    return "Peace be upon you tonight";
  }
  if (hour < 12) {
    return "Peace be upon you this morning";
  }
  if (hour < 18) {
    return "Peace be upon you today";
  }
  return "Peace be upon you this evening";
}

// The daily check-in is the habit and leads from the verse above; these are
// the places to go when there is more time, or a need.
// An entry with `soon` renders inert, with a "Soon" pill instead of a chevron.
interface Entry {
  to: string;
  title: string;
  desc: string;
  Icon: () => JSX.Element;
  soon?: boolean;
}

const entries: Entry[] = [
  {
    Icon: TadabburIcon,
    desc: "Ponder the Qur’an, surah by surah.",
    title: "Tadabbur",
    to: "/sessions",
  },
  {
    Icon: ReadIcon,
    desc: "The Qur’an, with translation and commentary.",
    title: "Read",
    to: "/read",
  },
  {
    Icon: DhikrIcon,
    desc: "Remembrance, paced to your breath.",
    title: "Dhikr & breath",
    to: "/dhikr",
  },
];

export default function Home() {
  const { user, loading: accountLoading } = useAccount();
  const accountId = user?.id ?? null;
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
    // Each person has their own; wait for the account so it doesn't flip.
    if (accountLoading) {
      return;
    }
    todayVerseKey(accountId)
      .then((key) => loadAyahsByKeys([key]))
      .then(async (a) => {
        if (!active) {
          return;
        }
        const ayah = a[0] ?? null;
        setHero(ayah);
        // oxlint-disable-next-line promise/no-nesting -- fallback for this one load only
        const surahs = await loadSurahs().catch(() => []);
        if (!active) {
          return;
        }
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
  }, [accountId, accountLoading]);

  const reveal = (delay: number): React.CSSProperties =>
    reduced
      ? { opacity: mounted ? 1 : 0, transition: "opacity .5s ease" }
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(10px)",
          transition:
            "opacity .6s var(--ease-out), transform .6s var(--ease-out)",
          transitionDelay: `${delay}ms`,
        };

  // oxlint-disable-next-line react/purity -- the greeting follows the clock on each render
  const hours = new Date().getHours();
  const streak = currentStreak();
  const lastRead = getLastRead();
  const doneToday = checkedInToday();
  const deeper = latestSurahTadabbur();
  const navEntries: Entry[] = lastRead
    ? entries.map((e) =>
        e.to === "/read"
          ? {
              ...e,
              desc: `Pick up at Surah ${lastRead.surah}, verse ${lastRead.ayah}`,
              to: `/read/${lastRead.surah}?v=${lastRead.ayah}`,
            }
          : e
      )
    : entries;

  return (
    <div className="home">
      <header style={reveal(0)}>
        <p className="home-date">{todayLabel()}</p>
        <h1 className="home-greeting">{greeting(hours)}</h1>
      </header>

      {streak >= 2 && (
        <p className="home-streak soft" style={reveal(60)}>
          <span className="home-beads" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <i
                key={i}
                className={i < Math.min(streak, 7) ? "on" : undefined}
              />
            ))}
          </span>
          Day {streak} of returning to the Qur’an
        </p>
      )}

      <section
        aria-label="Today’s verse"
        className="cloth home-verse fade-rise"
      >
        {hero ? (
          <>
            <p
              className="arabic"
              lang="ar"
              style={{ fontSize: "calc(2rem * var(--read-scale,1))" }}
            >
              {hero.arabic}
            </p>
            <p className="translation home-verse-translation">
              {hero.translation}
            </p>
            <p className="cloth-soft home-verse-ref">
              {surahName ? `${surahName} ` : ""}
              {hero.surah}:{hero.ayah}
            </p>
          </>
        ) : (
          <p className="cloth-soft">Opening today’s verse…</p>
        )}

        <div className="home-today">
          {doneToday ? (
            <>
              <p className="cloth-soft" style={{ margin: 0 }}>
                Today’s reflection is saved.
              </p>
              <Link
                to={
                  deeper
                    ? `/tadabbur/${deeper.surah}?v=${deeper.ayah}`
                    : "/sessions"
                }
                className="btn cloth-btn"
              >
                {deeper
                  ? `Continue ${surahNames.get(deeper.surah) ?? `Surah ${deeper.surah}`}`
                  : "Begin tadabbur"}
              </Link>
            </>
          ) : (
            <Link to="/checkin" className="btn cloth-btn">
              Reflect on today’s verse
            </Link>
          )}
        </div>
      </section>

      <nav aria-label="Sections" className="home-entries" style={reveal(260)}>
        {navEntries.map((e) => {
          const body = (
            <>
              <span className="home-entry-well" aria-hidden="true">
                <e.Icon />
              </span>
              <span className="home-entry-text">
                <span className="home-entry-title">{e.title}</span>
                <span className="home-entry-desc">{e.desc}</span>
              </span>
              {e.soon ? (
                <span className="home-entry-soon">Soon</span>
              ) : (
                <span className="home-entry-chevron" aria-hidden="true">
                  <ChevronIcon />
                </span>
              )}
            </>
          );
          return e.soon ? (
            <div key={e.to} className="home-entry inert">
              {body}
            </div>
          ) : (
            <Link key={e.to} to={e.to} className="home-entry">
              {body}
            </Link>
          );
        })}
      </nav>

      <footer style={reveal(320)}>
        <DyeRule />
        {/* Required attribution — the translation is CC BY-NC-ND. */}
        <p className="muted home-attribution">
          English translation by{" "}
          <a
            href={TRANSLATION_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Talal Itani (ClearQuran)
          </a>
          {" · "}
          <Link to="/developers">For developers</Link>
        </p>
      </footer>
    </div>
  );
}

/** "Wednesday 7 October" in the browser's language. */
function todayLabel(): string {
  try {
    return new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      weekday: "long",
    });
  } catch {
    return new Date().toDateString();
  }
}
