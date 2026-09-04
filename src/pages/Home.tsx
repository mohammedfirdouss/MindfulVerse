import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAyahsByKeys } from "../lib/data";
import type { Ayah } from "../lib/types";

// The app's signature verse — hearts finding rest in remembrance. Sets the tone.
const HERO_VERSE = "13:28";

function greeting(hour: number): string {
  if (hour < 5) return "Peace be upon you tonight";
  if (hour < 12) return "Peace be upon you this morning";
  if (hour < 18) return "Peace be upon you today";
  return "Peace be upon you this evening";
}

const entries = [
  { to: "/checkin", title: "Daily check-in", desc: "A verse for this moment, and a line to journal." },
  { to: "/sessions", title: "Tadabbur", desc: "Sit with a theme — verse, meaning, reflection." },
  { to: "/read", title: "Read", desc: "The Qur’an, with translation and commentary." },
];

export default function Home() {
  const [hero, setHero] = useState<Ayah | null>(null);
  const [mounted, setMounted] = useState(false);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let active = true;
    loadAyahsByKeys([HERO_VERSE])
      .then((a) => active && setHero(a[0] ?? null))
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

  return (
    <div>
      <p className="label" style={{ marginTop: 8, ...reveal(0) }}>
        {greeting(hours)}
      </p>

      <section aria-label="A verse to begin with" style={{ margin: "26px 0 34px", ...reveal(120) }}>
        {hero ? (
          <>
            <p className="arabic" style={{ fontSize: "calc(2.4rem * var(--read-scale,1))" }}>
              {hero.arabic}
            </p>
            <p
              className="translation"
              style={{ fontSize: "1.2rem", lineHeight: 1.6, marginTop: 14, color: "var(--ink)" }}
            >
              {hero.translation}
            </p>
            <p className="label" style={{ marginTop: 12 }}>
              Ar-Ra‘d · {hero.surah}:{hero.ayah}
            </p>
          </>
        ) : (
          <p className="muted">Opening today’s verse…</p>
        )}
      </section>

      <nav aria-label="Sections" className="home-entries" style={reveal(260)}>
        {entries.map((e) => (
          <Link key={e.to} to={e.to} className="home-entry">
            <span>
              <span className="home-entry-title">{e.title}</span>
              <span className="home-entry-desc">{e.desc}</span>
            </span>
            <span className="home-entry-arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>

      <style>{`
        .home-entries { border-top: 1px solid var(--line); }
        .home-entry {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 18px 2px; border-bottom: 1px solid var(--line);
          color: var(--ink); transition: padding-left .18s var(--ease-out);
        }
        .home-entry:hover { padding-left: 8px; }
        .home-entry-title { display: block; font-size: 1.2rem; font-weight: 500; }
        .home-entry-desc { display: block; color: var(--ink-faint); font-size: .98rem; margin-top: 2px; }
        .home-entry-arrow { color: var(--lapis); font-size: 1.1rem; flex: none; }
        @media (prefers-reduced-motion: reduce) { .home-entry, .home-entry:hover { transition: none; padding-left: 2px; } }
      `}</style>
    </div>
  );
}
