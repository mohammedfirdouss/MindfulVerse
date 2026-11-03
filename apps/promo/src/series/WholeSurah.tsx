// WholeSurah — 1080x1080, 20 s (600 f), 30 fps. A surah as a living poster; loops.
// Storyboard (indigo ground + faint cloth tile, cotton text, Arabic stack always shown):
//   0-120   verse 1 bright, others 35%; diamond 1 + English 112:1  (frame 0 == frame 599)
//   120-240 verse 2 bright + English 112:2
//   240-360 verse 3 bright + English 112:3
//   360-480 verse 4 bright + English 112:4
//   480-575 all four bright; "Al-Ikhlas" / "الإخلاص" / "4 verses"
//   575-600 dissolve back to the verse-1 state (identical to frame 0)
// Always: small mark + mindfulverse.vercel.app (top-left), translation credit (bottom).
// Nasheed version adds NASHEED_CREDIT from 480.
// Sources: quran/112.json (Arabic, English), surahs.json (Al-Ikhlas, 4 verses),
// QUL quran-metadata-surah-name.json (name_arabic الإخلاص).
import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";

import verses from "../../../web/public/data/quran/112.json";
import surahs from "../../../web/public/data/surahs.json";
import { C, F, clothTile } from "../brand";
import {
  Fonts,
  Mark,
  NASHEED,
  NASHEED_CREDIT,
  TRANSLATION_CREDIT,
  ease,
} from "../kit";

export const WHOLESURAH_DURATION = 600;
export const meta = {
  durationInFrames: WHOLESURAH_DURATION,
  height: 1080,
  id: "WholeSurah",
  width: 1080,
};

const ARABIC_NAME = "الإخلاص";
const surah = surahs.find((s) => s.number === 112) as {
  name: string;
  ayahCount: number;
};
const DIM = 0.35;

const kf = (f: number, at: number[], vals: number[]) =>
  interpolate(f, at, vals, {
    easing: ease.inOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// Arabic brightness per verse (the ends of the timeline repeat the start).
const BRIGHT: [number[], number[]][] = [
  [
    [0, 110, 126, 470, 486, 600],
    [1, 1, DIM, DIM, 1, 1],
  ],
  [
    [0, 114, 130, 230, 246, 470, 486, 572, 588],
    [DIM, DIM, 1, 1, DIM, DIM, 1, 1, DIM],
  ],
  [
    [0, 234, 250, 350, 366, 470, 486, 572, 588],
    [DIM, DIM, 1, 1, DIM, DIM, 1, 1, DIM],
  ],
  [
    [0, 354, 370, 470, 486, 572, 588],
    [DIM, DIM, 1, 1, 1, 1, DIM],
  ],
];
// English + diamond visibility per verse.
const SHOW: [number[], number[]][] = [
  [
    [0, 110, 124, 576, 590, 600],
    [1, 1, 0, 0, 1, 1],
  ],
  [
    [0, 114, 128, 230, 244],
    [0, 0, 1, 1, 0],
  ],
  [
    [0, 234, 248, 350, 364],
    [0, 0, 1, 1, 0],
  ],
  [
    [0, 354, 368, 468, 482],
    [0, 0, 1, 1, 0],
  ],
];
const NAME: [number[], number[]] = [
  [0, 478, 492, 562, 576],
  [0, 0, 1, 1, 0],
];

const layer = {
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  left: 0,
  position: "absolute",
  right: 0,
  top: 745,
} as const;

function Diamond({ n, size = 72 }: { n: number | string; size?: number }) {
  return (
    <div
      style={{
        alignItems: "center",
        background: C.cotton,
        clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
        color: C.indigo,
        display: "flex",
        fontFamily: F.text,
        fontSize: size * 0.4,
        fontWeight: 600,
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      {n}
    </div>
  );
}

export function WholeSurah({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.indigo }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(x) =>
            interpolate(
              x,
              [0, 24, WHOLESURAH_DURATION - 60, WHOLESURAH_DURATION],
              [0, 0.8, 0.8, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            )
          }
        />
      ) : null}
      <div
        style={{
          backgroundImage: clothTile(C.cotton, 0.07, 88),
          inset: 0,
          position: "absolute",
        }}
      />

      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 14,
          left: 44,
          position: "absolute",
          top: 40,
        }}
      >
        <Mark frame={999} size={44} ground={C.cotton} ink={C.indigo} />
        <span
          style={{
            color: C.cotton,
            fontFamily: F.ui,
            fontSize: 24,
            fontWeight: 500,
            opacity: 0.7,
          }}
        >
          mindfulverse.vercel.app
        </span>
      </div>

      <div style={{ left: 0, position: "absolute", right: 0, top: 104 }}>
        {verses.map((v, i) => (
          <div
            key={v.ayah}
            lang="ar"
            style={{
              color: C.cotton,
              direction: "rtl",
              fontFamily: F.arabic,
              fontSize: 84,
              lineHeight: 1.85,
              opacity: kf(f, BRIGHT[i][0], BRIGHT[i][1]),
              textAlign: "center",
            }}
          >
            {v.arabic}
          </div>
        ))}
      </div>

      {verses.map((v, i) => {
        const o = kf(f, SHOW[i][0], SHOW[i][1]);
        return (
          <div
            key={v.ayah}
            style={{
              ...layer,
              gap: 22,
              opacity: o,
              transform: `translateY(${(1 - o) * 14}px)`,
            }}
          >
            <Diamond n={v.ayah} />
            <div
              style={{
                color: C.cotton,
                fontFamily: F.text,
                fontSize: 42,
                lineHeight: 1.4,
                maxWidth: 860,
                textAlign: "center",
                textWrap: "balance",
              }}
            >
              {v.translation}
            </div>
          </div>
        );
      })}

      {(() => {
        const o = kf(f, NAME[0], NAME[1]);
        return (
          <div
            style={{
              ...layer,
              gap: 4,
              opacity: o,
              top: 750,
              transform: `translateY(${(1 - o) * 14}px)`,
            }}
          >
            <div
              lang="ar"
              style={{
                color: C.cotton,
                direction: "rtl",
                fontFamily: F.arabic,
                fontSize: 64,
                lineHeight: 1.6,
              }}
            >
              {ARABIC_NAME}
            </div>
            <div
              style={{
                color: C.cotton,
                fontFamily: F.ui,
                fontSize: 52,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              {surah.name}
            </div>
            <div
              style={{
                color: C.cotton,
                fontFamily: F.ui,
                fontSize: 32,
                fontWeight: 500,
                marginTop: 10,
                opacity: 0.75,
              }}
            >
              {surah.ayahCount} verses
            </div>
          </div>
        );
      })()}

      <div
        style={{
          bottom: 36,
          left: 0,
          position: "absolute",
          right: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: C.cotton,
            fontFamily: F.ui,
            fontSize: 24,
            fontWeight: 500,
            opacity: 0.7,
          }}
        >
          {TRANSLATION_CREDIT}
        </div>
        {withNasheed ? (
          <div
            style={{
              color: C.cotton,
              fontFamily: F.ui,
              fontSize: 22,
              fontWeight: 500,
              marginTop: 4,
              opacity: 0.7 * kf(f, [478, 492], [0, 1]),
            }}
          >
            {NASHEED_CREDIT}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}
