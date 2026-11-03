// SevenMornings: 9:16, 26 s, 30 fps (780 frames).
//
// Real picks: verseKeyFor(dayIndex, "promo") for dayIndex 65..71 (computed in code below;
// all seven are short enough to read). Weekday names are generic, no dates.
//
// Storyboard (frames)
//  0-225    Header "A new verse every morning." over a dawn sky; day strip Mon..Sun; the card for
//           Mon flips in at 24 (17:30), Tue at 157 (93:11).
//  225-529  Header "Chosen to comfort, read on its own." (dailyVerse.ts curation rule); Wed 225
//           (3:200), Thu 358 (55:10), Fri 436 (11:115).
//  529-636  Header "No repeat for 139 days." (DAILY_VERSES.length, stride walk visits each once
//           per cycle); Sat 529 (112:2), Sun 577 (94:6). Each card: Arabic + English + ref.
//           Time per card scales with word count so every verse can be read.
//  636-780  End card: Mark, "MindfulVerse", "Your verse for today is waiting.",
//           mindfulverse.vercel.app, translation credit (+ nasheed credit in Nasheed version).
//  Sky shifts dawn -> morning across the days (values copied from DayInTheLife's Sky).
import {
  AbsoluteFill,
  Audio,
  interpolate,
  interpolateColors,
  useCurrentFrame,
} from "remotion";

import {
  DAILY_VERSES,
  verseKeyFor,
} from "../../../../packages/core/dailyVerse";
import q3 from "../../../web/public/data/quran/3.json";
import q11 from "../../../web/public/data/quran/11.json";
import q17 from "../../../web/public/data/quran/17.json";
import q55 from "../../../web/public/data/quran/55.json";
import q93 from "../../../web/public/data/quran/93.json";
import q94 from "../../../web/public/data/quran/94.json";
import q112 from "../../../web/public/data/quran/112.json";
import surahs from "../../../web/public/data/surahs.json";
import { C, F } from "../brand";
import {
  Band,
  Credit,
  Fonts,
  Mark,
  NASHEED,
  NASHEED_CREDIT,
  TRANSLATION_CREDIT,
  beat,
  ease,
  prog,
  rise,
} from "../kit";

export const SEVENMORNINGS_DURATION = 780;
export const meta = {
  durationInFrames: SEVENMORNINGS_DURATION,
  height: 1920,
  id: "SevenMornings",
  width: 1080,
};

const SEED = "promo";
const START_DAY = 65;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ALL = [...q11, ...q112, ...q17, ...q3, ...q55, ...q93, ...q94];

interface Pick {
  arabic: string;
  ref: string;
  text: string;
}
const PICKS: Pick[] = DAYS.map((_, i) => {
  const key = verseKeyFor(START_DAY + i, SEED);
  const v = ALL.find((x) => x.verseKey === key);
  if (!v) {
    throw new Error(`verse ${key} not loaded`);
  }
  return {
    arabic: v.arabic.trim(),
    ref: `${surahs.find((s) => s.number === v.surah)?.name ?? ""} ${key}`,
    text: v.translation.trim(),
  };
});

const words = (t: string) => t.split(/\s+/u).length;
const DUR = PICKS.map((p) => 33 + 5 * words(p.text));
const FIRST = 24;
const AT: number[] = [];
let cursor = FIRST;
for (const d of DUR) {
  AT.push(cursor);
  cursor += d;
}
const DAYS_END = AT[6] + DUR[6]; // ~636
const END_AT = DAYS_END + 6;

const BEATS = [
  { from: 0, text: "A new verse every morning.", to: AT[2] + 8 },
  { from: AT[2], text: "Chosen to comfort, read on its own.", to: AT[5] + 8 },
  {
    from: AT[5],
    text: `No repeat for ${DAILY_VERSES.length} days.`,
    to: END_AT,
  },
];

const SKY_AT = [0, DAYS_END];
const SKY_TOP = ["#dfe2f2", "#c7d3f4"];
const SKY_LOW = ["#f6e3d8", C.cotton];

export function SevenMornings({
  withNasheed = false,
}: {
  withNasheed?: boolean;
}) {
  const f = useCurrentFrame();
  const top = interpolateColors(f, SKY_AT, SKY_TOP);
  const low = interpolateColors(f, SKY_AT, SKY_LOW);
  const sunY = interpolate(f, [0, DAYS_END], [620, 190], {
    easing: ease.inOut,
    extrapolateRight: "clamp",
  });
  const stage = 1 - prog(f, DAYS_END - 8, DAYS_END + 8, ease.inOut);
  const day = AT.filter((a) => f >= a + 14).length - 1; // current day index (-1 before the first)

  const vol = (fr: number) =>
    interpolate(
      fr,
      [0, 24, SEVENMORNINGS_DURATION - 60, SEVENMORNINGS_DURATION],
      [0, 0.8, 0.8, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }
    );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(to bottom, ${top}, ${low})`,
        overflow: "hidden",
      }}
    >
      <Fonts />
      {withNasheed ? <Audio src={NASHEED} volume={vol} /> : null}

      <div
        style={{
          background: `radial-gradient(circle, ${interpolateColors(f, [0, DAYS_END], ["#fbd9c1", "#fff6e6"])}cc 0%, transparent 62%)`,
          borderRadius: 400,
          height: 800,
          left: 940 - 400,
          opacity: stage,
          position: "absolute",
          top: sunY - 400,
          width: 800,
        }}
      />
      <Band start={4} top={0} h={36} />

      {/* header beats */}
      <div style={{ opacity: stage, position: "absolute", inset: 0 }}>
        {BEATS.map((b) => (
          <div
            key={b.text}
            style={{
              ...beat(f, b.from, b.to),
              left: 90,
              position: "absolute",
              right: 90,
              top: 130,
            }}
          >
            <div
              style={{
                color: C.indigoDeep,
                fontFamily: F.ui,
                fontSize: 84,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                textWrap: "balance",
              }}
            >
              {b.text}
            </div>
          </div>
        ))}

        {/* day strip */}
        <div
          style={{
            ...rise(f, 8, 16),
            display: "flex",
            gap: 8,
            left: 92,
            position: "absolute",
            top: 400,
          }}
        >
          {DAYS.map((d, i) => {
            const on = i === day;
            const past = i < day;
            const p = on ? prog(f, AT[i] + 14, AT[i] + 28) : 0;
            return (
              <div
                key={d}
                style={{
                  background: on ? C.indigo : past ? C.wash : "transparent",
                  border: `2px solid ${on ? C.indigo : C.line}`,
                  borderRadius: 40,
                  color: on ? C.cotton : past ? C.indigo : C.inkFaint,
                  fontFamily: F.ui,
                  fontSize: 34,
                  fontWeight: 600,
                  height: 80,
                  lineHeight: "76px",
                  textAlign: "center",
                  transform: `scale(${1 + p * 0.05})`,
                  width: 120,
                }}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* stacked cards */}
        <div
          style={{
            height: 1040,
            left: 90,
            perspective: 1800,
            position: "absolute",
            top: 530,
            width: 900,
          }}
        >
          <div
            style={{ ...rise(f, 12, 16), height: "100%", position: "relative" }}
          >
            <Ghost depth={2} />
            <Ghost depth={1} />
            {PICKS.map((p, i) => (
              <VerseCard key={p.ref} f={f} i={i} pick={p} />
            ))}
          </div>
        </div>
        <div
          style={{
            ...rise(f, 30, 16),
            bottom: 0,
            left: 90,
            position: "absolute",
            top: 1620,
          }}
        >
          <Credit>{TRANSLATION_CREDIT}</Credit>
        </div>
      </div>

      {f >= END_AT - 6 ? (
        <EndCard f={f - END_AT} nasheed={withNasheed} />
      ) : null}
    </AbsoluteFill>
  );
}

function Ghost({ depth }: { depth: number }) {
  return (
    <div
      style={{
        background: C.raised,
        border: `2px solid ${C.line}`,
        borderRadius: 40,
        height: "100%",
        left: depth * 14,
        opacity: 0.9 - depth * 0.2,
        position: "absolute",
        right: depth * 14,
        top: depth * 18,
      }}
    />
  );
}

function VerseCard({ f, i, pick }: { f: number; i: number; pick: Pick }) {
  const at = AT[i];
  const inP = prog(f, at + 8, at + 30);
  const outAt = i < 6 ? AT[i + 1] : DAYS_END;
  const outP = prog(f, outAt - 2, outAt + 10, ease.inOut);
  if (f < at - 1 || f > outAt + 12) {
    return null;
  }
  const rotIn = (1 - inP) * -78;
  const rotOut = outP * 74;
  return (
    <div
      style={{
        background: C.raised,
        border: `2px solid ${C.line}`,
        borderRadius: 40,
        boxShadow: "0 30px 70px rgba(27,37,89,0.12)",
        height: "100%",
        left: 0,
        opacity: Math.min(1, Math.max(0, (inP - 0.25) * 2)) * (1 - outP),
        position: "absolute",
        right: 0,
        top: 0,
        transform: `rotateX(${rotIn + rotOut}deg) translateY(${outP * -30}px)`,
        transformOrigin: "50% 0%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "0 48px",
        }}
      >
        <div
          style={{
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "0.12em",
            marginBottom: 36,
            textTransform: "uppercase",
          }}
        >
          {DAYS[i]}
        </div>
        <div
          style={{
            color: C.indigoDeep,
            direction: "rtl",
            fontFamily: F.arabic,
            fontSize: 68,
            lineHeight: 2,
            textAlign: "center",
          }}
        >
          {pick.arabic}
        </div>
        <div
          style={{ background: C.line, height: 2, margin: "36px 0", width: 90 }}
        />
        <div
          style={{
            color: C.ink,
            fontFamily: F.text,
            fontSize: 48,
            lineHeight: 1.42,
            textAlign: "center",
          }}
        >
          {pick.text}
        </div>
        <div
          style={{
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 34,
            fontWeight: 500,
            marginTop: 40,
          }}
        >
          {pick.ref}
        </div>
      </div>
    </div>
  );
}

function EndCard({ f, nasheed }: { f: number; nasheed: boolean }) {
  const g = Math.max(0, f);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: prog(g, 0, 10) }}>
        <Mark frame={g} size={230} />
      </div>
      <div
        style={{
          ...rise(g, 22),
          color: C.indigoDeep,
          fontFamily: F.ui,
          fontSize: 104,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          marginTop: 44,
        }}
      >
        MindfulVerse
      </div>
      <div
        style={{
          ...rise(g, 34),
          color: C.inkSoft,
          fontFamily: F.text,
          fontSize: 48,
          marginTop: 20,
        }}
      >
        Your verse for today is waiting.
      </div>
      <div
        style={{
          ...rise(g, 48),
          color: C.indigo,
          fontFamily: F.ui,
          fontSize: 44,
          fontWeight: 500,
          marginTop: 40,
        }}
      >
        mindfulverse.vercel.app
      </div>
      <div
        style={{
          ...rise(g, 62),
          bottom: 110,
          left: 0,
          position: "absolute",
          right: 0,
          textAlign: "center",
        }}
      >
        <Credit>{TRANSLATION_CREDIT}</Credit>
        {nasheed ? (
          <Credit style={{ marginTop: 8 }}>{NASHEED_CREDIT}</Credit>
        ) : null}
      </div>
      <Band start={0} top={1884} h={36} />
    </AbsoluteFill>
  );
}
