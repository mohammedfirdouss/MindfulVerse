// "Twenty doors": 9:16, 26 s. The 20 curated sessions as a deck of cards.
// Storyboard (30 fps, 780 frames)
//   0-75    "20 sessions." (count of sessions.json); the deck drops in, stacked
//   70-250  Heading "By theme" + "Short guided reflections. A few verses gathered
//           around one theme." (Sessions.tsx); the deck fans open, a wave runs
//           along it so each title is read (titles verbatim)
//   235-335 The fan folds back into a stack, riffle-shuffled; "Ease After Hardship"
//           lands on top; heading fades
//   335-395 That card slides forward and grows
//   395-450 It flips (rotateY) to its back
//   440-560 Back: theme, title, intro (verbatim)
//   545-640 Verse 94:5 (Arabic + English + ref) under the intro
//   635-780 End card: Mark, MindfulVerse, URL, translation (+ music) credit
import {
  AbsoluteFill,
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import quran94 from "../../../web/public/data/quran/94.json";
import sessionsRaw from "../../../web/public/data/sessions.json";
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
  TRANSLATION_CREDIT,
} from "../kit";

export const TWENTYDOORS_DURATION = 780;
export const meta = {
  durationInFrames: TWENTYDOORS_DURATION,
  height: 1920,
  id: "TwentyDoors",
  width: 1080,
};

interface Session {
  id: string;
  title: string;
  theme: string;
  intro: string;
  steps: { verseKeys: string[] }[];
}
const sessions = sessionsRaw as Session[];
const N = sessions.length;
const CHOSEN = sessions.findIndex((s) => s.title === "Ease After Hardship");
if (CHOSEN === -1) {
  throw new Error("Ease After Hardship missing");
}
const chosen = sessions[CHOSEN];
const verseFound = quran94.find(
  (v) => v.verseKey === chosen.steps[0].verseKeys[0]
);
if (!verseFound) {
  throw new Error("verse missing");
}
const verse = verseFound;
const SURAH_NAME = "Ash-Sharh"; // surahs.json, number 94

// Sessions.tsx copy.
const HEADING = "By theme";
const DESC =
  "Short guided reflections. A few verses gathered around one theme.";

const T = {
  chosenSlide: [335, 395],
  end: 635,
  fan: [70, 150],
  flip: [395, 450],
  fold: [235, 305],
  heading: [70, 335],
  verse: 545,
} as const;

const CW = 700;
const CH = 450;
const DECK_Y = 1080; // pivot of the deck on the canvas

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

function pseudo(i: number, k: number) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43_758.5453;
  return x - Math.floor(x);
}

function Eyebrow({ children, size }: { children: string; size: number }) {
  return (
    <div
      style={{
        color: C.indigo,
        fontFamily: F.ui,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </div>
  );
}

function CardFace({
  s,
  i,
  w,
  h,
}: {
  s: Session;
  i: number;
  w: number;
  h: number;
}) {
  return (
    <div
      style={{
        background: i % 2 === 0 ? C.raised : C.wash,
        borderRadius: 8,
        boxShadow: `0 0 0 1.5px ${C.line}, 0 22px 44px rgba(27,37,89,0.14)`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        height: h,
        justifyContent: "center",
        padding: "0 44px",
        width: w,
      }}
    >
      <Eyebrow size={34}>{s.theme}</Eyebrow>
      <div
        style={{
          color: C.indigoDeep,
          fontFamily: F.ui,
          fontSize: 70,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
        }}
      >
        {s.title}
      </div>
    </div>
  );
}

function DeckCard({ s, i, f }: { s: Session; i: number; f: number }) {
  // stack pose: tiny jitter; fan pose: arc around a low pivot
  const jitter = (k: number, amp: number) => (pseudo(i, k) - 0.5) * 2 * amp;
  const drop = prog(f, 4 + i * 2.2, 34 + i * 2.2);
  const fanIn = prog(f, T.fan[0] + i * 1.5, T.fan[1] + i * 1.5, ease.inOut);
  const fold = prog(
    f,
    T.fold[0] + (N - i) * 1.6,
    T.fold[1] + (N - i) * 1.6,
    ease.inOut
  );
  const fan = fanIn * (1 - fold);
  const angle = (i - (N - 1) / 2) * 1.9;
  // wave: each card lifts in turn along its radial direction
  const wt = 138 + i * 3.6;
  const wave = Math.sin(Math.PI * prog(f, wt, wt + 22, ease.inOut)) * fan;
  const lift = wave * 280;
  // riffle during fold
  const riffle = Math.sin(Math.PI * fold) * (i % 2 === 0 ? -1 : 1) * 300;
  const stackRot = jitter(1, 3.2) * (1 - fold * (i === CHOSEN ? 1 : 0.6));
  const rot = angle * fan + stackRot * (1 - fan);
  const tx = jitter(2, 14) * (1 - fan) * (1 - fold) + riffle;
  const ty =
    jitter(3, 12) * (1 - fan) * (1 - fold) - lift - (i === CHOSEN ? 0 : 0);
  const z = i === CHOSEN && fold > 0.55 ? 100 : wave > 0.05 ? 50 : i;
  // after the pick: the rest sink away
  const away = prog(f, T.chosenSlide[0], T.chosenSlide[0] + 50, ease.inOut);
  const tilt = (1 - drop) * 40;
  return (
    <div
      style={{
        filter: `blur(${away * 8}px)`,
        height: CH,
        left: (1080 - CW) / 2,
        opacity: drop * (1 - away),
        position: "absolute",
        top: DECK_Y - CH / 2,
        transform: `translate3d(${tx}px, ${ty + (1 - drop) * -380 + away * 160}px, 0) rotateX(${tilt}deg) rotate(${rot}deg) scale(${1 - away * 0.12})`,
        transformOrigin: `50% ${CH + 760}px`,
        width: CW,
        zIndex: z,
      }}
    >
      <CardFace s={s} i={i} w={CW} h={CH} />
    </div>
  );
}

function Opened({ f }: { f: number }) {
  const slide = prog(f, T.chosenSlide[0], T.chosenSlide[1], ease.inOut);
  const flip = prog(f, T.flip[0], T.flip[1], ease.inOut);
  const w = CW + (900 - CW) * slide;
  const h = CH + (1340 - CH) * slide;
  const cy = DECK_Y + (930 - DECK_Y) * slide;
  const out = prog(f, T.end - 6, T.end + 14, ease.inOut);
  const ang = flip * 180;
  const lift = 1 + Math.sin(Math.PI * flip) * 0.04;
  const front = ang < 90;
  const face = {
    backfaceVisibility: "hidden",
    inset: 0,
    position: "absolute",
  } as const;
  return (
    <div
      style={{
        filter: out > 0 ? `blur(${out * 8}px)` : undefined,
        height: h,
        left: (1080 - w) / 2,
        opacity: out > 0 ? 1 - out : undefined,
        position: "absolute",
        top: cy - h / 2,
        transform: `rotateY(${ang}deg) scale(${lift})`,
        transformStyle: "preserve-3d",
        width: w,
        zIndex: 200,
      }}
    >
      <div style={{ ...face, opacity: front ? 1 : 0 }}>
        <div
          style={{
            background: C.raised,
            borderRadius: 8,
            boxShadow: `0 0 0 1.5px ${C.line}, 0 30px 70px rgba(27,37,89,0.18)`,
            display: "flex",
            flexDirection: "column",
            gap: 16 + slide * 12,
            height: h,
            justifyContent: "center",
            padding: "0 44px",
            width: w,
          }}
        >
          <Eyebrow size={34 + slide * 10}>{chosen.theme}</Eyebrow>
          <div
            style={{
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 70 + slide * 30,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
            }}
          >
            {chosen.title}
          </div>
        </div>
      </div>
      <div
        style={{
          ...face,
          background: C.wash,
          borderRadius: 8,
          boxShadow: `0 0 0 1.5px ${C.line}, 0 30px 70px rgba(27,37,89,0.18)`,
          opacity: front ? 0 : 1,
          transform: "rotateY(180deg)",
        }}
      >
        <Back f={f} />
      </div>
    </div>
  );
}

function Back({ f }: { f: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 30,
        inset: 0,
        justifyContent: "center",
        padding: "50px 64px",
        position: "absolute",
      }}
    >
      <div style={rise(f, 440)}>
        <Eyebrow size={44}>{chosen.theme}</Eyebrow>
        <div
          style={{
            color: C.indigoDeep,
            fontFamily: F.ui,
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            marginTop: 10,
          }}
        >
          {chosen.title}
        </div>
      </div>
      <div
        style={{
          ...rise(f, 462),
          color: C.inkSoft,
          fontFamily: F.text,
          fontSize: 56,
          lineHeight: 1.45,
        }}
      >
        {chosen.intro}
      </div>
      <div
        style={{
          background: C.line,
          height: 2,
          marginTop: 8,
          opacity: prog(f, T.verse - 6, T.verse + 10),
        }}
      />
      <div
        style={{
          ...rise(f, T.verse, 18),
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div
          dir="rtl"
          style={{
            color: C.indigoDeep,
            direction: "rtl",
            fontFamily: F.arabic,
            fontSize: 128,
            lineHeight: 2,
            textAlign: "center",
          }}
        >
          {verse.arabic}
        </div>
        <div
          style={{
            color: C.ink,
            fontFamily: F.text,
            fontSize: 58,
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          {verse.translation}
        </div>
        <div
          style={{
            color: C.inkFaint,
            fontFamily: F.ui,
            fontSize: 38,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {SURAH_NAME} · {verse.verseKey}
        </div>
      </div>
    </div>
  );
}

export function TwentyDoors({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drift = f * 0.22;
  return (
    <AbsoluteFill style={{ background: C.cotton, height, width }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(x) =>
            interpolate(
              x,
              [0, 24, TWENTYDOORS_DURATION - 60, TWENTYDOORS_DURATION],
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

      {f < 90 && (
        <div
          style={{
            ...centre,
            justifyContent: "flex-start",
            paddingTop: 230,
            ...beat(f, 6, 84),
          }}
        >
          <div
            style={{
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 150,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            {N} sessions.
          </div>
        </div>
      )}

      {f >= T.heading[0] - 4 && f < T.heading[1] + 10 && (
        <div
          style={{
            ...centre,
            gap: 24,
            justifyContent: "flex-start",
            paddingTop: 190,
            ...beat(f, T.heading[0], T.heading[1]),
          }}
        >
          <div
            style={{
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 120,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            {HEADING}
          </div>
          <div
            style={{
              color: C.inkSoft,
              fontFamily: F.text,
              fontSize: 48,
              lineHeight: 1.4,
            }}
          >
            {DESC}
          </div>
        </div>
      )}

      {f < T.end + 20 && (
        <div style={{ inset: 0, perspective: 2200, position: "absolute" }}>
          {sessions.map((s, i) =>
            i === CHOSEN && f >= T.chosenSlide[0] ? null : (
              <DeckCard key={s.id} s={s} i={i} f={f} />
            )
          )}
          {f >= T.chosenSlide[0] && <Opened f={f} />}
        </div>
      )}

      {f >= T.end && (
        <div style={{ ...centre, gap: 40 }}>
          <Mark frame={f - T.end} size={220} />
          <div
            style={{
              ...rise(f, T.end + 18),
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
              ...rise(f, T.end + 34),
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 48,
              fontWeight: 600,
            }}
          >
            mindfulverse.vercel.app
          </div>
          <Credit
            style={{
              ...rise(f, T.end + 46, 14, 10),
              bottom: 120,
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
