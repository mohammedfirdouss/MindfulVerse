// "114" — 9:16, 34 s, 30 fps.
//
// Storyboard (frames @30):
//   0-120     "114" huge, then "surahs."  => "114 surahs."
//   85-160    the number bursts into 114 adire diamonds filling the frame
//   160-300   they light up in order with surah numbers
//   160-420   "Ponder them one by one." (top)
//   300-560   a ribbon of the real surah names (surahs.json) scrolls past,
//             slowing to land on 103, Al-'Asr
//   570-665   grid zooms into diamond 103 until it floods the frame (indigo)
//   668-895   Al-'Asr, its 3 verses (quran/103.json), Arabic + English,
//             stacked in one by one; TRANSLATION_CREDIT beneath
//   895-1020  end card: Mark, "Ponder the Qur’an, surah by surah."
//             (Home.tsx, Tadabbur card), MindfulVerse, URL, band (+music credit)
import { AbsoluteFill, Audio, useCurrentFrame } from "remotion";

import verses from "../../../web/public/data/quran/103.json";
import surahs from "../../../web/public/data/surahs.json";
import { C, F } from "../brand";
import {
  Band,
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

export const ONEFOURTEEN_DURATION = 1020;
export const meta = {
  durationInFrames: ONEFOURTEEN_DURATION,
  height: 1920,
  id: "OneFourteen",
  width: 1080,
};

const COLS = 9;
const CELL = 120;
const GRID_TOP = 260;
const TARGET = 103;
const ROW_H = 110;

function cellPos(i: number) {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  const inRow = Math.min(COLS, 114 - row * COLS);
  const left = (1080 - inRow * CELL) / 2;
  return {
    x: left + col * CELL + CELL / 2,
    y: GRID_TOP + row * CELL + CELL / 2,
  };
}

const DIAMOND = "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)";

function Grid({ f }: { f: number }) {
  const zoom = prog(f, 570, 665, ease.inOut);
  const tgt = cellPos(TARGET - 1);
  const scale = Math.exp(Math.log(34) * zoom);
  const dim = 1 - prog(f, 290, 320) * 0.9 + prog(f, 560, 585) * 0.9;
  return (
    <AbsoluteFill
      style={{
        opacity: dim,
        transform: `scale(${scale})`,
        transformOrigin: `${tgt.x}px ${tgt.y}px`,
      }}
    >
      {Array.from({ length: 114 }, (_, k) => {
        const n = k + 1;
        const p = cellPos(k);
        const fly = prog(f, 88 + (k % 9) * 2, 150 + (k % 9) * 2);
        const x = 540 + (p.x - 540) * fly;
        const y = 960 + (p.y - 960) * fly;
        const litAt = 165 + k * 1.15;
        const lit = prog(f, litAt, litAt + 10);
        const pop =
          1 +
          Math.sin(Math.min(1, Math.max(0, (f - litAt) / 14)) * Math.PI) * 0.14;
        const isT = n === TARGET;
        const size = 104 * fly * pop;
        return (
          <div
            key={n}
            style={{
              alignItems: "center",
              background: C.indigo,
              clipPath: DIAMOND,
              color: C.cotton,
              display: "flex",
              fontFamily: F.text,
              fontSize: n > 99 ? 30 : 34,
              fontWeight: 600,
              height: size,
              justifyContent: "center",
              left: x - size / 2,
              opacity: (0.16 + 0.84 * lit) * (isT ? 1 : 1 - prog(f, 566, 588)),
              position: "absolute",
              top: y - size / 2,
              width: size,
            }}
          >
            <span style={{ opacity: lit }}>{n}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function Ribbon({ f }: { f: number }) {
  const t = prog(f, 300, 548, ease.inOut);
  const pos = t * (TARGET - 1);
  const vis = prog(f, 300, 322) * (1 - prog(f, 536, 556, ease.inOut));
  if (vis <= 0) {
    return null;
  }
  return (
    <AbsoluteFill style={{ opacity: vis }}>
      {surahs.map((s, r) => {
        const dy = (r - pos) * ROW_H;
        if (Math.abs(dy) > 1000) {
          return null;
        }
        const near = Math.max(0, 1 - Math.abs(r - pos));
        const a = Math.max(0, 1 - Math.abs(dy) / 900);
        return (
          <div
            key={s.number}
            style={{
              alignItems: "center",
              display: "flex",
              gap: 36,
              height: ROW_H,
              left: 200,
              opacity: a * (0.8 + 0.2 * near),
              position: "absolute",
              top: 960 + dy - ROW_H / 2,
              transform: `scale(${1 + near * 0.12})`,
              transformOrigin: "0 50%",
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: near > 0.5 ? C.indigo : C.indigoDeep,
                clipPath: DIAMOND,
                color: C.cotton,
                display: "flex",
                fontFamily: F.text,
                fontSize: 28,
                fontWeight: 600,
                height: 84,
                justifyContent: "center",
                width: 84,
              }}
            >
              {s.number}
            </div>
            <div
              style={{
                color: near > 0.5 ? C.indigo : C.inkSoft,
                fontFamily: F.ui,
                fontSize: 72,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {s.name}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

const H = {
  color: C.indigoDeep,
  fontFamily: F.ui,
  fontSize: 96,
  fontWeight: 600,
  letterSpacing: "-0.03em",
  textAlign: "center" as const,
};

export function OneFourteen({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  const flood = prog(f, 640, 668);
  const endIn = 900;
  const verseStart = [668, 735, 805];
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(g) =>
            Math.min(
              prog(g, 0, 24, (t) => t) * 0.8,
              0.8 *
                (1 -
                  prog(
                    g,
                    ONEFOURTEEN_DURATION - 60,
                    ONEFOURTEEN_DURATION,
                    (t) => t
                  ))
            )
          }
        />
      ) : null}
      {/* 114 */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          ...beat(f, 4, 100),
        }}
      >
        <div
          style={{
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 560,
            fontWeight: 600,
            letterSpacing: "-0.06em",
            lineHeight: 1,
          }}
        >
          114
        </div>
      </AbsoluteFill>
      <div
        style={{
          ...H,
          ...beat(f, 30, 100),
          left: 0,
          position: "absolute",
          right: 0,
          top: 1240,
        }}
      >
        surahs.
      </div>
      <Grid f={f} />
      <div
        style={{
          ...H,
          ...beat(f, 162, 420),
          fontSize: 80,
          left: 0,
          position: "absolute",
          right: 0,
          top: 52,
        }}
      >
        Ponder them one by one.
      </div>
      <Ribbon f={f} />
      <AbsoluteFill style={{ background: C.indigo, opacity: flood }} />
      <div
        style={{
          ...rise(f, 668, 16),
          color: C.nightIndigo,
          fontFamily: F.ui,
          fontSize: 52,
          fontWeight: 600,
          left: 0,
          position: "absolute",
          right: 0,
          textAlign: "center",
          top: 150,
        }}
      >
        {surahs[TARGET - 1].name} · {TARGET}
      </div>
      <div
        style={{
          display: "grid",
          gap: 56,
          left: 70,
          opacity: 1 - prog(f, endIn - 4, endIn + 10, ease.inOut),
          position: "absolute",
          right: 70,
          top: 250,
        }}
      >
        {verses.map((v, i) => (
          <div
            key={v.ayah}
            style={{
              display: "grid",
              gap: 18,
              ...rise(f, verseStart[i], 18, 24),
            }}
          >
            <div
              style={{
                color: C.cotton,
                direction: "rtl",
                fontFamily: F.arabic,
                fontSize: 92,
                lineHeight: 1.95,
                textAlign: "center",
              }}
            >
              {v.arabic}
            </div>
            <div
              style={{
                color: C.nightIndigo,
                fontFamily: F.text,
                fontSize: 54,
                lineHeight: 1.35,
                textAlign: "center",
              }}
            >
              {v.translation}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          ...rise(f, 812, 16, 10),
          bottom: 60,
          color: C.nightIndigo,
          fontFamily: F.ui,
          fontSize: 30,
          fontWeight: 500,
          left: 0,
          opacity:
            (rise(f, 812, 16, 10).opacity as number) *
            (1 - prog(f, endIn - 4, endIn + 10, ease.inOut)),
          position: "absolute",
          right: 0,
          textAlign: "center",
        }}
      >
        {TRANSLATION_CREDIT}
      </div>
      {/* end card */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          flexDirection: "column",
          gap: 44,
          justifyContent: "center",
          ...rise(f, endIn + 6, 18),
          padding: "0 90px",
        }}
      >
        <Mark
          frame={Math.max(0, f - endIn - 6)}
          ground={C.indigo}
          ink={C.cotton}
          size={300}
        />
        <div
          style={{
            ...H,
            color: C.cotton,
            fontSize: 84,
            lineHeight: 1.12,
            textWrap: "balance",
          }}
        >
          Ponder the Qur’an, surah by surah.
        </div>
        <div style={{ ...H, color: C.cotton, fontSize: 104 }}>MindfulVerse</div>
        <div
          style={{
            color: C.nightIndigo,
            fontFamily: F.ui,
            fontSize: 48,
            fontWeight: 600,
          }}
        >
          mindfulverse.vercel.app
        </div>
      </AbsoluteFill>
      {f >= endIn ? <Band h={48} start={endIn + 6} top={1920 - 48} /> : null}
      {withNasheed ? (
        <div
          style={{
            ...rise(f, endIn + 26, 14, 10),
            bottom: 90,
            color: C.nightIndigo,
            fontFamily: F.ui,
            fontSize: 28,
            fontWeight: 500,
            left: 0,
            position: "absolute",
            right: 0,
            textAlign: "center",
          }}
        >
          {NASHEED_CREDIT}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
