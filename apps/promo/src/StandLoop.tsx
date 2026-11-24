// The exhibition stand loop: six silent scenes that run for ever, in
// landscape (1920x1080) and portrait (1080x1920). A small QR code for the site
// stays in a corner throughout. The last scene hands back to the first inside
// the timeline, so the final frame runs straight into frame 0. Screens are
// captures of the running app with invented test data
// (scripts/capture-three.mjs).
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import layout from "../public/screens/three/layout.json";
import { bandTile } from "./brand";
import {
  C,
  Credit,
  F,
  Fonts,
  Mark,
  Phone,
  Screen,
  TRANSLATION_CREDIT,
  Touch,
  ease,
  prog,
  rise,
} from "./kit";
import {
  REFLECTION,
  Ring,
  SITE,
  Swap,
  TypedField,
  shot,
  startsOf,
  totalOf,
} from "./threeKit";

export const STAND_FPS = 30;

/** Scene lengths in frames, storyboard scenes 1 to 6. */
const LENGTHS = [120, 150, 150, 150, 150, 210] as const;
const STARTS = startsOf(LENGTHS);
export const STAND_DURATION = totalOf(LENGTHS);

/** Dark modules of the code, one unit each (25x25, version 2). */
const QR_PATH =
  "M0 0h7v1h-7zM8 0h1v1h-1zM12 0h2v1h-2zM18 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM14 1h1v1h-1zM16 1h1v1h-1zM18 1h1v1h-1zM24 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM10 2h1v1h-1zM13 2h1v1h-1zM15 2h1v1h-1zM18 2h1v1h-1zM20 2h3v1h-3zM24 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM9 3h1v1h-1zM12 3h2v1h-2zM16 3h1v1h-1zM18 3h1v1h-1zM20 3h3v1h-3zM24 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h1v1h-1zM11 4h1v1h-1zM16 4h1v1h-1zM18 4h1v1h-1zM20 4h3v1h-3zM24 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h5v1h-5zM16 5h1v1h-1zM18 5h1v1h-1zM24 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h7v1h-7zM10 7h4v1h-4zM15 7h2v1h-2zM0 8h1v1h-1zM3 8h9v1h-9zM14 8h2v1h-2zM17 8h1v1h-1zM20 8h1v1h-1zM22 8h3v1h-3zM4 9h1v1h-1zM7 9h2v1h-2zM10 9h2v1h-2zM14 9h2v1h-2zM19 9h5v1h-5zM0 10h2v1h-2zM3 10h4v1h-4zM12 10h1v1h-1zM15 10h1v1h-1zM17 10h1v1h-1zM19 10h3v1h-3zM24 10h1v1h-1zM4 11h2v1h-2zM8 11h2v1h-2zM14 11h1v1h-1zM18 11h7v1h-7zM1 12h2v1h-2zM6 12h1v1h-1zM8 12h3v1h-3zM14 12h1v1h-1zM16 12h1v1h-1zM18 12h2v1h-2zM24 12h1v1h-1zM0 13h1v1h-1zM2 13h1v1h-1zM4 13h1v1h-1zM10 13h1v1h-1zM12 13h1v1h-1zM14 13h3v1h-3zM20 13h1v1h-1zM23 13h1v1h-1zM0 14h5v1h-5zM6 14h1v1h-1zM8 14h3v1h-3zM14 14h2v1h-2zM17 14h1v1h-1zM20 14h5v1h-5zM0 15h1v1h-1zM3 15h1v1h-1zM5 15h1v1h-1zM7 15h1v1h-1zM12 15h1v1h-1zM14 15h1v1h-1zM19 15h1v1h-1zM21 15h2v1h-2zM24 15h1v1h-1zM0 16h1v1h-1zM2 16h2v1h-2zM5 16h2v1h-2zM8 16h1v1h-1zM11 16h3v1h-3zM15 16h6v1h-6zM22 16h2v1h-2zM8 17h2v1h-2zM11 17h1v1h-1zM15 17h2v1h-2zM20 17h1v1h-1zM22 17h2v1h-2zM0 18h7v1h-7zM8 18h3v1h-3zM12 18h3v1h-3zM16 18h1v1h-1zM18 18h1v1h-1zM20 18h1v1h-1zM24 18h1v1h-1zM0 19h1v1h-1zM6 19h1v1h-1zM8 19h2v1h-2zM11 19h1v1h-1zM13 19h1v1h-1zM15 19h2v1h-2zM20 19h1v1h-1zM24 19h1v1h-1zM0 20h1v1h-1zM2 20h3v1h-3zM6 20h1v1h-1zM8 20h1v1h-1zM10 20h3v1h-3zM14 20h7v1h-7zM0 21h1v1h-1zM2 21h3v1h-3zM6 21h1v1h-1zM8 21h2v1h-2zM12 21h1v1h-1zM17 21h2v1h-2zM23 21h2v1h-2zM0 22h1v1h-1zM2 22h3v1h-3zM6 22h1v1h-1zM9 22h1v1h-1zM11 22h2v1h-2zM14 22h1v1h-1zM17 22h1v1h-1zM20 22h5v1h-5zM0 23h1v1h-1zM6 23h1v1h-1zM10 23h3v1h-3zM18 23h3v1h-3zM22 23h3v1h-3zM0 24h7v1h-7zM8 24h4v1h-4zM16 24h3v1h-3zM21 24h1v1h-1zM24 24h1v1h-1z";
const QR_MODULES = 25;
const QR_QUIET = 2;
const QR_SPAN = QR_MODULES + QR_QUIET * 2;

/** The code on a white tile, `size` px square including the quiet zone. */
function Qr({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-QR_QUIET} ${-QR_QUIET} ${QR_SPAN} ${QR_SPAN}`}
      shapeRendering="crispEdges"
      style={{ borderRadius: size * 0.04, display: "block", ...style }}
    >
      <rect
        x={-QR_QUIET}
        y={-QR_QUIET}
        width={QR_SPAN}
        height={QR_SPAN}
        fill="#ffffff"
      />
      <path d={QR_PATH} fill={C.indigoDeep} />
    </svg>
  );
}

// ---- The two layouts ----

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Stage {
  align: "left" | "center";
  /** Where the headline sits beside or above the phone. */
  text: Box;
  headline: number;
  phone: { x: number; y: number; w: number; from: "right" | "below" };
  /** The corner code (whole video) and its caption. */
  corner: { x: number; y: number; size: number };
  site: { left: number; top: number; size: number };
  credit: { left: number; top: number };
  /** Scene 1: the mark and the headline. */
  mark: { x: number; y: number; size: number };
  opening: Box & { size: number };
  /** Scene 6: the large code, its headline and the line under it. */
  big: { x: number; y: number; size: number };
  closing: Box & { size: number; sub: number };
}

const LANDSCAPE: Stage = {
  align: "left",
  big: { size: 726, x: 1084, y: 196 },
  closing: { height: 640, left: 110, size: 140, sub: 68, top: 130, width: 950 },
  corner: { size: 198, x: 110, y: 826 },
  credit: { left: 344, top: 950 },
  headline: 120,
  mark: { size: 460, x: 1250, y: 300 },
  opening: { height: 640, left: 110, size: 160, top: 130, width: 1040 },
  phone: { from: "right", w: 560, x: 1220, y: 120 },
  site: { left: 344, size: 46, top: 884 },
  text: { height: 640, left: 110, top: 130, width: 1030 },
};

const PORTRAIT: Stage = {
  align: "center",
  big: { size: 792, x: 144, y: 700 },
  closing: { height: 470, left: 70, size: 140, sub: 64, top: 130, width: 940 },
  corner: { size: 198, x: 70, y: 1672 },
  credit: { left: 304, top: 1796 },
  headline: 110,
  mark: { size: 420, x: 330, y: 420 },
  opening: { height: 420, left: 70, size: 150, top: 930, width: 940 },
  phone: { from: "below", w: 480, x: 300, y: 590 },
  site: { left: 304, size: 46, top: 1730 },
  text: { height: 440, left: 70, top: 110, width: 940 },
};

// ---- Words ----

/** Large type for the back of the room, centred in its box top to bottom. */
function Line({
  box,
  size,
  align,
  children,
  style,
}: {
  box: Box;
  size: number;
  align: Stage["align"];
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        alignItems: align === "left" ? "flex-start" : "center",
        display: "flex",
        flexDirection: "column",
        gap: size * 0.3,
        justifyContent: "center",
        position: "absolute",
        textAlign: align,
        ...box,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const big = (size: number): CSSProperties => ({
  color: C.indigoDeep,
  fontFamily: F.ui,
  fontSize: size,
  fontWeight: 600,
  letterSpacing: "-0.03em",
  lineHeight: 1.06,
  textWrap: "balance",
});

// ---- Scenes (t is the scene's own frame; it runs negative before a cut) ----

interface StandProps {
  t: number;
  s: Stage;
}

function S1Mark({ t, s }: StandProps) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <div style={{ left: s.mark.x, position: "absolute", top: s.mark.y }}>
        <Mark frame={(t + 48) * 1.5} size={s.mark.size} />
      </div>
      <Line box={s.opening} size={s.opening.size} align={s.align}>
        <div style={{ ...big(s.opening.size), ...rise(t, -24, 14) }}>
          Sit with one surah.
        </div>
      </Line>
    </AbsoluteFill>
  );
}

/** One phone scene: the headline, the phone and the translation credit. */
function PhoneScene({
  t,
  s,
  enter = false,
  words,
  children,
}: StandProps & { enter?: boolean; words: string; children: ReactNode }) {
  const p = enter ? prog(t, -4, 20, ease.drawer) : 1;
  const dx = s.phone.from === "right" ? (1 - p) * 760 : 0;
  const dy = s.phone.from === "below" ? (1 - p) * 520 : 0;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Line box={s.text} size={s.headline} align={s.align}>
        <div style={{ ...big(s.headline), ...rise(t, 0, 14) }}>{words}</div>
      </Line>
      <Phone
        x={s.phone.x}
        y={s.phone.y}
        width={s.phone.w}
        style={{ transform: `translate(${dx}px, ${dy}px)` }}
      >
        {children}
      </Phone>
      <Credit
        style={{
          fontSize: 26,
          left: s.credit.left,
          position: "absolute",
          top: s.credit.top,
        }}
      >
        {TRANSLATION_CREDIT}
      </Credit>
    </AbsoluteFill>
  );
}

function S2Verse({ t, s }: StandProps) {
  return (
    <PhoneScene t={t} s={s} enter words="Verse by verse, with Ibn Kathir">
      <Swap a="verse" b="verse-commentary" t={t} at={64} dur={10} />
      <Ring t={t} at={30} until={56} rect={layout.commentaryOpen} pad={5} />
      <Touch f={t} at={52} rect={layout.commentaryOpen} />
    </PhoneScene>
  );
}

function S3Write({ t, s }: StandProps) {
  const TYPE_AT = 30;
  return (
    <PhoneScene t={t} s={s} words="Write what it says to you">
      <Swap a="reflect-empty" b="reflect-typed" t={t} at={112} />
      {t >= TYPE_AT && t < 120 ? (
        <TypedField
          rect={layout.reflectField}
          text={REFLECTION}
          t={t}
          from={TYPE_AT}
          perFrame={0.5}
        />
      ) : null}
    </PhoneScene>
  );
}

function S4FollowUp({ t, s }: StandProps) {
  const YES_AT = 88;
  return (
    <PhoneScene t={t} s={s} words="A week later, we ask if you did it">
      <Swap a="home-followup" b="home-followup-yes" t={t} at={YES_AT + 12} />
      <Ring t={t} at={26} until={YES_AT + 8} rect={layout.followup} pad={3} />
      <Touch f={t} at={YES_AT} rect={layout.followupYes} />
    </PhoneScene>
  );
}

function S5Circle({ t, s }: StandProps) {
  return (
    <PhoneScene t={t} s={s} words="Read together in circles">
      <Screen src={shot("home-circle")} />
      <Ring t={t} at={26} until={78} rect={layout.homeLead} pad={3} />
      <Ring t={t} at={84} rect={layout.homeCount} pad={6} />
    </PhoneScene>
  );
}

/** Frames before the end of scene 6 when its hand-back to scene 1 starts. */
const HAND_BACK = 60;

const SCAN_LEN = LENGTHS[5];
const FLY_FROM = SCAN_LEN - HAND_BACK + 2;
const FLY_TO = FLY_FROM + 22;

/** The large code. As scene 6 leaves it settles into the corner one. */
function BigQr({ t, s }: StandProps) {
  const out = prog(t, FLY_FROM, FLY_TO, ease.inOut);
  const inP = prog(t, 4, 24, ease.drawer);
  const size = s.big.size + (s.corner.size - s.big.size) * out;
  return (
    <div
      style={{
        boxShadow: `0 30px 80px rgba(16,20,40,${0.2 * (1 - out)})`,
        left: s.big.x + (s.corner.x - s.big.x) * out,
        opacity: inP,
        position: "absolute",
        top: s.big.y + (s.corner.y - s.big.y) * out,
        transform: `scale(${0.9 + inP * 0.1})`,
      }}
    >
      <Qr size={size} />
    </div>
  );
}

function S6Scan({ t, s }: StandProps) {
  const wordsOut = prog(
    t,
    SCAN_LEN - HAND_BACK,
    SCAN_LEN - HAND_BACK + 10,
    ease.inOut
  );
  const leave: CSSProperties = {
    opacity: 1 - wordsOut,
    transform: `translateY(${-wordsOut * 24}px)`,
  };
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Line box={s.closing} size={s.closing.size} align={s.align} style={leave}>
        <div style={{ ...big(s.closing.size), ...rise(t, 0, 14) }}>
          Scan to begin.
        </div>
        <div
          style={{
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: s.closing.sub,
            fontWeight: 600,
            ...rise(t, 14, 14),
          }}
        >
          Free. No ads. No AI.
        </div>
      </Line>
      {t < FLY_FROM ? <BigQr t={t} s={s} /> : null}
    </AbsoluteFill>
  );
}

/** The large code on its way to the corner, above the site caption it
 *  crosses. Once it lands it is the corner code, so it is dropped. */
function FlyingQr({ s }: { s: Stage }) {
  const t = useCurrentFrame() - STARTS[5];
  return t >= FLY_FROM && t < FLY_TO ? <BigQr t={t} s={s} /> : null;
}

const SCENES = [S1Mark, S2Verse, S3Write, S4FollowUp, S5Circle, S6Scan];

/** When each scene fades in over the one before, relative to its own start.
 *  Scene 1 comes in early, while scene 6 is still handing back, so frame 0
 *  already holds the mark and the headline. */
const FADE_IN: [number, number][] = [
  [-50, -42],
  [-8, 8],
  [-8, 8],
  [-8, 8],
  [-8, 8],
  [-8, 8],
];
const EARLIEST = 60;

/** A scene's own frame at `f`, wrapping the end of the loop back to the start. */
function localFrame(f: number, start: number) {
  const t = f - start;
  return t >= STAND_DURATION - EARLIEST ? t - STAND_DURATION : t;
}

function Scenes({ s }: { s: Stage }) {
  const f = useCurrentFrame();
  const live = SCENES.map((SceneAt, i) => {
    const next = (i + 1) % SCENES.length;
    const t = localFrame(f, STARTS[i]);
    const [fadeFrom, fadeTo] = FADE_IN[i];
    const until = LENGTHS[i] + FADE_IN[next][1];
    return { SceneAt, fadeFrom, fadeTo, i, t, until };
  }).filter((x) => x.t >= x.fadeFrom && x.t < x.until);
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {live.map(({ SceneAt, fadeFrom, fadeTo, i, t }) => (
        <AbsoluteFill
          key={`scene-${i}`}
          style={{
            opacity: prog(t, fadeFrom, fadeTo, ease.inOut),
            // The scene that started most recently goes on top.
            zIndex: STAND_DURATION - t,
          }}
        >
          <SceneAt t={t} s={s} />
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
}

/** The band along the top and the corner code with the site under it:
 *  the same in every frame. */
function Furniture({ s }: { s: Stage }) {
  return (
    <>
      <div
        style={{
          backgroundImage: bandTile(C.indigo, C.cotton, 36),
          backgroundRepeat: "repeat-x",
          height: 36,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      />
      <Qr
        size={s.corner.size}
        style={{ left: s.corner.x, position: "absolute", top: s.corner.y }}
      />
      <div
        style={{
          color: C.indigo,
          fontFamily: F.ui,
          fontSize: s.site.size,
          fontWeight: 600,
          left: s.site.left,
          letterSpacing: "-0.01em",
          position: "absolute",
          top: s.site.top,
        }}
      >
        {SITE}
      </div>
    </>
  );
}

export function StandLoop({ vertical }: { vertical: boolean }) {
  const s = vertical ? PORTRAIT : LANDSCAPE;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      <Scenes s={s} />
      <Furniture s={s} />
      <FlyingQr s={s} />
    </AbsoluteFill>
  );
}
