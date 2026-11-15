// Pieces shared by OneSurahOneWeek, StandLoop, StartACircle and Explainer: captions, a
// magnified card over a capture, typing over a measured field, the scene
// stack with overlapping cuts, the nasheed and the closing card. Screens come
// from scripts/capture-three.mjs (public/screens/three).
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import { bandTile } from "./brand";
import {
  C,
  Caret,
  Credit,
  F,
  Mark,
  NASHEED,
  Phone,
  STATUS,
  Screen,
  TRANSLATION_CREDIT,
  VH,
  VW,
  beat,
  ease,
  prog,
  rise,
  typed,
} from "./kit";
import type { Rect } from "./kit";

export const shot = (name: string) => staticFile(`screens/three/${name}.png`);

// The words typed in the videos; the captures hold the same lines.
export const INTENTION = "I've been anxious about work.";
export const REFLECTION = "Ease is already beside the hardship.";
export const ACTION = "Pray two rak'ahs before I open my inbox.";
export const CIRCLE_NAME = "Friday friends";
export const SITE = "mindfulverse.vercel.app";

// ---- Portrait canvas (1080x1920) ----

export const W = 1080;
export const CAP_TOP = 236;
export const CAP_X = 80;
export const PHONE_W = 560;
export const PHONE_X = (W - PHONE_W) / 2;
export const PHONE_Y = 600;
/** How much a Zoom card magnifies the app. */
export const ZOOM = 2.42;
/** A Zoom crop the width of the screen, less a small margin. */
export const fullWidth = (y: number, h: number): Rect => ({
  h,
  w: VW - 16,
  x: 8,
  y,
});
export const ZOOM_X = (W - (VW - 16) * ZOOM) / 2;

export function Caption({
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

/** The translation credit, under the phone, whenever verse English shows.
 *  Put it before a phone that slides in, so the phone passes over it. */
export function VerseCredit({
  top = 1850,
  opacity = 1,
}: {
  top?: number;
  opacity?: number;
}) {
  return (
    <Credit
      style={{
        left: 0,
        opacity,
        position: "absolute",
        right: 0,
        textAlign: "center",
        top,
      }}
    >
      {TRANSLATION_CREDIT}
    </Credit>
  );
}

const STAGE = { width: PHONE_W, x: PHONE_X, y: PHONE_Y };

/** A phone at the portrait position (or `place`); enters from below or the
 *  right. */
export function StagePhone({
  t,
  from = "none",
  dim = 0,
  place = STAGE,
  children,
}: {
  t: number;
  from?: "below" | "right" | "none";
  dim?: number;
  place?: { x: number; y: number; width: number };
  children: ReactNode;
}) {
  const p = from === "none" ? 1 : prog(t, 0, 22, ease.drawer);
  const dx = from === "right" ? (1 - p) * 700 : 0;
  const dy = from === "below" ? (1 - p) * 420 : 0;
  return (
    <Phone
      x={place.x}
      y={place.y}
      width={place.width}
      style={{ transform: `translate(${dx}px, ${dy}px)` }}
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

/** A magnified crop of the app in a card. Children are laid out exactly as
 *  inside a Phone (app CSS px under the status strip), so Screen, Touch,
 *  Ring and TypedField work in both. */
export function Zoom({
  crop,
  scale = ZOOM,
  x,
  y,
  t,
  at,
  until = 9999,
  children,
}: {
  crop: Rect;
  scale?: number;
  x: number;
  y: number;
  t: number;
  at: number;
  until?: number;
  children: ReactNode;
}) {
  const p =
    prog(t, at, at + 18, ease.drawer) *
    (1 - prog(t, until, until + 10, ease.inOut));
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
      }}
    >
      <div
        style={{
          height: VH + STATUS,
          left: 0,
          position: "absolute",
          top: 0,
          transform: `scale(${scale}) translate(${-crop.x}px, ${-(crop.y + STATUS)}px)`,
          transformOrigin: "0 0",
          width: VW,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** A soft indigo ring that settles around an app rect. */
export function Ring({
  t,
  at,
  until = 9999,
  rect,
  pad = 6,
}: {
  t: number;
  at: number;
  until?: number;
  rect: Rect;
  pad?: number;
}) {
  const p = prog(t, at, at + 14) * (1 - prog(t, until, until + 8));
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

const FIELD_STYLES = {
  // .field-input in the app (circle name).
  form: { bg: C.cotton, pad: "9px 12px", radius: 3 },
  // .tad-input in the app (intention, the three questions).
  tad: { bg: C.raised, pad: "12px 14px", radius: 4 },
} as const;

/** Text typed into an input or textarea, over its place in a capture. */
export function TypedField({
  rect,
  text,
  t,
  from,
  perFrame = 0.6,
  kind = "tad",
}: {
  rect: Rect;
  text: string;
  t: number;
  from: number;
  perFrame?: number;
  kind?: keyof typeof FIELD_STYLES;
}) {
  const s = FIELD_STYLES[kind];
  const shown = typed(text, t, from, perFrame);
  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${C.indigo}`,
        borderRadius: s.radius,
        boxShadow: `0 0 0 3px ${C.wash}`,
        boxSizing: "border-box",
        color: C.ink,
        fontFamily: "OutfitText, sans-serif",
        fontSize: 17,
        height: rect.h,
        left: rect.x,
        lineHeight: 1.6,
        padding: s.pad,
        position: "absolute",
        top: STATUS + rect.y,
        width: rect.w,
      }}
    >
      {shown}
      <Caret f={t} height={19} solid={shown.length < text.length && t > from} />
    </div>
  );
}

/** Two captures of the same screen, the second fading in at `at`. */
export function Swap({
  a,
  b,
  t,
  at,
  dur = 8,
}: {
  a: string;
  b: string;
  t: number;
  at: number;
  dur?: number;
}) {
  return (
    <>
      <Screen src={shot(a)} />
      <Screen src={shot(b)} opacity={prog(t, at, at + dur)} />
    </>
  );
}

// ---- Assembly ----

export interface SceneProps {
  t: number;
  credit: boolean;
}
export type Scene = (p: SceneProps) => JSX.Element;

/** Frames each cut overlaps: the next scene fades in over the last one. */
export const OV = 8;

export const startsOf = (lengths: readonly number[]) =>
  lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
export const totalOf = (lengths: readonly number[]) =>
  lengths.reduce((a, b) => a + b, 0);

/** Scenes back to back; each one fades in over the tail of the one before,
 *  so no frame between them is empty. */
export function SceneStack({
  scenes,
  lengths,
  credit,
}: {
  scenes: readonly Scene[];
  lengths: readonly number[];
  credit: boolean;
}) {
  const f = useCurrentFrame();
  const starts = startsOf(lengths);
  const total = totalOf(lengths);
  return (
    <>
      {scenes.map((SceneAt, i) => {
        const start = starts[i];
        const end = i + 1 < scenes.length ? starts[i + 1] + OV : total;
        const from = i === 0 ? 0 : start - OV;
        if (f < from || f >= end) {
          return null;
        }
        const opacity =
          i === 0 ? 1 : prog(f, start - OV, start + OV, ease.inOut);
        return (
          <AbsoluteFill key={`scene-${start}`} style={{ opacity }}>
            <SceneAt t={f - start} credit={credit} />
          </AbsoluteFill>
        );
      })}
    </>
  );
}

/** The track runs 46 s. */
const TRACK = 1382;
const XFADE = 60;
const level = (pts: number[], vals: number[]) => (f: number) =>
  interpolate(f, pts, vals, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** The nasheed, faded in and out. A video longer than the track gets a
 *  second pass that crossfades in under the end of the first, as in
 *  WhatsNew. */
export function Nasheed({ duration }: { duration: number }) {
  if (duration <= TRACK) {
    return (
      <Audio
        src={NASHEED}
        volume={level([0, 30, duration - 60, duration], [0, 0.8, 0.8, 0])}
      />
    );
  }
  const second = TRACK - XFADE;
  const tail = duration - second;
  return (
    <>
      <Sequence durationInFrames={TRACK}>
        <Audio
          src={NASHEED}
          volume={level([0, 30, TRACK - XFADE, TRACK], [0, 0.8, 0.8, 0])}
        />
      </Sequence>
      <Sequence from={second} durationInFrames={tail}>
        <Audio
          src={NASHEED}
          volume={level([0, XFADE, tail - 60, tail], [0, 0.8, 0.8, 0])}
        />
      </Sequence>
    </>
  );
}

const centred: CSSProperties = {
  left: 80,
  position: "absolute",
  right: 80,
  textAlign: "center",
};

/** The closing card: the mark, one line, then the quiet lines under it. */
export function EndCard({
  t,
  credit,
  headline,
  lines,
}: {
  t: number;
  credit: boolean;
  headline: string;
  lines: { text: string; link?: boolean; size?: number }[];
}) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 470,
        }}
      >
        <Mark frame={t} size={260} />
      </div>
      <div
        style={{
          ...centred,
          ...rise(t, 16, 16),
          color: C.indigoDeep,
          fontFamily: F.ui,
          fontSize: 104,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          top: 800,
        }}
      >
        {headline}
      </div>
      <div style={{ ...centred, display: "grid", gap: 30, top: 990 }}>
        {lines.map((line, i) => (
          <div
            key={line.text}
            style={{
              ...rise(t, 44 + i * 8, 16),
              color: line.link ? C.indigo : C.inkSoft,
              fontFamily: line.link ? F.ui : F.text,
              fontSize: line.size ?? 54,
              fontWeight: line.link ? 600 : 400,
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
      {credit ? (
        <div
          style={{
            ...centred,
            ...rise(t, 60, 14, 12),
            color: C.inkSoft,
            fontFamily: F.ui,
            fontSize: 32,
            fontWeight: 500,
            top: 1500,
          }}
        >
          Nasheed: “Alhamdulilah” by Jawad Syed, CC BY 3.0
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

/** An indigo title card: the adire band, then the words under it. */
export function TitleCard({ t, children }: { t: number; children: ReactNode }) {
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
        {children}
      </Caption>
    </AbsoluteFill>
  );
}
