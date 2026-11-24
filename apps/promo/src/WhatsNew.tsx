// "What's new in MindfulVerse": a 9:16 update video. One message: read a
// surah together, each in your own words. Circles lead, then a quick "Also
// new" tour. Every screen inside a phone or window is a capture of the running
// app with invented test data (scripts/capture-whatsnew.mjs); the typing, the
// taps, the surah picker, the chat bubbles, the share card, the three circles
// and the large week dots are drawn on top.
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import layout from "../public/screens/whatsnew/layout.json";
import { bandTile } from "./brand";
import {
  C,
  Caret,
  F,
  Fonts,
  Mark,
  NASHEED,
  Phone,
  STATUS,
  Screen,
  Touch,
  VW,
  beat,
  ease,
  prog,
  rise,
  typed,
} from "./kit";
import type { Rect } from "./kit";

export const WHATS_NEW_FPS = 30;

/** Scene lengths in frames, storyboard scenes 1–18. */
const LENGTHS = [
  105, 75, 150, 75, 120, 105, 120, 120, 90, 135, 60, 105, 120, 135, 135, 105,
  120, 120,
] as const;
const STARTS = LENGTHS.map((_, i) =>
  LENGTHS.slice(0, i).reduce((a, b) => a + b, 0)
);
export const WHATS_NEW_DURATION = LENGTHS.reduce((a, b) => a + b, 0);

/** Frames each cut overlaps: the next scene fades in over the last one. */
const OV = 8;

const shot = (name: string) => staticFile(`screens/whatsnew/${name}.png`);

// ---- Layout on the canvas ----

const W = 1080;
const CAP_TOP = 236;
const CAP_X = 80;
const PHONE_W = 560;
const PHONE_X = (W - PHONE_W) / 2;
const PHONE_Y = 600;

// ---- Words ----

function Caption({
  t,
  from,
  to,
  color = C.indigoDeep,
  size = 70,
  top = CAP_TOP,
  children,
}: {
  t: number;
  from: number;
  to: number;
  color?: string;
  size?: number;
  top?: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        color,
        fontFamily: F.ui,
        fontSize: size,
        fontWeight: 600,
        left: CAP_X,
        letterSpacing: "-0.03em",
        lineHeight: 1.1,
        position: "absolute",
        right: CAP_X,
        textWrap: "balance",
        top,
        ...beat(t, from, to),
      }}
    >
      {children}
    </div>
  );
}

// ---- Shared drawn pieces ----

/** Three readers around one centre: the app's Circles icon, large. */
function Gathering({
  t,
  size = 520,
  color = C.cotton,
}: {
  t: number;
  size?: number;
  color?: string;
}) {
  const r = size * 0.3;
  const ring = size * 0.105;
  const angles = [-90, 150, 30];
  const swell = Math.sin(prog(t, 30, 62, ease.inOut) * Math.PI) * 0.045;
  const centre = prog(t, 22, 36);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
      style={{ overflow: "visible", transform: `scale(${1 + swell})` }}
    >
      <path
        d={`M0 ${-size * 0.07}L${size * 0.07} 0L0 ${size * 0.07}L${-size * 0.07} 0Z`}
        fill={color}
        opacity={centre}
        transform={`scale(${0.5 + centre * 0.5})`}
      />
      {angles.map((a, i) => {
        const p = prog(t, i * 5, 26 + i * 5, ease.drawer);
        const d = r * (2.2 - 1.2 * p);
        const rad = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={Math.cos(rad) * d}
            cy={Math.sin(rad) * d}
            r={ring}
            fill="none"
            stroke={color}
            strokeWidth={size * 0.026}
            opacity={p}
          />
        );
      })}
    </svg>
  );
}

/** A magnified crop of a capture, in a card. */
function Lens({
  src,
  crop,
  scale,
  x,
  y,
  t,
  at,
  style,
  children,
}: {
  src: string;
  crop: Rect;
  scale: number;
  x: number;
  y: number;
  t: number;
  at: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const p = prog(t, at, at + 18, ease.drawer);
  return (
    <div
      style={{
        background: C.cotton,
        borderRadius: 28,
        boxShadow:
          "0 30px 80px rgba(16,20,40,0.28), 0 0 0 2px rgba(42,58,140,0.18)",
        height: crop.h * scale,
        left: x,
        opacity: p,
        overflow: "hidden",
        position: "absolute",
        top: y,
        transform: `translateY(${(1 - p) * 60}px) scale(${0.94 + p * 0.06})`,
        width: crop.w * scale,
        ...style,
      }}
    >
      <Img
        src={src}
        style={{
          left: -crop.x * scale,
          position: "absolute",
          top: -crop.y * scale,
          width: VW * scale,
        }}
      />
      {children}
    </div>
  );
}

/** A soft indigo ring that settles around an app rect inside a phone. */
function Ring({
  t,
  at,
  rect,
  pad = 6,
}: {
  t: number;
  at: number;
  rect: Rect;
  pad?: number;
}) {
  const p = prog(t, at, at + 14);
  return (
    <div
      style={{
        border: `3px solid ${C.indigo}`,
        borderRadius: 8,
        height: rect.h + pad * 2,
        left: rect.x - pad,
        opacity: p,
        position: "absolute",
        top: STATUS + rect.y - pad,
        transform: `scale(${1.06 - p * 0.06})`,
        width: rect.w + pad * 2,
      }}
    />
  );
}

/** A phone that enters from below (or a side) at t=0 of its scene. */
function EnteringPhone({
  t,
  from = "below",
  dim = 0,
  x = PHONE_X,
  y = PHONE_Y,
  style,
  children,
}: {
  t: number;
  from?: "below" | "right" | "none";
  dim?: number;
  x?: number;
  y?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const p = from === "none" ? 1 : prog(t, 0, 22, ease.drawer);
  const dx = from === "right" ? (1 - p) * 700 : 0;
  const dy = from === "below" ? (1 - p) * 420 : 0;
  return (
    <Phone
      x={x}
      y={y}
      width={PHONE_W}
      style={{ transform: `translate(${dx}px, ${dy}px)`, ...style }}
    >
      {children}
      {dim > 0 ? (
        <div
          style={{
            background: C.indigoDeep,
            inset: 0,
            opacity: dim,
            position: "absolute",
          }}
        />
      ) : null}
    </Phone>
  );
}

/** Text typed into an input or textarea, over its place in a capture. */
function TypedField({
  rect,
  text,
  t,
  from,
  perFrame = 0.9,
  font = "OutfitText, sans-serif",
  pad = "11px 12px",
  bg = C.cotton,
}: {
  rect: Rect;
  text: string;
  t: number;
  from: number;
  perFrame?: number;
  font?: string;
  pad?: string;
  bg?: string;
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${C.indigo}`,
        borderRadius: 4,
        boxShadow: `0 0 0 3px ${C.wash}`,
        boxSizing: "border-box",
        color: C.ink,
        fontFamily: font,
        fontSize: 17,
        height: rect.h,
        left: rect.x,
        lineHeight: 1.6,
        padding: pad,
        position: "absolute",
        top: STATUS + rect.y,
        width: rect.w,
      }}
    >
      {typed(text, t, from, perFrame)}
      <Caret f={t} height={19} />
    </div>
  );
}

// ---- Scenes (t is the scene's own frame) ----

function S1Hook({ t }: { t: number }) {
  return (
    <AbsoluteFill style={{ background: C.indigo }}>
      <div
        style={{
          backgroundImage: bandTile(C.indigo, C.cotton, 64),
          backgroundRepeat: "repeat-x",
          clipPath: `inset(0 ${(1 - prog(t, 0, 26, ease.inOut)) * 100}% 0 0)`,
          height: 64,
          left: 0,
          position: "absolute",
          right: 0,
          top: 640,
        }}
      />
      <Caption t={t} from={10} to={999} color={C.cotton} size={96} top={760}>
        Reading the Qur’an is better together.
      </Caption>
    </AbsoluteFill>
  );
}

function S2Mark({ t }: { t: number }) {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: C.indigo,
        justifyContent: "center",
      }}
    >
      <div style={{ display: "grid", gap: 56, justifyItems: "center" }}>
        <Mark frame={t} size={280} ground={C.cotton} ink={C.indigo} />
        <div
          style={{
            ...rise(t, 22, 16),
            color: C.cotton,
            fontFamily: F.ui,
            fontSize: 76,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            textAlign: "center",
          }}
        >
          What’s new in MindfulVerse
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** A generic chat bubble: grey lines, no app's UI. */
function Bubble({
  t,
  at,
  x,
  y,
  lines,
  tilt,
}: {
  t: number;
  at: number;
  x: number;
  y: number;
  lines: number[];
  tilt: number;
}) {
  const p = prog(t, at, at + 12, ease.drawer);
  return (
    <div
      style={{
        background: C.raised,
        borderRadius: "34px 34px 34px 8px",
        boxShadow: "0 24px 60px rgba(8,10,30,0.45)",
        display: "grid",
        gap: 16,
        left: x,
        opacity: p,
        padding: "30px 34px",
        position: "absolute",
        top: y,
        transform: `rotate(${tilt}deg) scale(${0.6 + p * 0.4})`,
        transformOrigin: "0% 100%",
        width: 380,
      }}
    >
      {lines.map((w, i) => (
        <div
          key={`${w}-${i}`}
          style={{
            background: C.line,
            borderRadius: 9,
            height: 18,
            width: `${w}%`,
          }}
        />
      ))}
      <div
        style={{
          background: C.indigo,
          borderRadius: 22,
          color: C.cotton,
          fontFamily: F.ui,
          fontSize: 26,
          fontWeight: 600,
          height: 44,
          lineHeight: "44px",
          position: "absolute",
          right: -12,
          textAlign: "center",
          top: -14,
          width: 44,
        }}
      >
        {lines.length}
      </div>
    </div>
  );
}

function S3Alone({ t }: { t: number }) {
  const drift = prog(t, 70, 150, ease.inOut);
  return (
    <AbsoluteFill style={{ background: C.indigoDeep }}>
      <Caption t={t} from={0} to={72} color={C.cotton}>
        You mean to sit with a surah.
      </Caption>
      <Caption t={t} from={74} to={999} color={C.cotton}>
        Alone, it’s easy to drift.
      </Caption>
      <EnteringPhone
        t={t}
        dim={0.35 + drift * 0.25}
        style={{
          transform: `translateY(${(1 - prog(t, 0, 22, ease.drawer)) * 420}px) rotate(${-drift * 4}deg) scale(${1 - drift * 0.05})`,
        }}
      >
        <Screen src={shot("alone-read")} />
      </EnteringPhone>
      <Bubble t={t} at={82} x={560} y={760} lines={[90, 60]} tilt={3} />
      <Bubble t={t} at={98} x={120} y={1010} lines={[80, 95, 40]} tilt={-4} />
      <Bubble t={t} at={114} x={520} y={1260} lines={[70]} tilt={2} />
    </AbsoluteFill>
  );
}

function S4Circles({ t }: { t: number }) {
  return (
    <AbsoluteFill style={{ background: C.indigo }}>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 640,
        }}
      >
        <Gathering t={t} size={560} />
      </div>
      <Caption t={t} from={20} to={999} color={C.cotton} size={92} top={1300}>
        Now there are circles.
      </Caption>
    </AbsoluteFill>
  );
}

const PICK = [16, 17, 18, 19, 20];
const PICK_NAMES: Record<number, string> = {
  16: "An-Nahl",
  17: "Al-Isra",
  18: "Al-Kahf",
  19: "Maryam",
  20: "Taha",
};

/** A plain list sheet for choosing the surah (drawn). */
function SurahPicker({
  t,
  at,
  pickAt,
}: {
  t: number;
  at: number;
  pickAt: number;
}) {
  const up = prog(t, at, at + 12, ease.drawer);
  const down = prog(t, pickAt + 6, pickAt + 16, ease.inOut);
  const p = up * (1 - down);
  if (p <= 0) {
    return null;
  }
  const picked = t >= pickAt;
  return (
    <>
      <div
        style={{
          background: "rgba(22,26,46,0.35)",
          inset: 0,
          opacity: p,
          position: "absolute",
        }}
      />
      <div
        style={{
          background: C.raised,
          borderRadius: "16px 16px 0 0",
          bottom: 0,
          left: 0,
          padding: "14px 0 30px",
          position: "absolute",
          transform: `translateY(${(1 - p) * 320}px)`,
          width: VW,
        }}
      >
        <div
          style={{
            background: C.line,
            borderRadius: 3,
            height: 5,
            margin: "0 auto 10px",
            width: 40,
          }}
        />
        {PICK.map((n) => {
          const on = n === 18;
          return (
            <div
              key={n}
              style={{
                background: on && picked ? C.wash : "transparent",
                color: on ? C.indigo : C.ink,
                fontFamily: "OutfitText, sans-serif",
                fontSize: 18,
                fontWeight: on ? 600 : 400,
                padding: "12px 24px",
              }}
            >
              {n}. {PICK_NAMES[n]}
              {on && picked ? "  ✓" : ""}
            </div>
          );
        })}
      </div>
    </>
  );
}

function S5Name({ t }: { t: number }) {
  const filled = prog(t, 98, 104);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Name it. Pick a surah.
      </Caption>
      <EnteringPhone t={t} from="none">
        <Screen src={shot("circle-form-empty")} />
        <TypedField
          rect={layout.formName}
          text="Al-Noor halaqa"
          t={t}
          from={10}
          perFrame={0.42}
        />
        <Touch f={t} at={56} rect={layout.formSurah} />
        <Screen src={shot("circle-form-filled")} opacity={filled} />
        <SurahPicker t={t} at={64} pickAt={88} />
        <Touch
          f={t}
          at={84}
          rect={{ h: 46, w: VW, x: 0, y: 844 - 30 - 46 * 3 }}
        />
      </EnteringPhone>
    </AbsoluteFill>
  );
}

function ShareCard({ t, at }: { t: number; at: number }) {
  const p = prog(t, at, at + 18, ease.drawer);
  return (
    <div
      style={{
        background: C.raised,
        borderRadius: 32,
        boxShadow: "0 30px 80px rgba(16,20,40,0.3)",
        left: 150,
        opacity: p,
        overflow: "hidden",
        position: "absolute",
        top: 1020,
        transform: `translateY(${(1 - p) * 120}px) rotate(${-2 + p * 2}deg)`,
        width: 780,
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: C.indigo,
          display: "flex",
          gap: 26,
          padding: "30px 34px",
        }}
      >
        <Mark frame={60} size={92} ground={C.cotton} ink={C.indigo} />
        <div style={{ color: C.cotton, fontFamily: F.ui }}>
          <div style={{ fontSize: 40, fontWeight: 600 }}>Al-Noor halaqa</div>
          <div style={{ fontSize: 30, fontWeight: 500, opacity: 0.85 }}>
            Reading Al-Kahf together
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 14, padding: "28px 34px 34px" }}>
        <div
          style={{
            color: C.ink,
            fontFamily: F.text,
            fontSize: 32,
            lineHeight: 1.4,
          }}
        >
          Join “Al-Noor halaqa” on MindfulVerse. We’re reading Al-Kahf together.
        </div>
        <div
          style={{
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 30,
            fontWeight: 600,
          }}
        >
          mindfulverse.app/circle/k7m2qx
        </div>
      </div>
    </div>
  );
}

function S6Share({ t }: { t: number }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Share the link.
      </Caption>
      <EnteringPhone t={t} from="none" dim={prog(t, 40, 58) * 0.25}>
        <Screen src={shot("circle-created")} />
        <Ring t={t} at={8} rect={layout.createdLink} pad={4} />
        <Touch f={t} at={26} rect={layout.createdCopy} />
      </EnteringPhone>
      <ShareCard t={t} at={42} />
    </AbsoluteFill>
  );
}

function S7Friend({ t }: { t: number }) {
  const lead = layout.homeLead;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Friends tap it. No account needed.
      </Caption>
      <EnteringPhone t={t} from="right">
        <Screen src={shot("home-circle")} />
        <Ring t={t} at={40} rect={{ ...lead, h: 70 }} pad={4} />
      </EnteringPhone>
    </AbsoluteFill>
  );
}

const REFLECTION = "When they had nowhere to go, they asked for mercy first.";

function S8Ponder({ t }: { t: number }) {
  const scroll = prog(t, 34, 52, ease.inOut);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Each of you ponders. Each of you writes.
      </Caption>
      <EnteringPhone t={t} from="none">
        <div
          style={{
            inset: 0,
            position: "absolute",
            transform: `translateY(${-scroll * 500}px)`,
          }}
        >
          <Screen src={shot("verse-top")} />
        </div>
        <div
          style={{
            inset: 0,
            opacity: scroll,
            position: "absolute",
            transform: `translateY(${(1 - scroll) * 344}px)`,
          }}
        >
          <Screen src={shot("verse-write")} />
          {t >= 52 ? (
            <TypedField
              rect={layout.verseField}
              text={REFLECTION}
              t={t}
              from={56}
              perFrame={1.1}
              pad="12px 14px"
              bg={C.raised}
            />
          ) : null}
        </div>
      </EnteringPhone>
    </AbsoluteFill>
  );
}

function S9Private({ t }: { t: number }) {
  const r = layout.privacy;
  const crop = { h: r.h + 28, w: VW - 16, x: 8, y: r.y - 14 };
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <EnteringPhone t={t} from="none" dim={prog(t, 6, 20) * 0.3}>
        <Screen src={shot("circles-joined")} />
      </EnteringPhone>
      <Lens
        src={shot("circles-joined")}
        crop={crop}
        scale={2.42}
        x={(W - crop.w * 2.42) / 2}
        y={980}
        t={t}
        at={8}
      />
      <Caption t={t} from={0} to={999} size={66}>
        Your reflections stay private. Only the surah is shared.
      </Caption>
    </AbsoluteFill>
  );
}

function S10Together({ t }: { t: number }) {
  const r = layout.homeCount;
  const crop = { h: r.h + 28, w: VW - 16, x: 8, y: r.y - 14 };
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <EnteringPhone t={t} from="none" dim={prog(t, 10, 24) * 0.3}>
        <Screen src={shot("home-circle")} />
      </EnteringPhone>
      <Lens
        src={shot("home-circle")}
        crop={crop}
        scale={2.42}
        x={(W - crop.w * 2.42) / 2}
        y={1120}
        t={t}
        at={12}
      />
      <Caption t={t} from={0} to={999}>
        Together. Nobody ranked.
      </Caption>
    </AbsoluteFill>
  );
}

function S11Also({ t }: { t: number }) {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: C.indigo,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundImage: bandTile(C.indigo, C.cotton, 48),
          backgroundRepeat: "repeat-x",
          clipPath: `inset(0 ${(1 - prog(t, 0, 20, ease.inOut)) * 100}% 0 0)`,
          height: 48,
          left: 0,
          position: "absolute",
          right: 0,
          top: 1100,
        }}
      />
      <div
        style={{
          ...rise(t, 4, 14),
          color: C.cotton,
          fontFamily: F.ui,
          fontSize: 120,
          fontWeight: 600,
          letterSpacing: "-0.03em",
        }}
      >
        Also new
      </div>
    </AbsoluteFill>
  );
}

function S12Home({ t }: { t: number }) {
  const lead = layout.startersLead;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Home now starts with a surah.
      </Caption>
      <EnteringPhone t={t}>
        <Screen src={shot("home-starters")} />
        <Ring t={t} at={34} rect={{ ...lead, h: 40 }} pad={4} />
      </EnteringPhone>
    </AbsoluteFill>
  );
}

function S13Week({ t }: { t: number }) {
  const w = layout.week;
  const crop = { h: w.h + 20, w: VW - 16, x: 8, y: w.y - 10 };
  const pattern = layout.weekDots.map((d) => d.on);
  const SIZE = 74;
  const GAP = 40;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999} size={66}>
        Your week, in seven dots. Private. No streak to break.
      </Caption>
      <div
        style={{
          display: "flex",
          gap: GAP,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 820,
        }}
      >
        {pattern.map((on, i) => {
          const appear = prog(t, 6 + i * 3, 18 + i * 3);
          const onAt = 26 + pattern.slice(0, i).filter(Boolean).length * 9;
          const fill = on ? prog(t, onAt, onAt + 10, ease.drawer) : 0;
          return (
            <div
              key={`d${i}`}
              style={{
                background: on ? C.indigo : "transparent",
                border: `4px solid ${fill > 0 ? C.indigo : C.line}`,
                borderRadius: "50%",
                boxShadow: `inset 0 0 0 ${(1 - fill) * SIZE}px ${C.cotton}`,
                boxSizing: "border-box",
                height: SIZE,
                opacity: appear,
                transform: `scale(${0.6 + appear * 0.4 + Math.sin(fill * Math.PI) * 0.12})`,
                width: SIZE,
              }}
            />
          );
        })}
      </div>
      <Lens
        src={shot("home-week")}
        crop={crop}
        scale={2.42}
        x={(W - crop.w * 2.42) / 2}
        y={1060}
        t={t}
        at={60}
      />
    </AbsoluteFill>
  );
}

const ACTION = "Thank my mother properly";

function S14Sessions({ t }: { t: number }) {
  const typedIn = prog(t, 58, 62);
  const home = prog(t, 70, 86, ease.inOut);
  const card = layout.followup;
  const cardIn = prog(t, 84, 102);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999} size={66}>
        Sessions ask what you’ll do, and check in a week later.
      </Caption>
      <EnteringPhone t={t} from="none">
        <Screen src={shot("session-end")} />
        <Ring
          t={t}
          at={4}
          rect={{
            ...layout.sessionAction,
            h: 26,
            y: layout.sessionAction.y - 34,
          }}
          pad={4}
        />
        {t >= 18 && t < 62 ? (
          <TypedField
            rect={layout.sessionAction}
            text={ACTION}
            t={t}
            from={20}
            perFrame={0.75}
            pad="12px"
            bg={C.raised}
          />
        ) : null}
        <Screen
          src={shot("session-end-typed")}
          opacity={typedIn * (t < 62 ? 0 : 1)}
        />
        <div
          style={{
            inset: 0,
            opacity: home,
            position: "absolute",
            transform: `translateX(${(1 - home) * 120}px)`,
          }}
        >
          <Screen src={shot("home-week")} />
          <div
            style={{
              background: C.cotton,
              height: card.h + 8,
              left: card.x - 4,
              opacity: 1 - cardIn,
              position: "absolute",
              top: STATUS + card.y - 4,
              width: card.w + 8,
            }}
          />
          <div
            style={{
              height: card.h,
              left: card.x,
              opacity: cardIn,
              overflow: "hidden",
              position: "absolute",
              top: STATUS + card.y,
              transform: `translateY(${(1 - cardIn) * 24}px)`,
              width: card.w,
            }}
          >
            <Img
              src={shot("home-week")}
              style={{
                left: -card.x,
                position: "absolute",
                top: -card.y,
                width: VW,
              }}
            />
          </div>
        </div>
      </EnteringPhone>
      <div
        style={{
          ...rise(t, 92, 14),
          background: C.indigo,
          borderRadius: 40,
          color: C.cotton,
          fontFamily: F.ui,
          fontSize: 38,
          fontWeight: 600,
          left: CAP_X,
          padding: "16px 32px",
          position: "absolute",
          top: 440,
        }}
      >
        A week later
      </div>
    </AbsoluteFill>
  );
}

function S15Android({ t }: { t: number }) {
  const a = prog(t, 46, 60, ease.inOut);
  const b = prog(t, 88, 102, ease.inOut);
  const slide = (p: number): CSSProperties => ({
    inset: 0,
    position: "absolute",
    transform: `translateX(${(1 - p) * VW}px)`,
  });
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999} size={66}>
        On Android: your surah page, sessions and search.
      </Caption>
      <EnteringPhone t={t}>
        <Screen src={shot("m-surah")} />
        <Touch f={t} at={24} rect={{ h: 49, w: 141, x: 22, y: 163 }} />
        <div style={slide(a)}>
          <Screen src={shot("m-sessions")} />
        </div>
        <div style={slide(b)}>
          <Screen src={shot("m-search")} />
        </div>
      </EnteringPhone>
    </AbsoluteFill>
  );
}

function S16Desktop({ t }: { t: number }) {
  const crop = { h: 560, w: 700, x: 0, y: 12 };
  const scale = 920 / crop.w;
  const link = layout.deskCircles;
  const p = prog(t, 0, 20, ease.drawer);
  const ring = prog(t, 30, 44);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        On desktop, Circles is in the sidebar.
      </Caption>
      <div
        style={{
          background: C.raised,
          borderRadius: 26,
          boxShadow: "0 30px 80px rgba(16,20,40,0.22), 0 0 0 2px #3a3e4d",
          height: crop.h * scale,
          left: 80,
          opacity: p,
          overflow: "hidden",
          position: "absolute",
          top: 640,
          transform: `translateY(${(1 - p) * 120}px)`,
          width: 920,
        }}
      >
        <Img
          src={shot("desktop-circles")}
          style={{
            left: -crop.x * scale,
            position: "absolute",
            top: -crop.y * scale,
            width: 1440 * scale,
          }}
        />
        <div
          style={{
            border: `4px solid ${C.indigo}`,
            borderRadius: 14,
            height: (link.h + 12) * scale,
            left: (link.x - 6) * scale,
            opacity: ring,
            position: "absolute",
            top: (link.y - crop.y - 6) * scale,
            transform: `scale(${1.08 - ring * 0.08})`,
            width: (link.w + 12) * scale,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function S17Start({ t }: { t: number }) {
  return (
    <AbsoluteFill style={{ background: C.indigo }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 560,
        }}
      >
        <Gathering t={t} size={460} />
      </div>
      <Caption t={t} from={6} to={50} color={C.cotton} size={96} top={1140}>
        Start a circle.
      </Caption>
      <Caption t={t} from={52} to={999} color={C.cotton} size={80} top={1140}>
        Read together, each in your own words.
      </Caption>
    </AbsoluteFill>
  );
}

function S18End({ t, credit }: { t: number; credit: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <div
        style={{
          display: "grid",
          gap: 40,
          justifyItems: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 470,
        }}
      >
        <Mark frame={t} size={260} />
        <div
          style={{
            ...rise(t, 20, 16),
            color: C.indigoDeep,
            fontFamily: F.ui,
            fontSize: 100,
            fontWeight: 600,
            letterSpacing: "-0.03em",
          }}
        >
          MindfulVerse
        </div>
        <div
          style={{
            ...rise(t, 30, 16),
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 54,
            fontWeight: 600,
          }}
        >
          mindfulverse.app
        </div>
        <div
          style={{
            ...rise(t, 38, 16),
            color: C.inkSoft,
            fontFamily: F.text,
            fontSize: 52,
          }}
        >
          Free. No ads.
        </div>
      </div>
      {credit ? (
        <div
          style={{
            ...rise(t, 44, 14, 12),
            color: C.inkSoft,
            fontFamily: F.ui,
            fontSize: 32,
            fontWeight: 500,
            left: 80,
            position: "absolute",
            right: 80,
            textAlign: "center",
            top: 1500,
          }}
        >
          Nasheed: “Alhamdulilah” by Jawad Syed, CC BY 3.0
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

// ---- Assembly ----

interface SceneProps {
  t: number;
  credit: boolean;
}
const SCENES: ((p: SceneProps) => JSX.Element)[] = [
  S1Hook,
  S2Mark,
  S3Alone,
  S4Circles,
  S5Name,
  S6Share,
  S7Friend,
  S8Ponder,
  S9Private,
  S10Together,
  S11Also,
  S12Home,
  S13Week,
  S14Sessions,
  S15Android,
  S16Desktop,
  S17Start,
  S18End,
];

function Scenes({ credit }: { credit: boolean }) {
  const f = useCurrentFrame();
  return (
    <>
      {SCENES.map((Scene, i) => {
        const start = STARTS[i];
        const end =
          i + 1 < SCENES.length ? STARTS[i + 1] + OV : WHATS_NEW_DURATION;
        const from = i === 0 ? 0 : start - OV;
        if (f < from || f >= end) {
          return null;
        }
        const opacity =
          i === 0 ? 1 : prog(f, start - OV, start + OV, ease.inOut);
        return (
          <AbsoluteFill key={`scene-${start}`} style={{ opacity }}>
            <Scene t={f - start} credit={credit} />
          </AbsoluteFill>
        );
      })}
    </>
  );
}

/** The track runs 46 s; a second pass crossfades in under the last 20 s. */
const TRACK = 1382;
const XFADE = 60;
const fade = (pts: number[], vals: number[]) => (f: number) =>
  interpolate(f, pts, vals, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

function Nasheed() {
  const second = TRACK - XFADE;
  const tail = WHATS_NEW_DURATION - second;
  return (
    <>
      <Sequence durationInFrames={TRACK}>
        <Audio
          src={NASHEED}
          volume={fade([0, 30, TRACK - XFADE, TRACK], [0, 0.8, 0.8, 0])}
        />
      </Sequence>
      <Sequence from={second} durationInFrames={tail}>
        <Audio
          src={NASHEED}
          volume={fade([0, XFADE, tail - 60, tail], [0, 0.8, 0.8, 0])}
        />
      </Sequence>
    </>
  );
}

export function WhatsNew({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed /> : null}
      <Scenes credit={withNasheed} />
    </AbsoluteFill>
  );
}
