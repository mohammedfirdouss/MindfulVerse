// "Curl a verse": a 16:9 video for developers. Code becomes calm.
// Storyboard (30 fps, 900 frames = 30 s, 1920x1080)
//   0-95     night. "A verse a day, for your site."; terminal opens, the real curl example types
//   150-170  Enter. 170-290 the JSON response streams in line by line (real fields, verse 94:5)
//   290-345  hold. 345-450 arabic / translation / surah name + key / credit fly out onto a card
//            on a neutral browser mock (your-site.org); night eases to cotton
//   450-590  "Free for non-commercial use."  card shows the translation credit (licence rule)
//   600-760  "Get a key by verifying your domain." browser shrinks left; the page's own verify copy + button
//   770-900  end card: Mark, "MindfulVerse for developers", mindfulverse.vercel.app/developers
import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";

import quran94 from "../../../web/public/data/quran/94.json";
import surahs from "../../../web/public/data/surahs.json";
import { C, clothTile, F } from "../brand";
import {
  beat,
  Caret,
  Credit,
  ease,
  Fonts,
  Headline,
  Mark,
  NASHEED,
  NASHEED_CREDIT,
  prog,
  rise,
  typed,
} from "../kit";

export const CURLAVERSE_DURATION = 900;
export const meta = {
  durationInFrames: CURLAVERSE_DURATION,
  height: 1080,
  id: "CurlAVerse",
  width: 1920,
};

const VERSE = quran94.find((v) => v.ayah === 5) as (typeof quran94)[number];
const SURAH_NAME = (surahs.find((s) => s.number === 94) as { name: string })
  .name;
const CREDIT = "English translation by Talal Itani (ClearQuran).";
const BASE = "https://574zppe8.us-east.insforge.app";
const MONO = 'ui-monospace, SFMono-Regular, Menlo, "SF Mono", monospace';

const CURL = `curl "${BASE}/functions/daily-verse?tz=Africa/Lagos" \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "X-Seed: a-stable-id-for-this-reader"`;

interface Part {
  t: string;
  k?: "dim" | "key" | "str" | "num" | "arabic" | "punct";
}
const kv = (key: string, val: Part, last = false, indent = 2): Part[] => [
  { t: " ".repeat(indent) },
  { k: "key", t: `"${key}"` },
  { k: "punct", t: ": " },
  val,
  { k: "punct", t: last ? "" : "," },
];
const s = (t: string): Part => ({ k: "str", t });
const dim = (): Part[] => [{ t: "  " }, { k: "dim", t: "…" }];
const JSON_LINES: Part[][] = [
  [{ k: "punct", t: "{" }],
  kv("arabic", { k: "arabic", t: VERSE.arabic }),
  dim(),
  kv("reflectUrl", s('"https://mindfulverse.vercel.app/tadabbur/94?v=5"')),
  dim(),
  kv("surahName", s(`"${SURAH_NAME}"`)),
  kv("translation", s(`"${VERSE.translation}"`)),
  kv("translationCredit", s(`"${CREDIT}"`)),
  dim(),
  kv("verseKey", s(`"${VERSE.verseKey}"`), true),
  [{ k: "punct", t: "}" }],
];

const FS = 29;
const LH = 40;
const TERM = { h: 790, w: 1660, x: 130, y: 200 };
const BODY_X = TERM.x + 32;
const BODY_Y = TERM.y + 48 + 26;
const CH = FS * 0.602;
const CMD_LINES = 3;
const JSON_TOP = BODY_Y + (CMD_LINES + 1) * LH; // blank line between
const jsonY = (i: number) => JSON_TOP + i * LH + LH / 2;

const colour = (k?: Part["k"]) => {
  if (k === "key") {
    return C.nightIndigo;
  }
  if (k === "num") {
    return C.nightSoft;
  }
  if (k === "punct" || k === "dim") {
    return C.nightSoft;
  }
  return C.nightInk;
};

const CARD = { h: 480, w: 820, x: 550, y: 320 };
const cardCx = CARD.x + CARD.w / 2;
const DEST = {
  arabic: { x: cardCx, y: CARD.y + 150 },
  credit: { x: cardCx, y: CARD.y + 428 },
  ref: { x: cardCx, y: CARD.y + 352 },
  tr: { x: cardCx, y: CARD.y + 268 },
};
const T_FLY = 345;

function Fly({
  f,
  from,
  to,
  mono,
  card,
  delay,
}: {
  f: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  mono: React.ReactNode;
  card: React.ReactNode;
  delay: number;
}) {
  const p = prog(f, T_FLY + delay, T_FLY + delay + 60, ease.inOut);
  if (f < T_FLY + delay - 1 || p >= 1) {
    return null;
  }
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * 70;
  const a = 1 - prog(f, T_FLY + delay + 18, T_FLY + delay + 42);
  return (
    <div
      style={{
        left: x,
        pointerEvents: "none",
        position: "absolute",
        top: y,
        transform: "translate(-50%,-50%)",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ opacity: a }}>{mono}</div>
      <div
        style={{
          left: "50%",
          opacity: 1 - a,
          position: "absolute",
          top: "50%",
          transform: "translate(-50%,-50%)",
        }}
      >
        {card}
      </div>
    </div>
  );
}

function Terminal({ f }: { f: number }) {
  const cmd = typed(CURL, f, 36, 1.6);
  const cmdLines = cmd.split("\n");
  const typing = f < 150;
  const jsonCount = Math.max(
    0,
    Math.min(JSON_LINES.length, Math.floor((f - 172) / 7) + 1)
  );
  const lit = prog(f, 300, 320);
  const hot = new Set([1, 5, 6, 7, 9]);
  const delayOf: Record<number, number> = { 1: 0, 5: 16, 6: 8, 7: 24, 9: 16 };
  return (
    <div
      style={{
        background: C.nightRaised,
        borderRadius: 22,
        boxShadow: "0 30px 80px rgba(0,0,0,.45), 0 0 0 1.5px #2a2e3d",
        height: TERM.h,
        left: TERM.x,
        overflow: "hidden",
        position: "absolute",
        top: TERM.y,
        width: TERM.w,
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 10,
          height: 48,
          paddingLeft: 22,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              background: "#2a2e3d",
              borderRadius: 7,
              height: 14,
              width: 14,
            }}
          />
        ))}
        <div
          style={{
            color: C.nightSoft,
            fontFamily: F.ui,
            fontSize: 20,
            marginLeft: 18,
          }}
        >
          terminal
        </div>
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: FS,
          left: 32,
          lineHeight: `${LH}px`,
          position: "absolute",
          top: 74,
          whiteSpace: "pre",
        }}
      >
        {cmdLines.map((l, i) => (
          <div key={i} style={{ color: C.nightInk }}>
            {i === 0 ? <span style={{ color: C.nightIndigo }}>$ </span> : "  "}
            {l}
            {typing && i === cmdLines.length - 1 ? (
              <Caret f={f} color={C.nightInk} height={FS} solid />
            ) : null}
          </div>
        ))}
        {f >= 150 && f < 172 ? (
          <div
            style={{
              color: C.nightSoft,
              fontSize: 20,
              position: "absolute",
              right: 0,
              top: 0,
            }}
          >
            ↵
          </div>
        ) : null}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: FS,
          left: 32,
          lineHeight: `${LH}px`,
          position: "absolute",
          top: JSON_TOP - TERM.y,
          whiteSpace: "pre",
        }}
      >
        {JSON_LINES.slice(0, jsonCount).map((parts, i) => {
          const isHot = hot.has(i);
          const flown = f >= T_FLY + (delayOf[i] ?? 0) - 1 ? 1 : 0;
          return (
            <div
              key={i}
              style={{
                background: isHot
                  ? `rgba(181,194,239,${0.1 * lit * (1 - flown)})`
                  : "transparent",
                margin: "0 -32px",
                padding: "0 32px",
                ...rise(f, 172 + i * 7, 8, 10),
                opacity:
                  Number(rise(f, 172 + i * 7, 8, 10).opacity ?? 1) *
                  (isHot ? 1 - flown : 1),
              }}
            >
              {parts.map((p, j) => (
                <span
                  key={j}
                  style={
                    p.k === "arabic"
                      ? {
                          color: colour(p.k),
                          direction: "rtl",
                          fontFamily: F.arabic,
                          fontSize: FS + 6,
                          unicodeBidi: "isolate",
                        }
                      : { color: colour(p.k) }
                  }
                >
                  {p.k === "arabic" ? `"${p.t}"` : p.t}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Browser({ f }: { f: number }) {
  const cardIn = prog(f, 378, 400);
  return (
    <div
      style={{
        background: C.raised,
        borderRadius: 22,
        boxShadow: "0 30px 70px rgba(16,20,40,.16), 0 0 0 1.5px #c9cedc",
        height: 860,
        left: 210,
        overflow: "hidden",
        position: "absolute",
        top: 110,
        width: 1500,
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: C.wash,
          display: "flex",
          height: 64,
          paddingLeft: 24,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              background: C.line,
              borderRadius: 7,
              height: 14,
              marginRight: 10,
              width: 14,
            }}
          />
        ))}
        <div
          style={{
            background: C.raised,
            borderRadius: 18,
            color: C.inkSoft,
            fontFamily: F.ui,
            fontSize: 24,
            height: 38,
            lineHeight: "38px",
            marginLeft: 24,
            textAlign: "center",
            width: 420,
          }}
        >
          your-site.org
        </div>
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          height: 74,
          padding: "0 56px",
        }}
      >
        <div
          style={{
            color: C.inkSoft,
            fontFamily: F.ui,
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          your-site.org
        </div>
        {[110, 90, 130].map((w, i) => (
          <div
            key={i}
            style={{
              background: C.wash,
              borderRadius: 6,
              height: 12,
              marginLeft: i === 0 ? "auto" : 34,
              width: w,
            }}
          />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: C.wash,
            borderRadius: 6,
            height: 14,
            left: 56,
            position: "absolute",
            top: 720 + i * 34,
            width: [520, 430, 480][i],
          }}
        />
      ))}
      <div
        style={{
          background: C.wash,
          borderRadius: 6,
          height: 14,
          left: 56,
          position: "absolute",
          top: 172,
          width: 340,
        }}
      />
      <div
        style={{
          background: C.wash,
          borderRadius: 6,
          height: 14,
          left: 56,
          position: "absolute",
          top: 202,
          width: 260,
        }}
      />
      {/* the card, placed in page space (canvas minus browser origin) */}
      <div
        style={{
          background: C.indigo,
          backgroundImage: clothTile(C.cotton, 0.09, 88),
          borderRadius: 22,
          height: CARD.h,
          left: CARD.x - 210,
          opacity: cardIn,
          position: "absolute",
          top: CARD.y - 110,
          transform: `scale(${0.97 + cardIn * 0.03})`,
          width: CARD.w,
        }}
      >
        <div
          style={{
            color: C.nightIndigo,
            fontFamily: F.ui,
            fontSize: 22,
            fontWeight: 500,
            left: 0,
            letterSpacing: "0.12em",
            position: "absolute",
            right: 0,
            textAlign: "center",
            textTransform: "uppercase",
            top: 34,
          }}
        >
          Verse of the day
        </div>
        {[
          [
            DEST.arabic,
            prog(f, 393, 405),
            <div
              key="a"
              dir="rtl"
              style={{
                color: C.cotton,
                fontFamily: F.arabic,
                fontSize: 70,
                lineHeight: 1.9,
              }}
            >
              {VERSE.arabic}
            </div>,
          ],
          [
            DEST.tr,
            prog(f, 401, 413),
            <div
              key="t"
              style={{ color: C.cotton, fontFamily: F.text, fontSize: 38 }}
            >
              {VERSE.translation}
            </div>,
          ],
          [
            DEST.ref,
            prog(f, 409, 421),
            <div
              key="r"
              style={{
                color: C.nightIndigo,
                fontFamily: F.ui,
                fontSize: 28,
                fontWeight: 500,
              }}
            >
              {SURAH_NAME} {VERSE.verseKey}
            </div>,
          ],
          [
            DEST.credit,
            prog(f, 417, 429),
            <div
              key="c"
              style={{ color: C.nightIndigo, fontFamily: F.ui, fontSize: 23 }}
            >
              {CREDIT}
            </div>,
          ],
        ].map(([d, p, node], i) => (
          <div
            key={i}
            style={{
              left: (d as { x: number }).x - CARD.x,
              opacity: p as number,
              position: "absolute",
              top: (d as { y: number }).y - CARD.y,
              transform: "translate(-50%,-50%)",
              whiteSpace: "nowrap",
            }}
          >
            {node as React.ReactNode}
          </div>
        ))}
      </div>
    </div>
  );
}

function Caption({
  children,
  from,
  to,
  light,
}: {
  children: string;
  from: number;
  to: number;
  light: boolean;
}) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        ...beat(f, from, to),
        left: 0,
        position: "absolute",
        right: 0,
        textAlign: "center",
        top: 36,
      }}
    >
      <Headline size={68} color={light ? C.indigoDeep : C.nightInk}>
        {children}
      </Headline>
    </div>
  );
}

function Verify({ f }: { f: number }) {
  const p = prog(f, 640, 668) * (1 - prog(f, 756, 776));
  const done = prog(f, 716, 728);
  const press = prog(f, 706, 712);
  return (
    <div
      style={{
        background: C.raised,
        border: `1.5px solid ${C.line}`,
        borderRadius: 22,
        height: 420,
        left: 1060,
        opacity: p,
        padding: 44,
        position: "absolute",
        top: 330,
        transform: `translateY(${(1 - p) * 24}px)`,
        width: 800,
      }}
    >
      <div style={{ opacity: 1 - done, position: "absolute", inset: 44 }}>
        <div
          style={{
            color: C.ink,
            fontFamily: F.ui,
            fontSize: 34,
            lineHeight: 1.4,
          }}
        >
          Show us that you run <b style={{ fontWeight: 600 }}>your-site.org</b>{" "}
          by doing one of these. Then choose Verify.
        </div>
        <div
          style={{
            background: C.indigo,
            borderRadius: 14,
            color: C.cotton,
            fontFamily: F.ui,
            fontSize: 32,
            fontWeight: 600,
            left: 0,
            padding: "16px 44px",
            position: "absolute",
            top: 232,
            transform: `scale(${1 - press * 0.04})`,
          }}
        >
          Verify
        </div>
      </div>
      <div style={{ opacity: done, position: "absolute", inset: 44 }}>
        <div style={{ color: C.inkSoft, fontFamily: F.ui, fontSize: 30 }}>
          Your key for your-site.org
        </div>
        <div
          style={{
            background: C.wash,
            borderRadius: 12,
            color: C.indigoDeep,
            fontFamily: MONO,
            fontSize: 32,
            marginTop: 24,
            padding: "20px 26px",
          }}
        >
          YOUR_KEY
        </div>
      </div>
    </div>
  );
}

export function CurlAVerse({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  const day = prog(f, 360, 440, ease.inOut);
  const end = prog(f, 770, 792);
  const shrink = prog(f, 600, 650, ease.inOut);
  const sc = 1 - 0.38 * shrink;
  const termOut = prog(f, 352, 376, ease.inOut);
  const browserVis = prog(f, 378, 398) * (1 - prog(f, 756, 776));
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(x) =>
            interpolate(
              x,
              [0, 24, CURLAVERSE_DURATION - 60, CURLAVERSE_DURATION],
              [0, 0.8, 0.8, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            )
          }
        />
      ) : null}
      <AbsoluteFill style={{ backgroundColor: C.cotton, opacity: day }} />
      <AbsoluteFill
        style={{
          backgroundImage: clothTile(C.indigo, 0.05, 120),
          opacity: day,
        }}
      />

      {f < 440 ? (
        <div
          style={{
            inset: 0,
            opacity: 1 - termOut,
            position: "absolute",
            transform: `translateY(${termOut * 40}px)`,
          }}
        >
          <div
            style={{ inset: 0, opacity: prog(f, 0, 18), position: "absolute" }}
          >
            <Terminal f={f} />
          </div>
        </div>
      ) : null}

      <Caption from={0} to={100} light={false}>
        A verse a day, for your site.
      </Caption>

      <div
        style={{
          inset: 0,
          opacity: browserVis,
          position: "absolute",
          transform: `translate(${-60 * shrink * 1}px, ${232 * shrink}px) scale(${sc})`,
          transformOrigin: "0 0",
        }}
      >
        <Browser f={f} />
      </div>

      <Fly
        delay={0}
        f={f}
        from={{ x: BODY_X + CH * 12 + 130, y: jsonY(1) }}
        to={DEST.arabic}
        mono={
          <span
            style={{
              color: C.nightInk,
              direction: "rtl",
              fontFamily: F.arabic,
              fontSize: FS + 6,
            }}
          >
            {VERSE.arabic}
          </span>
        }
        card={
          <span
            style={{
              color: C.cotton,
              fontFamily: F.arabic,
              fontSize: 70,
              lineHeight: 1.9,
            }}
          >
            {VERSE.arabic}
          </span>
        }
      />
      <Fly
        delay={8}
        f={f}
        from={{ x: BODY_X + CH * 30, y: jsonY(6) }}
        to={DEST.tr}
        mono={
          <span
            style={{
              background: C.nightRaised,
              borderRadius: 8,
              color: C.nightInk,
              fontFamily: MONO,
              fontSize: FS,
              padding: "4px 12px",
            }}
          >
            &quot;{VERSE.translation}&quot;
          </span>
        }
        card={
          <span style={{ color: C.cotton, fontFamily: F.text, fontSize: 38 }}>
            {VERSE.translation}
          </span>
        }
      />
      <Fly
        delay={16}
        f={f}
        from={{ x: BODY_X + CH * 21, y: jsonY(5) }}
        to={DEST.ref}
        mono={
          <span
            style={{
              background: C.nightRaised,
              borderRadius: 8,
              color: C.nightInk,
              fontFamily: MONO,
              fontSize: FS,
              padding: "4px 12px",
            }}
          >
            &quot;{SURAH_NAME}&quot; · &quot;{VERSE.verseKey}&quot;
          </span>
        }
        card={
          <span
            style={{
              color: C.nightIndigo,
              fontFamily: F.ui,
              fontSize: 28,
              fontWeight: 500,
            }}
          >
            {SURAH_NAME} {VERSE.verseKey}
          </span>
        }
      />
      <Fly
        delay={24}
        f={f}
        from={{ x: BODY_X + CH * 48, y: jsonY(7) }}
        to={DEST.credit}
        mono={
          <span
            style={{
              background: C.nightRaised,
              borderRadius: 8,
              color: C.nightInk,
              fontFamily: MONO,
              fontSize: FS - 2,
              padding: "4px 12px",
            }}
          >
            &quot;{CREDIT}&quot;
          </span>
        }
        card={
          <span
            style={{ color: C.nightIndigo, fontFamily: F.ui, fontSize: 23 }}
          >
            {CREDIT}
          </span>
        }
      />

      <Caption from={456} to={596} light>
        Free for non-commercial use.
      </Caption>
      <Caption from={606} to={766} light>
        Get a key by verifying your domain.
      </Caption>
      <Verify f={f} />

      {f >= 770 ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: end,
          }}
        >
          <Mark frame={f - 770} size={190} />
          <div
            style={{
              ...rise(f, 784),
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              marginTop: 38,
            }}
          >
            MindfulVerse for developers
          </div>
          <div
            style={{
              ...rise(f, 796),
              color: C.inkSoft,
              fontFamily: F.ui,
              fontSize: 42,
              fontWeight: 500,
              marginTop: 14,
            }}
          >
            mindfulverse.vercel.app/developers
          </div>
          {withNasheed ? (
            <Credit
              style={{ ...rise(f, 806), bottom: 48, position: "absolute" }}
            >
              {NASHEED_CREDIT}
            </Credit>
          ) : null}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}
