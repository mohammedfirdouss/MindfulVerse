// "Day seven": 9:16, 22 s. A week of returning, shown the way Home shows it.
// Home.tsx: when streak >= 2, "Day {streak} of returning to the Qur’an" with 7 diamond
// beads (home.css: 9px, line-strong; filled for i < min(streak, 7)). Drawn 8x here.
// The app's streak (progress.ts currentStreak) counts consecutive visit days; a missed
// day breaks the chain, so there is no "no streak to lose" claim: the closing line is
// the invitation "Come back tomorrow."
// Storyboard (30 fps, 660 frames; one day = 66 frames, sky tint cycles each day)
//   0-40    seven empty beads draw in; first bead fills at 14 (Home shows no line at day 1)
//   40-304  Day 2 at 40, then +66 each: Day 3 106 ... Day 7 304; a bead fills with each
//   304-410 seventh bead fills with a soft glow; hold
//   405-520 "Come back tomorrow."
//   515-660 End card: Mark, MindfulVerse, "A verse every day.", URL (+ music credit)
import {
  AbsoluteFill,
  Audio,
  interpolate,
  interpolateColors,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { C, F, clothTile } from "../brand";
import {
  beat,
  Credit,
  ease,
  Fonts,
  Mark,
  NASHEED,
  NASHEED_CREDIT,
  prog,
  rise,
} from "../kit";

export const DAYSEVEN_DURATION = 660;
export const meta = {
  durationInFrames: DAYSEVEN_DURATION,
  height: 1920,
  id: "DaySeven",
  width: 1080,
};

const DAY = 66;
const FIRST = 40; // "Day 2" appears
const dayStart = (d: number) => FIRST + (d - 2) * DAY;
const END = 515;
const CALM = [405, 520] as const;

const BEAD = 88;
const GAP = 36;
const diamond = "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)";

const centre = {
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  inset: 0,
  justifyContent: "center",
  padding: "0 80px",
  position: "absolute",
  textAlign: "center",
} as const;

// subtle sky: one slow swell per day between palette tints
function sky(f: number) {
  const t = ((f - 14) / DAY) % 1;
  const k = f < 14 ? 0 : t < 0.5 ? t * 2 : (1 - t) * 2;
  const e = ease.inOut(k);
  return interpolateColors(e, [0, 1], [C.cotton, C.wash]);
}

function Bead({ f, i }: { f: number; i: number }) {
  // bead i fills when its day arrives (day i+1)
  const at = i === 0 ? 14 : dayStart(i + 1) + 6;
  const on = prog(f, at, at + 14);
  const draw = prog(f, i * 4, i * 4 + 16);
  const last = i === 6;
  const glow = last
    ? prog(f, at, at + 40) * (0.75 + 0.25 * Math.sin(f / 9))
    : 0;
  return (
    <div
      style={{
        height: BEAD,
        opacity: draw,
        position: "relative",
        transform: `scale(${0.7 + 0.3 * draw})`,
        width: BEAD,
      }}
    >
      {last && (
        <div
          style={{
            background: C.indigo,
            clipPath: diamond,
            filter: "blur(30px)",
            inset: -40,
            opacity: glow * 0.55,
            position: "absolute",
            transform: `scale(${1 + glow * 0.5})`,
          }}
        />
      )}
      <div
        style={{
          background: C.line,
          clipPath: diamond,
          inset: 0,
          position: "absolute",
        }}
      />
      <div
        style={{
          background: C.indigo,
          clipPath: diamond,
          inset: 0,
          opacity: on,
          position: "absolute",
          transform: `scale(${0.5 + 0.5 * on + (last ? glow * 0.12 : 0)})`,
        }}
      />
    </div>
  );
}

export function DaySeven({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drift = f * 0.22;
  const day = f < FIRST ? 1 : Math.min(7, 2 + Math.floor((f - FIRST) / DAY));
  const numStart = day < 2 ? 0 : dayStart(day);
  return (
    <AbsoluteFill style={{ background: sky(f), height, width }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(x) =>
            interpolate(
              x,
              [0, 24, DAYSEVEN_DURATION - 60, DAYSEVEN_DURATION],
              [0, 0.8, 0.8, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          }
        />
      ) : null}
      <div
        style={{
          backgroundImage: clothTile(C.indigo, 1, 132),
          backgroundPosition: `${drift}px ${drift * 0.6}px`,
          inset: 0,
          opacity: 0.05,
          position: "absolute",
        }}
      />

      {f < CALM[0] + 10 && (
        <div style={{ ...centre, gap: 90, ...beat(f, 0, CALM[0]) }}>
          <div style={{ display: "flex", gap: GAP }}>
            {Array.from({ length: 7 }, (_, i) => (
              <Bead key={i} f={f} i={i} />
            ))}
          </div>
          <div
            style={{
              color: C.inkSoft,
              fontFamily: F.text,
              fontSize: 88,
              lineHeight: 1.3,
              minHeight: 200,
              textWrap: "balance",
              opacity: f < FIRST - 6 ? 0 : 1,
            }}
          >
            <span style={{ color: C.indigoDeep }}>Day </span>
            <span
              style={{
                color: C.indigo,
                display: "inline-block",
                fontFamily: F.ui,
                fontWeight: 600,
                ...(day >= 2 ? rise(f, numStart, 14, 18) : {}),
              }}
            >
              {day}
            </span>{" "}
            of returning to the Qur’an
          </div>
        </div>
      )}

      {f >= CALM[0] && f < END + 20 && (
        <div style={{ ...centre, ...beat(f, CALM[0], CALM[1]) }}>
          <div
            style={{
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 130,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              textWrap: "balance",
            }}
          >
            Come back tomorrow.
          </div>
        </div>
      )}

      {f >= END && (
        <div style={{ ...centre, gap: 40 }}>
          <Mark frame={f - END} size={220} />
          <div
            style={{
              ...rise(f, END + 18),
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 110,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            MindfulVerse
          </div>
          <div
            style={{
              ...rise(f, END + 28),
              color: C.inkSoft,
              fontFamily: F.text,
              fontSize: 56,
            }}
          >
            A verse every day.
          </div>
          <div
            style={{
              ...rise(f, END + 40),
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 48,
              fontWeight: 600,
            }}
          >
            mindfulverse.vercel.app
          </div>
          {withNasheed ? (
            <Credit
              style={{
                ...rise(f, END + 52, 14, 10),
                bottom: 120,
                left: 0,
                position: "absolute",
                right: 0,
                textAlign: "center",
              }}
            >
              {NASHEED_CREDIT}
            </Credit>
          ) : null}
        </div>
      )}
    </AbsoluteFill>
  );
}
