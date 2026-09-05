import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { track } from "../lib/analytics";

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
    id: "tasbih",
    title: "The tasbih",
    desc: "Glorify, praise, and magnify — the remembrance taught after every prayer.",
    items: [
      { arabic: "سُبْحَانَ ٱللَّهِ", translit: "SubhanAllah", meaning: "Glory be to Allah", count: 33 },
      { arabic: "ٱلْحَمْدُ لِلَّهِ", translit: "Alhamdulillah", meaning: "All praise is for Allah", count: 33 },
      { arabic: "ٱللَّهُ أَكْبَرُ", translit: "Allahu Akbar", meaning: "Allah is the Greatest", count: 34 },
    ],
  },
  {
    id: "istighfar",
    title: "Seeking forgiveness",
    desc: "A quiet return, one breath at a time.",
    items: [
      { arabic: "أَسْتَغْفِرُ ٱللَّهَ", translit: "Astaghfirullah", meaning: "I seek Allah’s forgiveness", count: 33 },
    ],
  },
  {
    id: "tahlil",
    title: "La ilaha illallah",
    desc: "The declaration at the heart of it all.",
    items: [
      { arabic: "لَا إِلَٰهَ إِلَّا ٱللَّهُ", translit: "La ilaha illallah", meaning: "There is no god but Allah", count: 33 },
    ],
  },
  {
    id: "hawqala",
    title: "Strength beyond ourselves",
    desc: "For the moments that feel too heavy to carry alone.",
    items: [
      {
        arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ",
        translit: "La hawla wa la quwwata illa billah",
        meaning: "There is no power nor strength except through Allah",
        count: 33,
      },
    ],
  },
  {
    id: "salawat",
    title: "Salawat",
    desc: "Sending blessings upon the Prophet ﷺ.",
    items: [
      {
        arabic: "ٱللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ",
        translit: "Allahumma salli ‘ala Muhammad wa ‘ala aali Muhammad",
        meaning: "O Allah, send blessings upon Muhammad and the family of Muhammad",
        count: 10,
      },
    ],
  },
  {
    id: "two-beloved",
    title: "The two beloved phrases",
    desc: "Light on the tongue, heavy on the scale.",
    items: [
      {
        arabic: "سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ",
        translit: "SubhanAllahi wa bihamdihi",
        meaning: "Glory be to Allah, and all praise is His",
        count: 33,
      },
      {
        arabic: "سُبْحَانَ ٱللَّهِ ٱلْعَظِيمِ",
        translit: "SubhanAllahil-‘Azim",
        meaning: "Glory be to Allah, the Magnificent",
        count: 33,
      },
    ],
  },
  {
    id: "dua-yunus",
    title: "The call from the depths",
    desc: "The prayer of Yunus, from the belly of the whale (Qur’an 21:87).",
    items: [
      {
        arabic: "لَآ إِلَٰهَ إِلَّآ أَنتَ سُبْحَٰنَكَ إِنِّى كُنتُ مِنَ ٱلظَّٰلِمِينَ",
        translit: "La ilaha illa anta, subhanaka, inni kuntu minaz-zalimin",
        meaning: "There is no god but You; glory be to You — truly I have been among the wrongdoers",
        count: 33,
      },
    ],
  },
  {
    id: "hasbiyallah",
    title: "Allah is enough for me",
    desc: "Rest for a worried heart (Qur’an 9:129).",
    items: [
      {
        arabic: "حَسْبِىَ ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ",
        translit: "Hasbiyallahu la ilaha illa huwa, ‘alayhi tawakkaltu, wa huwa Rabbul-‘arshil-‘azim",
        meaning: "Allah is enough for me; there is no god but Him. In Him I trust — He is the Lord of the Mighty Throne",
        count: 7,
      },
    ],
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
    if (finished) return;
    const ms = phase === "in" ? INHALE_MS : EXHALE_MS;
    const t = window.setTimeout(() => setPhase(phase === "in" ? "out" : "in"), ms);
    return () => window.clearTimeout(t);
  }, [phase, finished]);

  useEffect(() => {
    track({ type: "dhikr_start", setId: set.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the screen awake during practice — a tasbih takes minutes and eyes
  // may be closed. Re-acquire when the tab becomes visible again.
  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null;
    async function acquire() {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> };
        };
        if (nav.wakeLock) lock = await nav.wakeLock.request("screen");
      } catch {
        /* wake lock is best-effort */
      }
    }
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  function tap() {
    if (finished || interstitial) return;
    if (navigator.vibrate) navigator.vibrate(8);
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
      track({ type: "dhikr_complete", setId: set.id });
    }
  }

  if (finished) {
    return (
      <div className="stack" style={{ textAlign: "center", paddingTop: 40 }}>
        <p className="arabic" lang="ar" style={{ textAlign: "center", fontSize: "1.7rem" }}>
          تَقَبَّلَ ٱللَّهُ
        </p>
        <h2>Completed</h2>
        <p className="soft" style={{ maxWidth: "38ch", margin: "0 auto" }}>
          May it be accepted. Carry this stillness with you.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}>
          <button className="btn secondary" onClick={onExit}>
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
  // Progress ring geometry (r=133 inside a 270 viewBox with 2px padding).
  const RING_R = 133;
  const circumference = 2 * Math.PI * RING_R;
  const progress = Math.min(count / item.count, 1);

  if (interstitial) {
    return (
      <div style={{ textAlign: "center", paddingTop: 120 }} aria-live="polite">
        <p className="arabic" lang="ar" style={{ textAlign: "center", fontSize: "1.8rem" }}>
          {interstitial.arabic}
        </p>
        <p style={{ fontWeight: 600, color: "var(--indigo)", fontSize: "1.2rem", margin: "10px 0 2px" }}>
          {interstitial.translit} · {interstitial.count} ✓
        </p>
        <p className="muted">and now…</p>
      </div>
    );
  }

  return (
    // The whole screen is the tap target — dhikr is often done with eyes
    // closed, so precision tapping must never be required.
    <div
      onPointerDown={(e) => {
        // Don't count taps on the exit button.
        if ((e.target as HTMLElement).closest("[data-exit]")) return;
        tap();
      }}
      style={{
        textAlign: "center",
        minHeight: "78vh",
        cursor: "pointer",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <button data-exit className="btn ghost" onClick={onExit} style={{ float: "left" }}>
        ← Leave quietly
      </button>
      <div style={{ clear: "both", paddingTop: 8 }} />

      <p className="label">
        {set.title}
        {set.items.length > 1 ? ` · ${itemIndex + 1} of ${set.items.length}` : ""}
      </p>

      <div
        aria-label={`Count one ${item.translit}. ${count} of ${item.count} so far.`}
        role="button"
        style={{
          position: "relative",
          width: 270,
          height: 270,
          margin: "26px auto 0",
        }}
      >
        {/* Progress ring — readable at a glance, no numbers needed mid-flow. */}
        <svg
          viewBox="0 0 270 270"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
        >
          <circle cx="135" cy="135" r={RING_R} fill="none" stroke="var(--line)" strokeWidth="3" />
          <circle
            cx="135"
            cy="135"
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
            position: "absolute",
            inset: 14,
            borderRadius: "50%",
            border: "2px solid var(--indigo)",
            background: "var(--indigo-wash)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${scale})`,
            transition: reduced.current ? "none" : `transform ${duration}ms ease-in-out`,
            animation: reduced.current || count === 0 ? "none" : "dhikr-tap .3s ease-out",
            padding: 18,
          }}
        >
          <span
            className="arabic"
            lang="ar"
            style={{ display: "block", textAlign: "center", fontSize: "1.9rem", lineHeight: 1.9 }}
          >
            {item.arabic}
          </span>
        </div>
      </div>

      {!reduced.current && (
        <p className="muted" aria-hidden="true" style={{ marginTop: 18, fontStyle: "italic" }}>
          {phase === "in" ? "breathe in" : "breathe out"}
        </p>
      )}

      <p style={{ marginTop: 8, marginBottom: 2, fontWeight: 500, fontSize: "1.15rem" }}>
        {item.translit}
      </p>
      <p className="soft" style={{ margin: 0 }}>
        “{item.meaning}”
      </p>

      <p aria-live="polite" style={{ marginTop: 16, color: "var(--indigo)", fontWeight: 600 }}>
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
    document.title = "Dhikr — MindfulVerse";
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
      <header style={{ paddingTop: 12 }}>
        <p className="label">Dhikr &amp; breath</p>
        <h1 style={{ margin: "6px 0" }}>Remembrance, paced to your breath</h1>
        <p className="soft" style={{ marginTop: 0 }}>
          Choose a remembrance. The circle breathes with you; count at your own pace.
        </p>
      </header>

      <div>
        {SETS.map((s) => (
          <button
            key={s.id}
            onClick={() => open(s)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              borderTop: "1px solid var(--line)",
              padding: "16px 2px",
              cursor: "pointer",
              font: "inherit",
              color: "var(--ink)",
            }}
          >
            <span style={{ display: "block", fontWeight: 500, fontSize: "1.15rem" }}>
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
