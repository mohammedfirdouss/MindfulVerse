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

  function tap() {
    if (finished) return;
    if (navigator.vibrate) navigator.vibrate(8);
    const next = count + 1;
    if (next < item.count) {
      setCount(next);
      return;
    }
    // item complete
    if (itemIndex + 1 < set.items.length) {
      setItemIndex(itemIndex + 1);
      setCount(0);
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

  return (
    <div style={{ textAlign: "center" }}>
      <button className="btn ghost" onClick={onExit} style={{ float: "left" }}>
        ← Leave quietly
      </button>
      <div style={{ clear: "both", paddingTop: 8 }} />

      <p className="label">{set.title}</p>

      <button
        onClick={tap}
        aria-label={`Count one ${item.translit}. ${count} of ${item.count} so far.`}
        style={{
          display: "block",
          margin: "26px auto 0",
          width: 270,
          height: 270,
          borderRadius: "50%",
          border: "2px solid var(--indigo)",
          background: "var(--indigo-wash)",
          cursor: "pointer",
          transform: `scale(${scale})`,
          transition: reduced.current ? "none" : `transform ${duration}ms ease-in-out`,
          padding: 20,
        }}
      >
        <span
          className="arabic"
          lang="ar"
          style={{ display: "block", textAlign: "center", fontSize: "1.9rem", lineHeight: 1.9 }}
        >
          {item.arabic}
        </span>
      </button>

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
        Tap the circle with each recitation
      </p>
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
