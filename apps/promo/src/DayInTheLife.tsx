// "A day in the life": a 9:16 promo built on real MindfulVerse screens.
// Every screen inside the phone is a capture of the running web app
// (scripts/capture-screens.mjs); only the typing, the taps and the chip that
// grows into its verse are drawn on top, at the positions the capture measured.
// Dawn, a morning check-in; midday, the reader; night, one question and the journal.
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  interpolateColors,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { MARK_RECTS, markBounds } from "../../../packages/core/brand";
import layout from "../public/screens/layout.json";
import { C, F, fontCss } from "./brand";

export const DAY_FPS = 30;

/** Story beats in frames. */
const T = {
  // Hook
  hookTime: 6,
  hookLine: 34,
  hookOut: 72,
  phoneIn: 76,
  // Morning
  feel: 150,
  tap: 196,
  morph: 210,
  write: 300,
  zoomIn1: 304,
  type1: 322,
  typed1: 380,
  save1: 384,
  kept1: 392,
  zoomOut1: 432,
  // Midday
  noon: 440,
  readTitle: 448,
  readArabic: 520,
  // Night
  night: 600,
  question: 608,
  write2: 652,
  zoomIn2: 654,
  type2: 668,
  typed2: 702,
  save2: 706,
  kept2: 714,
  zoomOut2: 736,
  journal: 742,
  // CTA
  cta: 832,
};
export const DAY_DURATION = 960;

const REFLECTION = "So much to be thankful for this morning. Alhamdulillah.";
const NIGHT_NOTE = "Every morning is a new mercy.";

const out = Easing.bezier(0.23, 1, 0.32, 1);
const inOut = Easing.bezier(0.77, 0, 0.175, 1);
const SPRING = { damping: 20, mass: 1, stiffness: 300 };

function prog(frame: number, from: number, to: number, ease = out) {
  return interpolate(frame, [from, to], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function rise(
  frame: number,
  start: number,
  dur = 14,
  dist = 28
): CSSProperties {
  const p = prog(frame, start, start + dur);
  return {
    filter: `blur(${(1 - p) * 6}px)`,
    opacity: p,
    transform: `translateY(${(1 - p) * dist}px)`,
  };
}

/** In at `from`, out at `to` (a short fade up and away). */
function beat(frame: number, from: number, to: number): CSSProperties {
  const inP = prog(frame, from, from + 14);
  const outP = prog(frame, to - 8, to, inOut);
  return {
    filter: `blur(${(1 - inP) * 6 + outP * 4}px)`,
    opacity: inP * (1 - outP),
    transform: `translateY(${(1 - inP) * 26 - outP * 14}px)`,
  };
}

// Sky: dawn, day, night.
const SKY_AT = [0, 400, 470, 580, 640, DAY_DURATION];
const SKY_TOP = [
  "#dfe2f2",
  "#e4e6f3",
  "#c7d3f4",
  "#c7d3f4",
  "#0e1018",
  "#0e1018",
];
const SKY_LOW = ["#f6e3d8", "#f3e8e2", C.cotton, C.cotton, C.night, "#161b33"];
const INK_AT = [0, 590, 630];
const sky = (f: number, stops: string[]) => interpolateColors(f, SKY_AT, stops);

function Sky() {
  const f = useCurrentFrame();
  const night = prog(f, 590, 640, inOut);
  // A low dawn sun climbs to midday, then gives way to a small moon.
  const sunY = interpolate(f, [0, 470, 590], [760, 250, 200], {
    easing: out,
    extrapolateRight: "clamp",
  });
  const stars = Array.from({ length: 34 }, (_, i) => ({
    r: 1.6 + (i % 3) * 0.9,
    tw: 0.55 + 0.45 * Math.sin(f / 9 + i * 1.7),
    x: (i * 263) % 1080,
    y: 40 + ((i * 151) % 400),
  }));
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(to bottom, ${sky(f, SKY_TOP)}, ${sky(f, SKY_LOW)})`,
      }}
    >
      <div
        style={{
          background: `radial-gradient(circle, ${interpolateColors(f, [0, 440], ["#fbd9c1", "#fff6e6"])}cc 0%, transparent 62%)`,
          borderRadius: 260,
          height: 520,
          left: 930 - 260,
          opacity: 1 - night,
          position: "absolute",
          top: sunY - 260,
          width: 520,
        }}
      />
      <div
        style={{
          borderRadius: 32,
          boxShadow: `inset -16px 8px 0 0 ${C.nightIndigo}`,
          height: 64,
          left: 900,
          opacity: night * 0.9,
          position: "absolute",
          top: 150,
          transform: "rotate(-20deg)",
          width: 64,
        }}
      />
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            background: C.nightInk,
            borderRadius: s.r,
            height: s.r * 2,
            left: s.x,
            opacity: night * 0.5 * s.tw,
            position: "absolute",
            top: s.y,
            width: s.r * 2,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

// Captions above the phone.
const CAP_X = 96;

function Label({
  f,
  from,
  to,
  children,
}: {
  f: number;
  from: number;
  to: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: CAP_X,
        top: 104,
        ...beat(f, from, to),
        fontFamily: F.ui,
        fontWeight: 600,
        fontSize: 46,
        letterSpacing: "-0.01em",
        color: interpolateColors(f, INK_AT, [
          C.indigo,
          C.indigo,
          C.nightIndigo,
        ]),
      }}
    >
      {children}
    </div>
  );
}

function Caption({
  f,
  from,
  to,
  size = 74,
  children,
}: {
  f: number;
  from: number;
  to: number;
  size?: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: CAP_X,
        right: CAP_X,
        top: 176,
        ...beat(f, from, to),
        fontFamily: F.ui,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: "-0.03em",
        textWrap: "balance",
        color: interpolateColors(f, INK_AT, [
          C.indigoDeep,
          C.indigoDeep,
          C.nightInk,
        ]),
      }}
    >
      {children}
    </div>
  );
}

function Hook() {
  const f = useCurrentFrame();
  const away = prog(f, T.hookOut - 10, T.hookOut + 4, inOut);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        opacity: 1 - away,
        padding: "0 96px",
        transform: `translateY(${-away * 60}px)`,
      }}
    >
      <div
        style={{
          ...rise(f, T.hookTime, 18, 30),
          color: C.indigo,
          fontFamily: F.ui,
          fontSize: 168,
          fontWeight: 600,
          letterSpacing: "-0.04em",
        }}
      >
        7:12 am.
      </div>
      <div
        style={{
          ...rise(f, T.hookLine, 18, 30),
          color: C.indigoDeep,
          fontFamily: F.ui,
          fontSize: 96,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          marginTop: 24,
          textWrap: "balance",
        }}
      >
        Before the day gets loud…
      </div>
    </AbsoluteFill>
  );
}

// The phone. Screen space is the capture's CSS pixels (390 wide); a status
// bar sits above the page as on a real phone.
const VW = layout.viewport.w;
const VH = layout.viewport.h;
const STATUS = 30;
const PHONE_W = 620;
const BEZEL = 12;
const K = (PHONE_W - BEZEL * 2) / VW;
const SCREEN_H = (VH + STATUS) * K;
const PHONE_H = SCREEN_H + BEZEL * 2;
const PHONE_X = (1080 - PHONE_W) / 2;
const PHONE_Y = 1920 - PHONE_H - 64;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A point in screen space as a point on the 1080x1920 canvas (unzoomed). */
function toCanvas(x: number, y: number): [number, number] {
  return [PHONE_X + BEZEL + x * K, PHONE_Y + BEZEL + (STATUS + y) * K];
}
const centre = (r: Rect) => toCanvas(r.x + r.w / 2, r.y + r.h / 2);

interface Shot {
  src: string;
  at: number;
  enter: "slide" | "fade" | "cut";
  dark?: boolean;
  time: string;
}

const SHOTS: Shot[] = [
  { at: 0, enter: "cut", src: "home", time: "7:12" },
  { at: T.feel, enter: "slide", src: "checkin-feel", time: "7:12" },
  { at: T.morph + 2, enter: "fade", src: "checkin-verse", time: "7:13" },
  { at: T.write, enter: "slide", src: "checkin-write", time: "7:13" },
  { at: T.typed1, enter: "cut", src: "checkin-typed", time: "7:14" },
  { at: T.kept1, enter: "cut", src: "checkin-kept", time: "7:14" },
  { at: T.readTitle, enter: "slide", src: "read-title", time: "1:05" },
  { at: T.readArabic, enter: "slide", src: "read-arabic", time: "1:05" },
  {
    at: T.question,
    dark: true,
    enter: "slide",
    src: "tadabbur-question",
    time: "9:40",
  },
  {
    at: T.write2,
    dark: true,
    enter: "cut",
    src: "tadabbur-write",
    time: "9:40",
  },
  {
    at: T.typed2,
    dark: true,
    enter: "cut",
    src: "tadabbur-typed",
    time: "9:41",
  },
  { at: T.kept2, dark: true, enter: "cut", src: "tadabbur-kept", time: "9:41" },
  { at: T.journal, dark: true, enter: "slide", src: "journal", time: "9:41" },
];

function Page({
  shot,
  x = 0,
  opacity = 1,
}: {
  shot: Shot;
  x?: number;
  opacity?: number;
}) {
  const bg = shot.dark ? C.night : C.cotton;
  const ink = shot.dark ? C.nightInk : C.ink;
  return (
    <div
      style={{
        background: bg,
        height: VH + STATUS,
        left: 0,
        opacity,
        position: "absolute",
        top: 0,
        transform: `translateX(${x}px)`,
        width: VW * 1.3,
      }}
    >
      <div
        style={{
          alignItems: "center",
          boxSizing: "border-box",
          color: ink,
          display: "flex",
          fontFamily: F.ui,
          fontSize: 14,
          fontWeight: 600,
          height: STATUS,
          justifyContent: "space-between",
          padding: "4px 26px 0",
          width: VW,
        }}
      >
        <span>{shot.time}</span>
        <span style={{ alignItems: "center", display: "flex", gap: 6 }}>
          <svg width="17" height="11" viewBox="0 0 17 11">
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={i * 4.5}
                y={8 - i * 2.6}
                width="3"
                height={3 + i * 2.6}
                rx="0.8"
                fill={ink}
              />
            ))}
          </svg>
          <span
            style={{
              border: `1.4px solid ${ink}`,
              borderRadius: 3,
              boxSizing: "border-box",
              display: "flex",
              height: 11,
              padding: 1.4,
              width: 22,
            }}
          >
            <span style={{ background: ink, borderRadius: 1, width: "72%" }} />
          </span>
        </span>
      </div>
      <Img
        src={staticFile(`screens/${shot.src}.png`)}
        style={{ display: "block", height: VH, width: VW }}
      />
    </div>
  );
}

function Screens({ f, fps }: { f: number; fps: number }) {
  let i = 0;
  SHOTS.forEach((s, j) => {
    if (f >= s.at) {
      i = j;
    }
  });
  const cur = SHOTS[i];
  const prev = SHOTS[i - 1];
  const t = f - cur.at;
  if (!prev || cur.enter === "cut") {
    return <Page shot={cur} />;
  }
  if (cur.enter === "fade") {
    const p = prog(f, cur.at, cur.at + 14);
    return (
      <>
        <Page shot={prev} />
        <Page shot={cur} opacity={p} />
      </>
    );
  }
  const p = spring({ config: SPRING, fps, frame: t });
  return (
    <>
      <Page shot={prev} x={-p * VW * 0.28} />
      <div
        style={{
          background: "#000",
          inset: 0,
          opacity: Math.min(p, 1) * 0.18,
          position: "absolute",
        }}
      />
      <Page shot={cur} x={(1 - p) * VW} />
    </>
  );
}

/** A fingertip: a soft disc that lands, presses and lifts. */
function Touch({ f, at, rect }: { f: number; at: number; rect: Rect }) {
  const land = prog(f, at, at + 8);
  const lift = prog(f, at + 12, at + 26);
  if (f < at || lift >= 1) {
    return null;
  }
  return (
    <div
      style={{
        background: C.indigo,
        border: `2px solid ${C.cotton}`,
        borderRadius: 22,
        height: 44,
        left: rect.x + rect.w / 2 - 22,
        opacity: land * 0.32 * (1 - lift),
        position: "absolute",
        top: STATUS + rect.y + rect.h / 2 - 22,
        transform: `scale(${0.7 + land * 0.3 + lift * 0.5})`,
        width: 44,
      }}
    />
  );
}

/** The tapped "Grateful" chip fills, then grows into the first verse card. */
function ChipToCard({ f, fps }: { f: number; fps: number }) {
  const chip = layout.grateful;
  const card = layout.gratefulCard;
  if (f < T.tap + 6 || f > T.morph + 20) {
    return null;
  }
  const fill = prog(f, T.tap + 6, T.tap + 12);
  const m = Math.min(spring({ config: SPRING, fps, frame: f - T.morph }), 1.04);
  const lerp = (a: number, b: number) => a + (b - a) * m;
  const fade = prog(f, T.morph + 6, T.morph + 20);
  const label = 1 - prog(f, T.morph, T.morph + 6);
  return (
    <div
      style={{
        background: interpolateColors(
          Math.min(m, 1),
          [0, 1],
          [C.indigo, card.background]
        ),
        borderRadius: interpolate(m, [0, 1], [22, 4], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        boxSizing: "border-box",
        color: C.cotton,
        display: "grid",
        fontFamily: F.ui,
        fontSize: chip.size,
        fontWeight: 400,
        height: lerp(chip.h, card.h),
        left: lerp(chip.x, card.x),
        opacity: fill * (1 - fade),
        placeItems: "center",
        position: "absolute",
        top: STATUS + lerp(chip.y, card.y),
        width: lerp(chip.w, card.w),
      }}
    >
      <span style={{ opacity: label }}>Grateful</span>
    </div>
  );
}

/** Text typed into a real textarea, set in its own measured box and face. */
function Typing({
  f,
  from,
  until,
  box,
  text,
}: {
  f: number;
  from: number;
  until: number;
  box: typeof layout.checkinBox;
  text: string;
}) {
  if (f < from - 2 || f >= until) {
    return null;
  }
  const n = Math.max(0, Math.min(text.length, Math.floor((f - from) * 1)));
  const caretOn = Math.floor(f / 8) % 2 === 0 || n < text.length;
  const [pt, pr, , pl] = box.padding;
  return (
    <div
      style={{
        background: box.background,
        boxSizing: "border-box",
        color: box.color,
        fontFamily: "OutfitText, sans-serif",
        fontSize: box.size,
        height: box.h - box.border * 2,
        left: box.x + box.border,
        lineHeight: box.lineHeight,
        padding: `${pt}px ${pr}px 0 ${pl}px`,
        position: "absolute",
        top: STATUS + box.y + box.border,
        whiteSpace: "pre-wrap",
        width: box.w - box.border * 2,
      }}
    >
      {text.slice(0, n)}
      <span
        style={{
          background: box.color,
          display: "inline-block",
          height: box.size * 1.15,
          marginLeft: 1,
          opacity: caretOn ? 1 : 0,
          verticalAlign: "text-bottom",
          width: 1.5,
        }}
      />
    </div>
  );
}

/** How far the phone leans in on a textarea, 0 to 1. */
function zoomAmount(f: number, fps: number, from: number, to: number) {
  if (f < from) {
    return 0;
  }
  const zin = spring({
    config: { damping: 22, stiffness: 120 },
    fps,
    frame: f - from,
  });
  const zout =
    f < to
      ? 0
      : spring({ config: { damping: 22, stiffness: 120 }, fps, frame: f - to });
  return zin - zout;
}

function Phone() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    config: { damping: 22, stiffness: 140 },
    fps,
    frame: f - T.phoneIn,
  });
  const leave = prog(f, T.cta - 6, T.cta + 16, inOut);
  const z1 = zoomAmount(f, fps, T.zoomIn1, T.zoomOut1);
  const z2 = zoomAmount(f, fps, T.zoomIn2, T.zoomOut2);
  const [ox, oy] =
    z2 > 0.001 ? centre(layout.tadabburBox) : centre(layout.checkinBox);
  const zoom = 1 + 0.15 * (z1 + z2);
  const dark = f >= T.question - 4;
  const frame = dark ? "#2a2e3d" : "#20232f";
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: `${ox}px ${oy}px`,
      }}
    >
      <div
        style={{
          background: frame,
          borderRadius: 86,
          boxShadow: `0 0 0 2px ${dark ? "#3a3f52" : "#3a3e4d"}, 0 40px 90px rgba(16,20,40,${dark ? 0.55 : 0.22})`,
          height: PHONE_H,
          left: PHONE_X,
          opacity: 1 - leave,
          position: "absolute",
          top: PHONE_Y,
          transform: `translateY(${(1 - enter) * 1500 + leave * 240}px) scale(${1 - leave * 0.08})`,
          width: PHONE_W,
        }}
      >
        <div
          style={{
            background: "#000",
            borderRadius: 74,
            height: SCREEN_H,
            left: BEZEL,
            overflow: "hidden",
            position: "absolute",
            top: BEZEL,
            width: PHONE_W - BEZEL * 2,
          }}
        >
          <div
            style={{
              height: VH + STATUS,
              left: 0,
              position: "absolute",
              top: 0,
              transform: `scale(${K})`,
              transformOrigin: "0 0",
              width: VW,
            }}
          >
            <Screens f={f} fps={fps} />
            <Touch f={f} at={T.tap} rect={layout.grateful} />
            <ChipToCard f={f} fps={fps} />
            <Typing
              f={f}
              from={T.type1}
              until={T.typed1}
              box={layout.checkinBox}
              text={REFLECTION}
            />
            <Touch f={f} at={T.save1} rect={layout.checkinSave} />
            <Typing
              f={f}
              from={T.type2}
              until={T.typed2}
              box={layout.tadabburBox}
              text={NIGHT_NOTE}
            />
            <Touch f={f} at={T.save2} rect={layout.tadabburSave} />
          </div>
          {/* Camera, a small punch hole over the status bar. */}
          <div
            style={{
              background: "#0b0c10",
              borderRadius: 11,
              height: 22,
              left: (PHONE_W - BEZEL * 2) / 2 - 11,
              position: "absolute",
              top: 14,
              width: 22,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// CTA: the تدبر mark builds square by square, then the name.
function Mark({ frame, size }: { frame: number; size: number }) {
  const b = markBounds();
  const span = Math.max(b.width, b.height);
  const box = span / (1 - 2 * 0.2);
  const ox = b.minX - (box - b.width) / 2;
  const oy = b.minY - (box - b.height) / 2;
  const tile = prog(frame, 0, 16);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${ox} ${oy} ${box} ${box}`}
      style={{ opacity: tile, transform: `scale(${0.92 + tile * 0.08})` }}
    >
      <rect
        x={ox}
        y={oy}
        width={box}
        height={box}
        rx={box * 0.22}
        fill={C.indigo}
      />
      {MARK_RECTS.map(([x, y, w, h], i) => {
        const p = prog(frame, 10 + i * 2.5, 22 + i * 2.5);
        const cx = x + w / 2;
        const cy = y + h / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            fill={C.cotton}
            opacity={p}
            transform={`translate(${cx} ${cy}) scale(${0.4 + p * 0.6}) translate(${-cx} ${-cy})`}
          />
        );
      })}
    </svg>
  );
}

function Cta() {
  const f = useCurrentFrame() - T.cta - 8;
  if (f < 0) {
    return null;
  }
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 96px" }}>
      <div style={{ display: "grid", gap: 48, justifyItems: "start" }}>
        <Mark frame={f} size={300} />
        <div
          style={{
            ...rise(f, 40, 16),
            color: C.nightInk,
            fontFamily: F.ui,
            fontSize: 112,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
          }}
        >
          MindfulVerse
        </div>
        <div style={{ display: "grid", gap: 14, ...rise(f, 54, 16) }}>
          <div style={{ color: C.nightInk, fontFamily: F.text, fontSize: 60 }}>
            Find your verse today.
          </div>
          <div
            style={{
              color: C.nightSoft,
              fontFamily: F.ui,
              fontSize: 40,
              fontWeight: 500,
            }}
          >
            Free, no sign-up
          </div>
        </div>
        <div
          style={{
            ...rise(f, 70, 16),
            color: C.nightIndigo,
            fontFamily: F.ui,
            fontSize: 44,
            fontWeight: 500,
            marginTop: 24,
          }}
        >
          mindfulverse.vercel.app
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Captions() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Label f={f} from={T.phoneIn} to={T.noon - 4}>
        7:12 am.
      </Label>
      <Label f={f} from={T.noon} to={T.night - 4}>
        1:05 pm.
      </Label>
      <Label f={f} from={T.night} to={T.cta - 4}>
        9:40 pm.
      </Label>
      <Caption f={f} from={T.feel + 6} to={T.morph + 2}>
        One question.
      </Caption>
      <Caption f={f} from={T.morph + 10} to={T.write + 4}>
        One verse for how you feel.
      </Caption>
      <Caption f={f} from={T.readTitle + 8} to={T.night - 4} size={64}>
        The whole Qur’an, whenever you have a minute.
      </Caption>
      <Caption f={f} from={T.question + 6} to={T.journal - 2}>
        Sit with one verse.
      </Caption>
      <Caption f={f} from={T.journal + 6} to={T.cta - 4}>
        Keep what stays.
      </Caption>
    </AbsoluteFill>
  );
}

const textFace = `@font-face{font-family:OutfitText;font-weight:400;src:url(${staticFile("fonts/outfit-regular.woff2")}) format("woff2");font-display:block}`;

export function DayInTheLife() {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.cotton, height, width }}>
      <style>{fontCss + textFace}</style>
      <Sky />
      <Hook />
      <Captions />
      <Phone />
      <Cta />
    </AbsoluteFill>
  );
}
