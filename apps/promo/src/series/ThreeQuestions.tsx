// "Three questions": a 4:5 (1080x1350), 28 s typographic poster for the feed.
// Storyboard (30 fps, 840 frames)
//   0-60     verse card (94:5 Arabic + English + ref) settles in at the top
//   60-500   the three tadabbur questions arrive one at a time (60/200/340),
//            each with an invented example answer typed beneath (journal look)
//   500-735  "A week on" follow-up card: Ash-Sharh 94:5, "You wrote:", the answer to
//            "What will you do?", buttons Yes / Partly / Not yet; tap Partly (640)
//   690-735  "Kept in your journal."
//   735-840  end card: Mark, MindfulVerse, URL, translation (+ music) credit
import {
  AbsoluteFill,
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import quran94 from "../../../web/public/data/quran/94.json";
import { C, F } from "../brand";
import {
  beat,
  Caret,
  Credit,
  Fonts,
  Mark,
  NASHEED,
  NASHEED_CREDIT,
  prog,
  rise,
  TRANSLATION_CREDIT,
  typed,
} from "../kit";

export const THREEQ_DURATION = 840;
export const meta = {
  durationInFrames: THREEQ_DURATION,
  height: 1350,
  id: "ThreeQuestions",
  width: 1080,
};

function ayah(n: number) {
  const v = quran94.find((x) => x.ayah === n);
  if (!v) {
    throw new Error(`94:${n} missing`);
  }
  return v;
}
const verse = ayah(5);

// SurahTadabbur.tsx QUESTIONS labels (verbatim); answers are illustrative user writing.
const QS = [
  {
    at: 60,
    label: "What does it teach?",
    answer: "Ease comes with the hardship, not after.",
  },
  {
    at: 200,
    label: "What stays with you?",
    answer: "The word “with”. It is not far off.",
  },
  {
    at: 340,
    label: "What will you do?",
    answer: "Take one slow breath before I give up.",
  },
];
const END = 735;
const FOLLOW = [500, 735] as const;
const TAP = 640;

const shadow = "0 1px 0 rgba(22,26,46,0.04), 0 14px 40px rgba(22,26,46,0.07)";

function Question({
  f,
  q,
  i,
}: {
  f: number;
  q: (typeof QS)[number];
  i: number;
}) {
  const text = typed(q.answer, f, q.at + 26, 0.55);
  const done = text.length >= q.answer.length;
  return (
    <div style={{ ...rise(f, q.at, 16, 22), width: "100%" }}>
      <div
        style={{
          alignItems: "baseline",
          color: C.indigo,
          display: "flex",
          fontFamily: F.ui,
          fontSize: 28,
          fontWeight: 600,
          gap: 14,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span>{i + 1} / 3</span>
      </div>
      <div
        style={{
          color: C.indigoDeep,
          fontFamily: F.ui,
          fontSize: 62,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: "6px 0 14px",
        }}
      >
        {q.label}
      </div>
      <div
        style={{
          borderBottom: `2px solid ${C.line}`,
          color: C.ink,
          fontFamily: F.text,
          fontSize: 46,
          fontStyle: "italic",
          lineHeight: 1.4,
          minHeight: 76,
          paddingBottom: 6,
        }}
      >
        {text}
        {f >= q.at + 26 &&
        !(done && f > q.at + 26 + q.answer.length / 0.55 + 40) ? (
          <Caret f={f} color={C.indigo} height={42} />
        ) : null}
      </div>
    </div>
  );
}

export function ThreeQuestions({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const qsOut = prog(f, FOLLOW[0] - 10, FOLLOW[0] + 6);
  const tap = prog(f, TAP, TAP + 10);
  const kept = f >= 690;
  return (
    <AbsoluteFill style={{ background: C.cotton, height, width }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(x) =>
            interpolate(
              x,
              [0, 24, THREEQ_DURATION - 60, THREEQ_DURATION],
              [0, 0.8, 0.8, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          }
        />
      ) : null}

      {f < END + 8 && (
        <>
          <div
            style={{
              ...beat(f, 0, END),
              background: C.wash,
              borderRadius: 36,
              boxShadow: shadow,
              left: 70,
              padding: "34px 40px 36px",
              position: "absolute",
              right: 70,
              textAlign: "center",
              top: 70,
            }}
          >
            <div
              dir="rtl"
              style={{
                color: C.indigoDeep,
                direction: "rtl",
                fontFamily: F.arabic,
                fontSize: 100,
                lineHeight: 1.9,
              }}
            >
              {verse.arabic}
            </div>
            <div
              style={{
                color: C.inkSoft,
                fontFamily: F.text,
                fontSize: 40,
                marginTop: 2,
              }}
            >
              {verse.translation}
            </div>
            <div
              style={{
                color: C.indigo,
                fontFamily: F.ui,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "0.08em",
                marginTop: 12,
                textTransform: "uppercase",
              }}
            >
              Ash-Sharh {verse.verseKey}
            </div>
          </div>

          {f < FOLLOW[0] + 10 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 64,
                left: 90,
                opacity: 1 - qsOut,
                position: "absolute",
                right: 90,
                top: 530,
              }}
            >
              {QS.map((q, i) => (
                <Question key={q.label} f={f} q={q} i={i} />
              ))}
            </div>
          )}

          {f >= FOLLOW[0] && (
            <div
              style={{
                ...(kept ? { opacity: 1 } : rise(f, FOLLOW[0], 16, 30)),
                background: C.raised,
                border: `1px solid ${C.line}`,
                borderRadius: 32,
                boxShadow: shadow,
                height: 570,
                left: 70,
                padding: "40px 50px",
                position: "absolute",
                right: 70,
                top: 540,
              }}
            >
              {kept ? (
                <div
                  style={{
                    ...rise(f, 690, 14, 14),
                    alignItems: "center",
                    color: C.indigoDeep,
                    display: "flex",
                    fontFamily: F.ui,
                    fontSize: 76,
                    fontWeight: 600,
                    height: "100%",
                    justifyContent: "center",
                    letterSpacing: "-0.03em",
                    textAlign: "center",
                  }}
                >
                  Kept in your journal.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      color: C.indigo,
                      fontFamily: F.ui,
                      fontSize: 28,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    A week on · Ash-Sharh {verse.verseKey}
                  </div>
                  <div
                    style={{
                      color: C.indigoDeep,
                      fontFamily: F.ui,
                      fontSize: 72,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      margin: "8px 0 30px",
                    }}
                  >
                    How did it go?
                  </div>
                  <div
                    style={{
                      color: C.inkFaint,
                      fontFamily: F.ui,
                      fontSize: 30,
                    }}
                  >
                    You wrote:
                  </div>
                  <div
                    style={{
                      color: C.ink,
                      fontFamily: F.text,
                      fontSize: 46,
                      fontStyle: "italic",
                      lineHeight: 1.35,
                      margin: "6px 0 44px",
                    }}
                  >
                    “{QS[2].answer}”
                  </div>
                  <div
                    style={{
                      ...rise(f, 560, 14, 16),
                      display: "flex",
                      gap: 20,
                    }}
                  >
                    {["Yes", "Partly", "Not yet"].map((a) => {
                      const on = a === "Partly";
                      return (
                        <div
                          key={a}
                          style={{
                            background: on
                              ? `color-mix(in srgb, ${C.indigo} ${tap * 100}%, ${C.wash})`
                              : C.wash,
                            borderRadius: 24,
                            color: on && tap > 0.5 ? C.cotton : C.indigoDeep,
                            flex: 1,
                            fontFamily: F.ui,
                            fontSize: 40,
                            fontWeight: 600,
                            padding: "30px 0",
                            textAlign: "center",
                            transform: on
                              ? `scale(${1 - Math.sin(tap * Math.PI) * 0.05})`
                              : undefined,
                          }}
                        >
                          {a}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {f >= END && (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 28,
            inset: 0,
            justifyContent: "center",
            position: "absolute",
          }}
        >
          <Mark frame={f - END} size={200} />
          <div
            style={{
              ...rise(f, END + 16),
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 92,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            MindfulVerse
          </div>
          <div
            style={{
              ...rise(f, END + 28),
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 44,
              fontWeight: 600,
            }}
          >
            mindfulverse.vercel.app
          </div>
          <Credit
            style={{
              ...rise(f, END + 40, 14, 10),
              bottom: 70,
              left: 0,
              position: "absolute",
              right: 0,
              textAlign: "center",
            }}
          >
            {TRANSLATION_CREDIT}
            {withNasheed ? <div>{NASHEED_CREDIT}</div> : null}
          </Credit>
        </div>
      )}
    </AbsoluteFill>
  );
}
