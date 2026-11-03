/*
 * Breathe — 9:16, 40 s, silent + nasheed. A guided breath you can follow.
 * Source copy: apps/web/src/pages/Dhikr.tsx (set "istighfar", pacing 4 s in / 6 s out),
 * apps/web/src/pages/Home.tsx (entry title + desc).
 *
 * STORYBOARD (30 fps)
 *  0.3–3.8 s   Title: "A quiet return, one breath at a time." (set.desc), band draws in.
 *  3.0 s       Eyebrow "Seeking forgiveness" + the breathing ring rise in at rest size.
 *  3.5–33.5 s  Three breaths, each: in 4 s (ring grows, "Breathe in"), out 6 s (ring shrinks,
 *              "Breathe out", Arabic + transliteration + meaning appear, counter "n of 33").
 *              Sine ease-in-out throughout.
 *  33.0–40 s   End card: Mark, "Dhikr & breath", "Remembrance, paced to your breath.", URL
 *              (+ nasheed credit in the nasheed version).
 */
import { Audio, AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { C, F, clothTile } from "../brand";
import {
  Band,
  Fonts,
  Mark,
  NASHEED,
  NASHEED_CREDIT,
  Credit,
  Headline,
  beat,
  prog,
  rise,
  sec,
} from "../kit";

export const BREATHE_DURATION = sec(40);
export const meta = {
  durationInFrames: BREATHE_DURATION,
  height: 1920,
  id: "Breathe",
  width: 1080,
};

const SET_TITLE = "Seeking forgiveness";
const SET_DESC = "A quiet return, one breath at a time.";
const ARABIC = "أَسْتَغْفِرُ ٱللَّهَ";
const TRANSLIT = "Astaghfirullah";
const MEANING = "I seek Allah’s forgiveness";
const TOTAL = 33;
const HOME_TITLE = "Dhikr & breath";
const HOME_DESC = "Remembrance, paced to your breath.";
const URL = "mindfulverse.vercel.app";

const START = sec(3.5);
const IN = sec(4);
const OUT = sec(6);
const CYCLE = IN + OUT;
const BREATHS = 3;
const REST = 0.78;
const MAX = 780;

/** Sine ease-in-out, 0→1. */
const sine = (p: number) =>
  0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));

function breath(frame: number) {
  const t = frame - START;
  if (t < 0 || t >= CYCLE * BREATHS) {
    return { count: 0, inhaling: true, phaseP: 0, scale: REST, tOut: -1 };
  }
  const k = Math.floor(t / CYCLE);
  const r = t - k * CYCLE;
  if (r < IN) {
    const p = r / IN;
    return {
      count: k,
      inhaling: true,
      phaseP: p,
      scale: REST + (1 - REST) * sine(p),
      tOut: -1,
    };
  }
  const p = (r - IN) / OUT;
  return {
    count: k + 1,
    inhaling: false,
    phaseP: p,
    scale: 1 - (1 - REST) * sine(p),
    tOut: p,
  };
}

export function Breathe({ withNasheed = false }: { withNasheed?: boolean }) {
  const f = useCurrentFrame();
  const b = breath(f);
  const body = prog(f, sec(3.6), sec(4.4)) * (1 - prog(f, sec(33), sec(34)));
  const endIn = prog(f, sec(34), sec(35));
  const phrase =
    b.tOut < 0 ? 0 : Math.min(b.tOut / 0.12, (1 - b.tOut) / 0.12, 1);
  const size = MAX;
  const ringR = size / 2 - 3;
  const circ = 2 * Math.PI * ringR;
  // The progress ring advances as the count does (n of 33, as in the app).
  const shownCount = b.count;
  const arc = Math.max(0, Math.min(1, shownCount / TOTAL));

  const labelIn = b.inhaling;
  const labelP =
    b.tOut < 0 && f >= START + CYCLE * BREATHS
      ? 0
      : Math.min(b.phaseP / 0.1, 1);
  const labelOut = Math.min((1 - b.phaseP) / 0.1, 1);
  const labelOpacity = f < START ? 0 : Math.min(labelP, labelOut) * body;

  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {withNasheed && (
        <Audio
          src={NASHEED}
          volume={(fr) =>
            interpolate(
              fr,
              [0, 24, BREATHE_DURATION - 60, BREATHE_DURATION],
              [0, 0.8, 0.8, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            )
          }
        />
      )}
      <AbsoluteFill
        style={{
          backgroundImage: clothTile(C.indigo, 0.06, 120),
          opacity: 0.9,
        }}
      />
      <Band start={4} top={0} h={44} />
      <Band start={4} top={1920 - 44} h={44} />

      {/* Title */}
      <div
        style={{
          left: 90,
          position: "absolute",
          right: 90,
          textAlign: "center",
          top: 690,
          ...beat(f, sec(0.3), sec(3.7)),
        }}
      >
        <Headline size={96} style={{ fontWeight: 500 }}>
          {SET_DESC}
        </Headline>
      </div>

      {/* Breathing ring */}
      <div style={{ opacity: body }}>
        <div
          style={{
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 38,
            fontWeight: 500,
            left: 0,
            letterSpacing: "0.14em",
            position: "absolute",
            right: 0,
            textAlign: "center",
            textTransform: "uppercase",
            top: 250,
          }}
        >
          {SET_TITLE}
        </div>
        <div
          style={{
            height: size,
            left: (1080 - size) / 2,
            position: "absolute",
            top: 400,
            width: size,
          }}
        >
          <svg
            viewBox={`0 0 ${size} ${size}`}
            style={{
              inset: 0,
              position: "absolute",
              transform: "rotate(-90deg)",
            }}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={ringR}
              stroke={C.line}
              strokeWidth={6}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={ringR}
              stroke={C.indigo}
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - arc)}
              strokeLinecap="round"
              strokeWidth={6}
            />
          </svg>
          <div
            style={{
              alignItems: "center",
              background: C.wash,
              border: `5px solid ${C.indigo}`,
              borderRadius: "50%",
              display: "flex",
              inset: 36,
              justifyContent: "center",
              position: "absolute",
              transform: `scale(${b.scale})`,
            }}
          >
            <span
              lang="ar"
              style={{
                color: C.ink,
                direction: "rtl",
                fontFamily: F.arabic,
                fontSize: 148,
                lineHeight: 2,
                opacity: phrase,
                textAlign: "center",
              }}
            >
              {ARABIC}
            </span>
          </div>
        </div>

        <div
          style={{
            color: C.inkSoft,
            fontFamily: F.ui,
            fontSize: 72,
            fontStyle: "italic",
            fontWeight: 500,
            left: 0,
            opacity: labelOpacity,
            position: "absolute",
            right: 0,
            textAlign: "center",
            top: 1260,
          }}
        >
          {labelIn ? "Breathe in" : "Breathe out"}
        </div>

        <div
          style={{
            left: 60,
            opacity: phrase,
            position: "absolute",
            right: 60,
            textAlign: "center",
            top: 1410,
          }}
        >
          <div
            style={{
              color: C.ink,
              fontFamily: F.ui,
              fontSize: 64,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {TRANSLIT}
          </div>
          <div
            style={{
              color: C.inkSoft,
              fontFamily: F.text,
              fontSize: 44,
              marginTop: 10,
            }}
          >
            “{MEANING}”
          </div>
          <div
            style={{
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 46,
              fontWeight: 600,
              marginTop: 34,
            }}
          >
            {Math.max(1, shownCount)} of {TOTAL}
          </div>
        </div>
      </div>

      {/* End card */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: endIn,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 40,
            textAlign: "center",
          }}
        >
          <Mark frame={Math.max(0, f - sec(34))} size={230} />
          <Headline size={104}>{HOME_TITLE}</Headline>
          <div
            style={{
              color: C.inkSoft,
              fontFamily: F.text,
              fontSize: 48,
              lineHeight: 1.4,
              maxWidth: 800,
              textWrap: "balance",
            }}
          >
            {HOME_DESC}
          </div>
          <div
            style={{
              ...rise(f, sec(35.2)),
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 50,
              fontWeight: 600,
            }}
          >
            {URL}
          </div>
        </div>
        {withNasheed && (
          <Credit
            style={{
              bottom: 100,
              left: 0,
              position: "absolute",
              right: 0,
              textAlign: "center",
            }}
          >
            {NASHEED_CREDIT}
          </Credit>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
