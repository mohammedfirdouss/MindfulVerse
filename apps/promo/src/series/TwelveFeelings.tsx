// TwelveFeelings: 9:16, 30 s, 30 fps (900 frames).
//
// Storyboard (frames)
//  0-105   "How is your heart today?" (CheckIn.tsx h1, verbatim) on cotton, adire band draws in.
//  100-244 First three feelings, 48 f each (1.6 s), centred and large: label, then its
//          neutral framing resolves beneath ("Anxious" -> "Verses on ease").
//  236-400 The 12 feelings settle into a 2x6 grid (label + framing); the first three land at
//          once, the rest accelerate (27 f gap down to 8 f). Cloth tile faint behind.
//  400-480 Hold the grid, small "How is your heart today?" above.
//  480-540 "Grateful" is chosen: the others fade, then it rises large at the top.
//  540-750 2:152 Arabic + English verbatim, "Al-Baqarah 2:152", translation credit.
//  750-900 End card: Mark, MindfulVerse, "A verse for how you feel.", mindfulverse.vercel.app
//          (nasheed credit only in the Nasheed composition).
import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";

import emotions from "../../../web/public/data/emotions.json";
import quran2 from "../../../web/public/data/quran/2.json";
import surahs from "../../../web/public/data/surahs.json";
import { C, F, clothTile } from "../brand";
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

export const TWELVEFEELINGS_DURATION = 900;
export const meta = {
  durationInFrames: TWELVEFEELINGS_DURATION,
  height: 1920,
  id: "TwelveFeelings",
  width: 1080,
};

const QUESTION = "How is your heart today?"; // apps/web/src/pages/CheckIn.tsx
const CHOSEN = "grateful";
const VERSE_KEY = "2:152"; // in emotions.json grateful.verseKeys
const verse = quran2.find((v) => v.verseKey === VERSE_KEY) ?? quran2[0];
const surahName = surahs.find((s) => s.number === verse.surah)?.name ?? "";

// Entry frame of each feeling in the grid / focus phase.
const FOCUS_AT = [100, 148, 196];
const GRID_AT = [236, 242, 248, 262, 289, 310, 327, 341, 353, 364, 373, 381];
const GRID_X = [80, 570];
const GRID_Y0 = 340;
const PITCH = 250;

export function TwelveFeelings({
  withNasheed = false,
}: {
  withNasheed?: boolean;
}) {
  const f = useCurrentFrame();
  const gridOn = prog(f, 232, 262) * (1 - prog(f, 478, 520, ease.inOut));
  const end = f >= 750;
  const chosenIdx = emotions.findIndex((e) => e.id === CHOSEN);
  const chosen = emotions[chosenIdx] ?? emotions[0];

  const audioVol = (fr: number) =>
    interpolate(
      fr,
      [0, 24, TWELVEFEELINGS_DURATION - 60, TWELVEFEELINGS_DURATION],
      [0, 0.8, 0.8, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }
    );

  return (
    <AbsoluteFill style={{ background: C.cotton, overflow: "hidden" }}>
      <Fonts />
      {withNasheed ? <Audio src={NASHEED} volume={audioVol} /> : null}

      {/* faint cloth behind the cascade */}
      <AbsoluteFill
        style={{
          backgroundImage: clothTile(C.indigo, 0.5, 120),
          backgroundPosition: `0 ${-f * 0.25}px`,
          opacity:
            gridOn * 0.1 + prog(f, 540, 580) * (1 - prog(f, 740, 770)) * 0.06,
        }}
      />
      <Band start={4} top={0} h={36} />

      {/* opening question */}
      <div
        style={{
          ...beat(f, 14, 112),
          left: 80,
          position: "absolute",
          right: 80,
          top: 760,
        }}
      >
        <div
          style={{
            color: C.indigoDeep,
            fontFamily: F.ui,
            fontSize: 118,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            textWrap: "balance",
          }}
        >
          {QUESTION}
        </div>
      </div>

      {/* first three, large and slow */}
      {FOCUS_AT.map((at, i) => {
        const e = emotions[i];
        const out = at + 48 + (i === 2 ? 4 : 0);
        const lab = beat(f, at, out);
        const resolve = prog(f, at + 18, at + 34);
        if (f < at - 2 || f > out + 2) {
          return null;
        }
        return (
          <div
            key={e.id}
            style={{
              left: 80,
              position: "absolute",
              right: 80,
              textAlign: "center",
              top: 700,
            }}
          >
            <div
              style={{
                ...lab,
                color: C.indigo,
                fontFamily: F.ui,
                fontSize: 188,
                fontWeight: 600,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                transform: `${lab.transform} scale(${1 - resolve * 0.08})`,
              }}
            >
              {e.label}
            </div>
            <div
              style={{
                color: C.inkSoft,
                fontFamily: F.text,
                fontSize: 54,
                lineHeight: 1.3,
                marginTop: 36,
                opacity: resolve * (lab.opacity as number),
                transform: `translateY(${(1 - resolve) * 18}px)`,
              }}
            >
              {e.framing}
            </div>
          </div>
        );
      })}

      {/* grid */}
      <div style={{ opacity: gridOn, position: "absolute", inset: 0 }}>
        <div
          style={{
            ...rise(f, 240, 16),
            color: C.inkFaint,
            fontFamily: F.ui,
            fontSize: 44,
            fontWeight: 500,
            left: 80,
            position: "absolute",
            top: 190,
          }}
        >
          {QUESTION}
        </div>
        {emotions.map((e, i) => {
          const isChosen = i === chosenIdx;
          const at = GRID_AT[i];
          const x = GRID_X[i % 2];
          const y = GRID_Y0 + Math.floor(i / 2) * PITCH;
          const inP = prog(f, at, at + 16);
          const dim = isChosen
            ? 0
            : prog(f, 482 + i * 2, 504 + i * 2, ease.inOut);
          const pulse = isChosen ? prog(f, 486, 506) : 0;
          const travel = isChosen ? prog(f, 490, 520, ease.inOut) : 0;
          return (
            <div
              key={e.id}
              style={{
                filter: `blur(${(1 - inP) * 5 + dim * 6}px)`,
                left: x,
                opacity: inP * (1 - dim),
                position: "absolute",
                top: y,
                transform: `translate(${travel * -150}px, ${travel * -20}px) translateY(${(1 - inP) * 24}px) scale(${1 + pulse * 0.05 + travel * 0.8})`,
                transformOrigin: "0 50%",
                width: 450,
              }}
            >
              <div
                style={{
                  color: pulse > 0 ? C.indigo : C.indigoDeep,
                  fontFamily: F.ui,
                  fontSize: 58,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                }}
              >
                {e.label}
              </div>
              <div
                style={{
                  color: C.inkSoft,
                  fontFamily: F.text,
                  fontSize: 31,
                  lineHeight: 1.3,
                  marginTop: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {e.framing}
              </div>
              <div
                style={{
                  background: C.line,
                  height: 2,
                  marginTop: 26,
                  opacity: 0.8,
                  width: 60,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* chosen + verse */}
      {f >= 516 && f < 758 ? (
        <div
          style={{
            ...beat(f, 518, 752),
            left: 80,
            position: "absolute",
            right: 80,
            textAlign: "center",
            top: 330,
          }}
        >
          <div
            style={{
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 120,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {chosen.label}
          </div>
          <div
            style={{
              color: C.inkSoft,
              fontFamily: F.text,
              fontSize: 42,
              marginTop: 20,
            }}
          >
            {chosen.framing}
          </div>
        </div>
      ) : null}
      {f >= 540 && f < 758 ? (
        <div
          style={{
            left: 90,
            position: "absolute",
            right: 90,
            textAlign: "center",
            top: 720,
          }}
        >
          <div style={rise(f, 548, 18)}>
            <div
              style={{
                color: C.indigoDeep,
                direction: "rtl",
                fontFamily: F.arabic,
                fontSize: 88,
                lineHeight: 2.1,
              }}
            >
              {verse.arabic}
            </div>
          </div>
          <div
            style={{
              ...rise(f, 596, 18),
              color: C.ink,
              fontFamily: F.text,
              fontSize: 52,
              lineHeight: 1.45,
              marginTop: 56,
            }}
          >
            {verse.translation}
          </div>
          <div
            style={{
              ...rise(f, 628, 16),
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 36,
              fontWeight: 500,
              marginTop: 44,
            }}
          >
            {surahName} {verse.verseKey}
          </div>
          <Credit style={{ ...rise(f, 640, 16), marginTop: 36 }}>
            {TRANSLATION_CREDIT}
          </Credit>
        </div>
      ) : null}
      <div
        style={{
          ...beat(f, 540, 752),
          left: 0,
          position: "absolute",
          right: 0,
          top: 1884,
        }}
      >
        <Band start={540} top={0} h={36} />
      </div>

      {/* end card */}
      {end ? <EndCard f={f - 750} nasheed={withNasheed} /> : null}
    </AbsoluteFill>
  );
}

function EndCard({ f, nasheed }: { f: number; nasheed: boolean }) {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: prog(f, 0, 10) }}>
        <Mark frame={f} size={230} />
      </div>
      <div
        style={{
          ...rise(f, 22),
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
          ...rise(f, 34),
          color: C.inkSoft,
          fontFamily: F.text,
          fontSize: 48,
          marginTop: 20,
        }}
      >
        A verse for how you feel.
      </div>
      <div
        style={{
          ...rise(f, 48),
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
          ...rise(f, 62),
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
