// "Slow reading": a 9:16, 35 s counterpoint to scrolling. Cotton ground with a
// very slow, 5% adire cloth drift.
// Storyboard (30 fps, 1050 frames)
//   0-95    "Read slowly."
//   85-410  94:5 Arabic, word by word right to left (blur to sharp, 100/124/148/172);
//           English "With hardship comes ease" types in from 236; hold
//   405-500 "Then again."
//   495-805 94:5 Arabic reappears dim, 94:6 Arabic word by word directly under it
//           (570/594/618/642), English of 94:6 types in from 700
//   800-935 Ibn Kathir excerpt (16 words, tafsir/94.json), label "Ibn Kathir"
//   925-1050 End card: Mark, Home "Tadabbur" desc, URL, translation + music credit
import {
  AbsoluteFill,
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import quran94 from "../../../web/public/data/quran/94.json";
import { C, F, clothTile } from "../brand";
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

export const SLOWVERSE_DURATION = 1050;
export const meta = {
  durationInFrames: SLOWVERSE_DURATION,
  height: 1920,
  id: "SlowVerse",
  width: 1080,
};

function ayah(n: number) {
  const v = quran94.find((x) => x.ayah === n);
  if (!v) {
    throw new Error(`94:${n} missing`);
  }
  return v;
}
const v5 = ayah(5);
const v6 = ayah(6);

const W5 = v5.arabic.split(" ");
const W6 = v6.arabic.split(" ");

// Ibn Kathir on Surah 94 (tafsir/94.json), tags stripped, verbatim.
const TAFSIR =
  "Allah informs that with difficulty there is ease, and then reaffirms this information (by repeating it).";
// Home.tsx, Tadabbur entry desc.
const APP_DESC = "Ponder the Qur’an, surah by surah.";

const T = {
  again: [405, 500],
  end: 925,
  excerpt: [800, 935],
  read: [0, 95],
  s5: [85, 410],
  s6: [495, 805],
} as const;

const ARABIC = 132;

function Word({
  f,
  at,
  text,
  ink = C.indigoDeep,
}: {
  f: number;
  at: number;
  text: string;
  ink?: string;
}) {
  const p = prog(f, at, at + 34);
  return (
    <span
      style={{
        display: "inline-block",
        filter: `blur(${(1 - p) * 16}px)`,
        opacity: p,
        color: ink,
      }}
    >
      {text}
    </span>
  );
}

function ArabicLine({
  f,
  words,
  start,
  gap = 24,
  ink,
}: {
  f: number;
  words: string[];
  start: number;
  gap?: number;
  ink?: string;
}) {
  return (
    <div
      dir="rtl"
      style={{
        direction: "rtl",
        display: "flex",
        fontFamily: F.arabic,
        fontSize: ARABIC,
        gap: `0 ${ARABIC * 0.3}px`,
        justifyContent: "center",
        lineHeight: 2,
      }}
    >
      {words.map((w, i) => (
        <Word key={`${w}-${i}`} f={f} at={start + i * gap} text={w} ink={ink} />
      ))}
    </div>
  );
}

function English({ f, at, text }: { f: number; at: number; text: string }) {
  const shown = typed(text, f, at, 0.5);
  return (
    <div
      style={{
        color: C.inkSoft,
        fontFamily: F.text,
        fontSize: 60,
        lineHeight: 1.3,
        minHeight: 78,
        textAlign: "center",
      }}
    >
      {shown}
      {shown.length < text.length ? (
        <Caret f={f} color={C.indigo} height={46} solid />
      ) : null}
    </div>
  );
}

const centre = {
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  inset: 0,
  justifyContent: "center",
  padding: "0 80px 190px",
  position: "absolute",
} as const;

export function SlowVerse({ withNasheed }: { withNasheed: boolean }) {
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
              [0, 24, SLOWVERSE_DURATION - 60, SLOWVERSE_DURATION],
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

      {f < T.read[1] + 8 && (
        <div style={{ ...centre, ...beat(f, T.read[0], T.read[1]) }}>
          <div
            style={{
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 120,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            Read slowly.
          </div>
        </div>
      )}

      {f >= T.s5[0] && f < T.s5[1] + 8 && (
        <div style={{ ...centre, ...beat(f, T.s5[0], T.s5[1]), gap: 40 }}>
          <ArabicLine f={f} words={W5} start={100} gap={26} />
          <English f={f} at={240} text={v5.translation} />
          <div
            style={{
              ...rise(f, 300, 14, 10),
              color: C.inkFaint,
              fontFamily: F.ui,
              fontSize: 30,
              fontWeight: 500,
            }}
          >
            Ash-Sharh {v5.verseKey}
          </div>
        </div>
      )}

      {f >= T.again[0] && f < T.again[1] + 8 && (
        <div style={{ ...centre, ...beat(f, T.again[0], T.again[1]) }}>
          <div
            style={{
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 120,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            Then again.
          </div>
        </div>
      )}

      {f >= T.s6[0] && f < T.s6[1] + 8 && (
        <div style={{ ...centre, ...beat(f, T.s6[0], T.s6[1]), gap: 8 }}>
          <div
            style={{
              ...rise(f, 500, 18, 10),
              opacity: prog(f, 500, 518) * 0.55,
            }}
          >
            <ArabicLine f={9999} words={W5} start={0} ink={C.inkSoft} />
          </div>
          <ArabicLine f={f} words={W6} start={580} gap={26} />
          <div style={{ height: 24 }} />
          <English f={f} at={705} text={v6.translation} />
          <div
            style={{
              ...rise(f, 740, 14, 10),
              color: C.inkFaint,
              fontFamily: F.ui,
              fontSize: 30,
              fontWeight: 500,
              marginTop: 36,
            }}
          >
            Ash-Sharh {v5.verseKey}, {v6.verseKey}
          </div>
        </div>
      )}

      {f >= T.excerpt[0] && f < T.excerpt[1] + 8 && (
        <div
          style={{
            ...centre,
            ...beat(f, T.excerpt[0], T.excerpt[1]),
            alignItems: "flex-start",
            gap: 44,
          }}
        >
          <div
            style={{
              color: C.indigo,
              fontFamily: F.ui,
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Ibn Kathir
          </div>
          <div
            style={{
              color: C.indigoDeep,
              fontFamily: F.text,
              fontSize: 68,
              lineHeight: 1.3,
            }}
          >
            “{TAFSIR}”
          </div>
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
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              textAlign: "center",
            }}
          >
            {APP_DESC}
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
