// "A day in the life": a 9:16 promo built on real MindfulVerse screens.
// Every screen inside the phone is a capture of the running web app
// (scripts/capture-screens.mjs); only the typing, the taps and the chip that
// grows into its verse are drawn on top, at the positions the capture measured.
// Dawn, a morning check-in; midday, the reader; night, one question and the journal.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, interpolateColors, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MARK_RECTS, markBounds } from "../../../packages/core/brand";
import { C, F, fontCss } from "./brand";
import layout from "../public/screens/layout.json";

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
const SPRING = { stiffness: 300, damping: 20, mass: 1 };

function prog(frame: number, from: number, to: number, ease = out) {
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

function rise(frame: number, start: number, dur = 14, dist = 28): CSSProperties {
  const p = prog(frame, start, start + dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)`, filter: `blur(${(1 - p) * 6}px)` };
}

/** In at `from`, out at `to` (a short fade up and away). */
function beat(frame: number, from: number, to: number): CSSProperties {
  const inP = prog(frame, from, from + 14);
  const outP = prog(frame, to - 8, to, inOut);
  return {
    opacity: inP * (1 - outP),
    transform: `translateY(${(1 - inP) * 26 - outP * 14}px)`,
    filter: `blur(${(1 - inP) * 6 + outP * 4}px)`,
  };
}

// Sky: dawn, day, night.
const SKY_AT = [0, 400, 470, 580, 640, DAY_DURATION];
const SKY_TOP = ["#dfe2f2", "#e4e6f3", "#c7d3f4", "#c7d3f4", "#0e1018", "#0e1018"];
const SKY_LOW = ["#f6e3d8", "#f3e8e2", C.cotton, C.cotton, C.night, "#161b33"];
const INK_AT = [0, 590, 630];
const sky = (f: number, stops: string[]) => interpolateColors(f, SKY_AT, stops);

function Sky() {
  const f = useCurrentFrame();
  const night = prog(f, 590, 640, inOut);
  // A low dawn sun climbs to midday, then gives way to a small moon.
  const sunY = interpolate(f, [0, 470, 590], [760, 250, 200], { extrapolateRight: "clamp", easing: out });
  const stars = Array.from({ length: 34 }, (_, i) => ({
    x: (i * 263) % 1080,
    y: 40 + ((i * 151) % 400),
    r: 1.6 + (i % 3) * 0.9,
    tw: 0.55 + 0.45 * Math.sin(f / 9 + i * 1.7),
  }));
  return (
    <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${sky(f, SKY_TOP)}, ${sky(f, SKY_LOW)})` }}>
      <div
        style={{
          position: "absolute",
          left: 930 - 260,
          top: sunY - 260,
          width: 520,
          height: 520,
          borderRadius: 260,
          background: `radial-gradient(circle, ${interpolateColors(f, [0, 440], ["#fbd9c1", "#fff6e6"])}cc 0%, transparent 62%)`,
          opacity: 1 - night,
        }}
      />
      <div style={{ position: "absolute", left: 900, top: 150, width: 64, height: 64, borderRadius: 32, boxShadow: `inset -16px 8px 0 0 ${C.nightIndigo}`, opacity: night * 0.9, transform: "rotate(-20deg)" }} />
      {stars.map((s, i) => (
        <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: s.r, background: C.nightInk, opacity: night * 0.5 * s.tw }} />
      ))}
    </AbsoluteFill>
  );
}

// Captions above the phone.
const CAP_X = 96;

function Label({ f, from, to, children }: { f: number; from: number; to: number; children: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: CAP_X, top: 104, ...beat(f, from, to), fontFamily: F.ui, fontWeight: 600, fontSize: 46, letterSpacing: "-0.01em", color: interpolateColors(f, INK_AT, [C.indigo, C.indigo, C.nightIndigo]) }}>
      {children}
    </div>
  );
}

function Caption({ f, from, to, size = 74, children }: { f: number; from: number; to: number; size?: number; children: ReactNode }) {
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
        color: interpolateColors(f, INK_AT, [C.indigoDeep, C.indigoDeep, C.nightInk]),
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
    <AbsoluteFill style={{ padding: "0 96px", justifyContent: "center", opacity: 1 - away, transform: `translateY(${-away * 60}px)` }}>
      <div style={{ ...rise(f, T.hookTime, 18, 30), fontFamily: F.ui, fontWeight: 600, fontSize: 168, letterSpacing: "-0.04em", color: C.indigo }}>7:12 am.</div>
      <div style={{ ...rise(f, T.hookLine, 18, 30), marginTop: 24, fontFamily: F.ui, fontWeight: 600, fontSize: 96, lineHeight: 1.08, letterSpacing: "-0.03em", color: C.indigoDeep, textWrap: "balance" }}>
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

type Rect = { x: number; y: number; w: number; h: number };

/** A point in screen space as a point on the 1080x1920 canvas (unzoomed). */
function toCanvas(x: number, y: number): [number, number] {
  return [PHONE_X + BEZEL + x * K, PHONE_Y + BEZEL + (STATUS + y) * K];
}
const centre = (r: Rect) => toCanvas(r.x + r.w / 2, r.y + r.h / 2);

type Shot = { src: string; at: number; enter: "slide" | "fade" | "cut"; dark?: boolean; time: string };

const SHOTS: Shot[] = [
  { src: "home", at: 0, enter: "cut", time: "7:12" },
  { src: "checkin-feel", at: T.feel, enter: "slide", time: "7:12" },
  { src: "checkin-verse", at: T.morph + 2, enter: "fade", time: "7:13" },
  { src: "checkin-write", at: T.write, enter: "slide", time: "7:13" },
  { src: "checkin-typed", at: T.typed1, enter: "cut", time: "7:14" },
  { src: "checkin-kept", at: T.kept1, enter: "cut", time: "7:14" },
  { src: "read-title", at: T.readTitle, enter: "slide", time: "1:05" },
  { src: "read-arabic", at: T.readArabic, enter: "slide", time: "1:05" },
  { src: "tadabbur-question", at: T.question, enter: "slide", dark: true, time: "9:40" },
  { src: "tadabbur-write", at: T.write2, enter: "cut", dark: true, time: "9:40" },
  { src: "tadabbur-typed", at: T.typed2, enter: "cut", dark: true, time: "9:41" },
  { src: "tadabbur-kept", at: T.kept2, enter: "cut", dark: true, time: "9:41" },
  { src: "journal", at: T.journal, enter: "slide", dark: true, time: "9:41" },
];

function Page({ shot, x = 0, opacity = 1 }: { shot: Shot; x?: number; opacity?: number }) {
  const bg = shot.dark ? C.night : C.cotton;
  const ink = shot.dark ? C.nightInk : C.ink;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: VW * 1.3, height: VH + STATUS, background: bg, transform: `translateX(${x}px)`, opacity }}>
      <div style={{ height: STATUS, width: VW, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 26px 0", boxSizing: "border-box", fontFamily: F.ui, fontWeight: 600, fontSize: 14, color: ink }}>
        <span>{shot.time}</span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="11" viewBox="0 0 17 11">
            {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 4.5} y={8 - i * 2.6} width="3" height={3 + i * 2.6} rx="0.8" fill={ink} />)}
          </svg>
          <span style={{ width: 22, height: 11, border: `1.4px solid ${ink}`, borderRadius: 3, padding: 1.4, boxSizing: "border-box", display: "flex" }}>
            <span style={{ width: "72%", background: ink, borderRadius: 1 }} />
          </span>
        </span>
      </div>
      <Img src={staticFile(`screens/${shot.src}.png`)} style={{ width: VW, height: VH, display: "block" }} />
    </div>
  );
}

function Screens({ f, fps }: { f: number; fps: number }) {
  let i = 0;
  SHOTS.forEach((s, j) => {
    if (f >= s.at) i = j;
  });
  const cur = SHOTS[i];
  const prev = SHOTS[i - 1];
  const t = f - cur.at;
  if (!prev || cur.enter === "cut") return <Page shot={cur} />;
  if (cur.enter === "fade") {
    const p = prog(f, cur.at, cur.at + 14);
    return (
      <>
        <Page shot={prev} />
        <Page shot={cur} opacity={p} />
      </>
    );
  }
  const p = spring({ frame: t, fps, config: SPRING });
  return (
    <>
      <Page shot={prev} x={-p * VW * 0.28} />
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: Math.min(p, 1) * 0.18 }} />
      <Page shot={cur} x={(1 - p) * VW} />
    </>
  );
}

/** A fingertip: a soft disc that lands, presses and lifts. */
function Touch({ f, at, rect }: { f: number; at: number; rect: Rect }) {
  const land = prog(f, at, at + 8);
  const lift = prog(f, at + 12, at + 26);
  if (f < at || lift >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x + rect.w / 2 - 22,
        top: STATUS + rect.y + rect.h / 2 - 22,
        width: 44,
        height: 44,
        borderRadius: 22,
        background: C.indigo,
        border: `2px solid ${C.cotton}`,
        opacity: land * 0.32 * (1 - lift),
        transform: `scale(${0.7 + land * 0.3 + lift * 0.5})`,
      }}
    />
  );
}

/** The tapped "Grateful" chip fills, then grows into the first verse card. */
function ChipToCard({ f, fps }: { f: number; fps: number }) {
  const chip = layout.grateful;
  const card = layout.gratefulCard;
  if (f < T.tap + 6 || f > T.morph + 20) return null;
  const fill = prog(f, T.tap + 6, T.tap + 12);
  const m = Math.min(spring({ frame: f - T.morph, fps, config: SPRING }), 1.04);
  const lerp = (a: number, b: number) => a + (b - a) * m;
  const fade = prog(f, T.morph + 6, T.morph + 20);
  const label = 1 - prog(f, T.morph, T.morph + 6);
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(chip.x, card.x),
        top: STATUS + lerp(chip.y, card.y),
        width: lerp(chip.w, card.w),
        height: lerp(chip.h, card.h),
        borderRadius: interpolate(m, [0, 1], [22, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        background: interpolateColors(Math.min(m, 1), [0, 1], [C.indigo, card.background]),
        opacity: fill * (1 - fade),
        display: "grid",
        placeItems: "center",
        fontFamily: F.ui,
        fontWeight: 400,
        fontSize: chip.size,
        color: C.cotton,
        boxSizing: "border-box",
      }}
    >
      <span style={{ opacity: label }}>Grateful</span>
    </div>
  );
}

/** Text typed into a real textarea, set in its own measured box and face. */
function Typing({ f, from, until, box, text }: { f: number; from: number; until: number; box: typeof layout.checkinBox; text: string }) {
  if (f < from - 2 || f >= until) return null;
  const n = Math.max(0, Math.min(text.length, Math.floor((f - from) * 1.0)));
  const caretOn = Math.floor(f / 8) % 2 === 0 || n < text.length;
  const [pt, pr, , pl] = box.padding;
  return (
    <div
      style={{
        position: "absolute",
        left: box.x + box.border,
        top: STATUS + box.y + box.border,
        width: box.w - box.border * 2,
        height: box.h - box.border * 2,
        background: box.background,
        padding: `${pt}px ${pr}px 0 ${pl}px`,
        boxSizing: "border-box",
        fontFamily: "OutfitText, sans-serif",
        fontSize: box.size,
        lineHeight: box.lineHeight,
        color: box.color,
        whiteSpace: "pre-wrap",
      }}
    >
      {text.slice(0, n)}
      <span style={{ display: "inline-block", width: 1.5, height: box.size * 1.15, marginLeft: 1, verticalAlign: "text-bottom", background: box.color, opacity: caretOn ? 1 : 0 }} />
    </div>
  );
}

/** How far the phone leans in on a textarea, 0 to 1. */
function zoomAmount(f: number, fps: number, from: number, to: number) {
  if (f < from) return 0;
  const zin = spring({ frame: f - from, fps, config: { stiffness: 120, damping: 22 } });
  const zout = f < to ? 0 : spring({ frame: f - to, fps, config: { stiffness: 120, damping: 22 } });
  return zin - zout;
}

function Phone() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f - T.phoneIn, fps, config: { stiffness: 140, damping: 22 } });
  const leave = prog(f, T.cta - 6, T.cta + 16, inOut);
  const z1 = zoomAmount(f, fps, T.zoomIn1, T.zoomOut1);
  const z2 = zoomAmount(f, fps, T.zoomIn2, T.zoomOut2);
  const [ox, oy] = z2 > 0.001 ? centre(layout.tadabburBox) : centre(layout.checkinBox);
  const zoom = 1 + 0.15 * (z1 + z2);
  const dark = f >= T.question - 4;
  const frame = dark ? "#2a2e3d" : "#20232f";
  return (
    <AbsoluteFill style={{ transformOrigin: `${ox}px ${oy}px`, transform: `scale(${zoom})` }}>
      <div
        style={{
          position: "absolute",
          left: PHONE_X,
          top: PHONE_Y,
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: 86,
          background: frame,
          boxShadow: `0 0 0 2px ${dark ? "#3a3f52" : "#3a3e4d"}, 0 40px 90px rgba(16,20,40,${dark ? 0.55 : 0.22})`,
          transform: `translateY(${(1 - enter) * 1500 + leave * 240}px) scale(${1 - leave * 0.08})`,
          opacity: 1 - leave,
        }}
      >
        <div style={{ position: "absolute", left: BEZEL, top: BEZEL, width: PHONE_W - BEZEL * 2, height: SCREEN_H, borderRadius: 74, overflow: "hidden", background: "#000" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: VW, height: VH + STATUS, transform: `scale(${K})`, transformOrigin: "0 0" }}>
            <Screens f={f} fps={fps} />
            <Touch f={f} at={T.tap} rect={layout.grateful} />
            <ChipToCard f={f} fps={fps} />
            <Typing f={f} from={T.type1} until={T.typed1} box={layout.checkinBox} text={REFLECTION} />
            <Touch f={f} at={T.save1} rect={layout.checkinSave} />
            <Typing f={f} from={T.type2} until={T.typed2} box={layout.tadabburBox} text={NIGHT_NOTE} />
            <Touch f={f} at={T.save2} rect={layout.tadabburSave} />
          </div>
          {/* Camera, a small punch hole over the status bar. */}
          <div style={{ position: "absolute", left: (PHONE_W - BEZEL * 2) / 2 - 11, top: 14, width: 22, height: 22, borderRadius: 11, background: "#0b0c10" }} />
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
    <svg width={size} height={size} viewBox={`${ox} ${oy} ${box} ${box}`} style={{ transform: `scale(${0.92 + tile * 0.08})`, opacity: tile }}>
      <rect x={ox} y={oy} width={box} height={box} rx={box * 0.22} fill={C.indigo} />
      {MARK_RECTS.map(([x, y, w, h], i) => {
        const p = prog(frame, 10 + i * 2.5, 22 + i * 2.5);
        const cx = x + w / 2;
        const cy = y + h / 2;
        return (
          <rect key={i} x={x} y={y} width={w} height={h} fill={C.cotton} opacity={p} transform={`translate(${cx} ${cy}) scale(${0.4 + p * 0.6}) translate(${-cx} ${-cy})`} />
        );
      })}
    </svg>
  );
}

function Cta() {
  const f = useCurrentFrame() - T.cta - 8;
  if (f < 0) return null;
  return (
    <AbsoluteFill style={{ padding: "0 96px", justifyContent: "center" }}>
      <div style={{ display: "grid", justifyItems: "start", gap: 48 }}>
        <Mark frame={f} size={300} />
        <div style={{ ...rise(f, 40, 16), fontFamily: F.ui, fontWeight: 600, fontSize: 112, lineHeight: 1.08, letterSpacing: "-0.03em", color: C.nightInk }}>MindfulVerse</div>
        <div style={{ display: "grid", gap: 14, ...rise(f, 54, 16) }}>
          <div style={{ fontFamily: F.text, fontSize: 60, color: C.nightInk }}>Find your verse today.</div>
          <div style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 40, color: C.nightSoft }}>Free, no sign-up</div>
        </div>
        <div style={{ ...rise(f, 70, 16), fontFamily: F.ui, fontWeight: 500, fontSize: 44, color: C.nightIndigo, marginTop: 24 }}>mindfulverse.vercel.app</div>
      </div>
    </AbsoluteFill>
  );
}

function Captions() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Label f={f} from={T.phoneIn} to={T.noon - 4}>7:12 am.</Label>
      <Label f={f} from={T.noon} to={T.night - 4}>1:05 pm.</Label>
      <Label f={f} from={T.night} to={T.cta - 4}>9:40 pm.</Label>
      <Caption f={f} from={T.feel + 6} to={T.morph + 2}>One question.</Caption>
      <Caption f={f} from={T.morph + 10} to={T.write + 4}>One verse for how you feel.</Caption>
      <Caption f={f} from={T.readTitle + 8} to={T.night - 4} size={64}>The whole Qur’an, whenever you have a minute.</Caption>
      <Caption f={f} from={T.question + 6} to={T.journal - 2}>Sit with one verse.</Caption>
      <Caption f={f} from={T.journal + 6} to={T.cta - 4}>Keep what stays.</Caption>
    </AbsoluteFill>
  );
}

const textFace = `@font-face{font-family:OutfitText;font-weight:400;src:url(${staticFile("fonts/outfit-regular.woff2")}) format("woff2");font-display:block}`;

export function DayInTheLife() {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ width, height, background: C.cotton }}>
      <style>{fontCss + textFace}</style>
      <Sky />
      <Hook />
      <Captions />
      <Phone />
      <Cta />
    </AbsoluteFill>
  );
}
