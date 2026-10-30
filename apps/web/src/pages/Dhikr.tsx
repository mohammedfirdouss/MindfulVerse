import { track } from "@mindfulverse/core/analytics";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// Mass-transmitted adhkar only — universally known formulas, no authored
// religious content. Arabic + transliteration + meaning, per the plan.
interface DhikrItem {
  arabic: string;
  translit: string;
  meaning: string;
  count: number;
}

interface DhikrSet {
  id: string;
  title: string;
  desc: string;
  items: DhikrItem[];
}

const SETS: DhikrSet[] = [
  {
    desc: "Glorify, praise, and magnify — the remembrance taught after every prayer.",
    id: "tasbih",
    items: [
      {
        arabic: "سُبْحَانَ ٱللَّهِ",
        count: 33,
        meaning: "Glory be to Allah",
        translit: "SubhanAllah",
      },
      {
        arabic: "ٱلْحَمْدُ لِلَّهِ",
        count: 33,
        meaning: "All praise is for Allah",
        translit: "Alhamdulillah",
      },
      {
        arabic: "ٱللَّهُ أَكْبَرُ",
        count: 34,
        meaning: "Allah is the Greatest",
        translit: "Allahu Akbar",
      },
    ],
    title: "The tasbih",
  },
  {
    desc: "A quiet return, one breath at a time.",
    id: "istighfar",
    items: [
      {
        arabic: "أَسْتَغْفِرُ ٱللَّهَ",
        count: 33,
        meaning: "I seek Allah’s forgiveness",
        translit: "Astaghfirullah",
      },
    ],
    title: "Seeking forgiveness",
  },
  {
    desc: "The declaration at the heart of it all.",
    id: "tahlil",
    items: [
      {
        arabic: "لَا إِلَٰهَ إِلَّا ٱللَّهُ",
        count: 33,
        meaning: "There is no god but Allah",
        translit: "La ilaha illallah",
      },
    ],
    title: "La ilaha illallah",
  },
  {
    desc: "For the moments that feel too heavy to carry alone.",
    id: "hawqala",
    items: [
      {
        arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ",
        count: 33,
        meaning: "There is no power nor strength except through Allah",
        translit: "La hawla wa la quwwata illa billah",
      },
    ],
    title: "Strength beyond ourselves",
  },
  {
    desc: "Sending blessings upon the Prophet ﷺ.",
    id: "salawat",
    items: [
      {
        arabic: "ٱللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ",
        count: 10,
        meaning:
          "O Allah, send blessings upon Muhammad and the family of Muhammad",
        translit: "Allahumma salli ‘ala Muhammad wa ‘ala aali Muhammad",
      },
    ],
    title: "Salawat",
  },
  {
    desc: "Light on the tongue, heavy on the scale.",
    id: "two-beloved",
    items: [
      {
        arabic: "سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ",
        count: 33,
        meaning: "Glory be to Allah, and all praise is His",
        translit: "SubhanAllahi wa bihamdihi",
      },
      {
        arabic: "سُبْحَانَ ٱللَّهِ ٱلْعَظِيمِ",
        count: 33,
        meaning: "Glory be to Allah, the Magnificent",
        translit: "SubhanAllahil-‘Azim",
      },
    ],
    title: "The two beloved phrases",
  },
  {
    desc: "The prayer of Yunus, from the belly of the whale (Qur’an 21:87).",
    id: "dua-yunus",
    items: [
      {
        arabic: "لَآ إِلَٰهَ إِلَّآ أَنتَ سُبْحَٰنَكَ إِنِّى كُنتُ مِنَ ٱلظَّٰلِمِينَ",
        count: 33,
        meaning:
          "There is no god but You; glory be to You — truly I have been among the wrongdoers",
        translit: "La ilaha illa anta, subhanaka, inni kuntu minaz-zalimin",
      },
    ],
    title: "The call from the depths",
  },
  {
    desc: "Rest for a worried heart (Qur’an 9:129).",
    id: "hasbiyallah",
    items: [
      {
        arabic: "حَسْبِىَ ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ",
        count: 7,
        meaning:
          "Allah is enough for me; there is no god but Him. In Him I trust — He is the Lord of the Mighty Throne",
        translit:
          "Hasbiyallahu la ilaha illa huwa, ‘alayhi tawakkaltu, wa huwa Rabbul-‘arshil-‘azim",
      },
    ],
    title: "Allah is enough for me",
  },
];

// Calming breath pacing: in for 4, out for 6.
const INHALE_MS = 4000;
const EXHALE_MS = 6000;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Practice({ set, onExit }: { set: DhikrSet; onExit: () => void }) {
  const [itemIndex, setItemIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [finished, setFinished] = useState(false);
  /** Brief acknowledgment shown between dhikrs in a multi-item set. */
  const [interstitial, setInterstitial] = useState<DhikrItem | null>(null);
  const reduced = useRef(prefersReducedMotion());

  const item = set.items[itemIndex];

  // Breath cycle drives the circle; counting stays in the user's hands.
  useEffect(() => {
    if (finished) {
      return;
    }
    const ms = phase === "in" ? INHALE_MS : EXHALE_MS;
    const t = window.setTimeout(
      () => setPhase(phase === "in" ? "out" : "in"),
      ms
    );
    return () => window.clearTimeout(t);
  }, [phase, finished]);

  useEffect(() => {
    track({ setId: set.id, type: "dhikr_start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the screen awake during practice — a tasbih takes minutes and eyes
  // may be closed. Re-acquire when the tab becomes visible again.
  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null;
    async function acquire() {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: {
            request(type: "screen"): Promise<{ release(): Promise<void> }>;
          };
        };
        if (nav.wakeLock) {
          lock = await nav.wakeLock.request("screen");
        }
      } catch {
        /* wake lock is best-effort */
      }
    }
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  function tap() {
    if (finished || interstitial) {
      return;
    }
    if (navigator.vibrate) {
      navigator.vibrate(8);
    }
    const next = count + 1;
    if (next < item.count) {
      setCount(next);
      return;
    }
    setCount(next);
    // item complete
    if (itemIndex + 1 < set.items.length) {
      setInterstitial(item);
      window.setTimeout(() => {
        setInterstitial(null);
        setItemIndex((i) => i + 1);
        setCount(0);
      }, 1100);
    } else {
      setFinished(true);
      track({ setId: set.id, type: "dhikr_complete" });
    }
  }

  if (finished) {
    return (
      <div className="stack" style={{ paddingTop: 40, textAlign: "center" }}>
        <p
          className="arabic"
          lang="ar"
          style={{ fontSize: "1.7rem", textAlign: "center" }}
        >
          تَقَبَّلَ ٱللَّهُ
        </p>
        <h2>Completed</h2>
        <p className="soft" style={{ margin: "0 auto", maxWidth: "38ch" }}>
          May it be accepted. Carry this stillness with you.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 10,
          }}
        >
          <button type="button" className="btn secondary" onClick={onExit}>
            Back to dhikr
          </button>
          <Link to="/" className="btn">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const scale = reduced.current ? 1 : phase === "in" ? 1 : 0.78;
  const duration = phase === "in" ? INHALE_MS : EXHALE_MS;
  // The circle grows and the type eases down for longer formulas — the words
  // must sit comfortably, never squeezed. 310 still fits a 360px-wide phone.
  const len = item.arabic.length;
  const SIZE = len <= 22 ? 270 : len <= 42 ? 295 : 310;
  const arabicSize = len <= 22 ? "1.9rem" : len <= 42 ? "1.55rem" : "1.3rem";
  const arabicLine = len <= 22 ? 1.9 : 1.85;
  // Progress ring geometry (2px padding inside the box).
  const RING_R = SIZE / 2 - 2;
  const circumference = 2 * Math.PI * RING_R;
  const progress = Math.min(count / item.count, 1);

  if (interstitial) {
    return (
      <div style={{ paddingTop: 120, textAlign: "center" }} aria-live="polite">
        <p
          className="arabic"
          lang="ar"
          style={{ fontSize: "1.8rem", textAlign: "center" }}
        >
          {interstitial.arabic}
        </p>
        <p
          style={{
            color: "var(--indigo)",
            fontSize: "1.2rem",
            fontWeight: 600,
            margin: "10px 0 2px",
          }}
        >
          {interstitial.translit} · {interstitial.count} ✓
        </p>
        <p className="muted">and now…</p>
      </div>
    );
  }

  return (
    // The whole screen is the tap target — dhikr is often done with eyes
    // closed, so precision tapping must never be required.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- whole-screen tap target; the exit button is the keyboard path
    <div
      // click (not pointerdown) so a scroll on a small phone never counts.
      onClick={(e) => {
        // Don't count taps on the exit button.
        if ((e.target as HTMLElement).closest("[data-exit]")) {
          return;
        }
        tap();
      }}
      style={{
        WebkitUserSelect: "none",
        cursor: "pointer",
        minHeight: "78vh",
        textAlign: "center",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      <button
        type="button"
        data-exit
        className="btn ghost"
        onClick={onExit}
        style={{ float: "left" }}
      >
        ← Leave quietly
      </button>
      <div style={{ clear: "both", paddingTop: 8 }} />

      <p className="eyebrow">
        {set.title}
        {set.items.length > 1
          ? ` · ${itemIndex + 1} of ${set.items.length}`
          : ""}
      </p>

      <div
        aria-label={`Count one ${item.translit}. ${count} of ${item.count} so far.`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            tap();
          }
        }}
        style={{
          height: SIZE,
          margin: "26px auto 0",
          position: "relative",
          width: SIZE,
        }}
      >
        {/* Progress ring — readable at a glance, no numbers needed mid-flow. */}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          style={{
            inset: 0,
            position: "absolute",
            transform: "rotate(-90deg)",
          }}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RING_R}
            fill="none"
            stroke="var(--line)"
            strokeWidth="3"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RING_R}
            fill="none"
            stroke="var(--kola)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: "stroke-dashoffset .25s ease" }}
          />
        </svg>
        {/* The breathing circle. key={count} restarts the tap pulse. */}
        <div
          key={reduced.current ? undefined : count}
          style={{
            alignItems: "center",
            animation:
              reduced.current || count === 0
                ? "none"
                : "dhikr-tap .3s ease-out",
            background: "var(--indigo-wash)",
            border: "2px solid var(--indigo)",
            borderRadius: "50%",
            display: "flex",
            inset: 14,
            justifyContent: "center",
            padding: 18,
            position: "absolute",
            transform: `scale(${scale})`,
            transition: reduced.current
              ? "none"
              : `transform ${duration}ms ease-in-out`,
          }}
        >
          <span
            className="arabic"
            lang="ar"
            style={{
              display: "block",
              fontSize: arabicSize,
              lineHeight: arabicLine,
              textAlign: "center",
            }}
          >
            {item.arabic}
          </span>
        </div>
      </div>

      {!reduced.current && (
        <p
          className="muted"
          aria-hidden="true"
          style={{ fontStyle: "italic", marginTop: 18 }}
        >
          {phase === "in" ? "breathe in" : "breathe out"}
        </p>
      )}

      <p
        style={{
          fontSize: "1.15rem",
          fontWeight: 500,
          marginBottom: 2,
          marginTop: 8,
        }}
      >
        {item.translit}
      </p>
      <p className="soft" style={{ margin: 0 }}>
        “{item.meaning}”
      </p>

      <p
        aria-live="polite"
        style={{ color: "var(--indigo)", fontWeight: 600, marginTop: 16 }}
      >
        {count} of {item.count}
      </p>
      <p className="muted" style={{ marginTop: 2 }}>
        Tap anywhere with each recitation
      </p>
      <style>{`
        @keyframes dhikr-tap {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--indigo) 35%, transparent); }
          100% { box-shadow: 0 0 0 18px transparent; }
        }
      `}</style>
    </div>
  );
}

export default function Dhikr() {
  const [params, setParams] = useSearchParams();
  const [active, setActive] = useState<DhikrSet | null>(
    () => SETS.find((s) => s.id === params.get("set")) ?? null
  );

  useEffect(() => {
    document.title = "Dhikr | MindfulVerse";
  }, []);

  function open(s: DhikrSet) {
    setActive(s);
    setParams({ set: s.id }, { replace: true });
  }

  function close() {
    setActive(null);
    setParams({}, { replace: true });
  }

  if (active) {
    return <Practice set={active} onExit={close} />;
  }

  return (
    <div className="stack">
      <header>
        <h1>Remembrance, paced to your breath</h1>
        <p className="soft" style={{ marginTop: 0 }}>
          Choose a remembrance. The circle breathes with you; count at your own
          pace.
        </p>
      </header>

      <div>
        {SETS.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => open(s)}
            style={{
              background: "none",
              border: "none",
              borderTop: "1px solid var(--line)",
              color: "var(--ink)",
              cursor: "pointer",
              display: "block",
              font: "inherit",
              padding: "16px 2px",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span
              style={{ display: "block", fontSize: "1.15rem", fontWeight: 500 }}
            >
              {s.title}
            </span>
            <span className="muted" style={{ display: "block", marginTop: 2 }}>
              {s.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
