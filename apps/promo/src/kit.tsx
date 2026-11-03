// Shared pieces for the promo series: motion curves, the تدبر mark, the adire
// band, a phone frame for real app captures, tap rings, typing and credits.
// Brand values come from ./brand (which mirrors apps/web/src/index.css).
import type { CSSProperties, ReactNode } from "react";
import {
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import { MARK_RECTS, markBounds } from "../../../packages/core/brand";
import { C, F, bandTile, fontCss } from "./brand";

export { C, F } from "./brand";

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

export const ease = {
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  out: Easing.bezier(0.23, 1, 0.32, 1),
};

/** 0→1 between two frames, clamped. */
export function prog(
  frame: number,
  from: number,
  to: number,
  curve = ease.out
) {
  return interpolate(frame, [from, to], [0, 1], {
    easing: curve,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Rise in from below with a little blur. Spread into a style; don't set opacity after it. */
export function rise(
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
export function beat(frame: number, from: number, to: number): CSSProperties {
  const inP = prog(frame, from, from + 14);
  const outP = prog(frame, to - 8, to, ease.inOut);
  return {
    filter: `blur(${(1 - inP) * 6 + outP * 4}px)`,
    opacity: inP * (1 - outP),
    transform: `translateY(${(1 - inP) * 26 - outP * 14}px)`,
  };
}

const textFace = `@font-face{font-family:OutfitText;font-weight:400;src:url(${staticFile("fonts/outfit-regular.woff2")}) format("woff2");font-display:block}`;

/** Put once at the top of every composition: the app's faces. */
export function Fonts() {
  return <style>{fontCss + textFace}</style>;
}

/** The تدبر mark, built square by square from `frame` 0. */
export function Mark({
  frame,
  size,
  ground = C.indigo,
  ink = C.cotton,
}: {
  frame: number;
  size: number;
  ground?: string;
  ink?: string;
}) {
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
        fill={ground}
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
            fill={ink}
            opacity={p}
            transform={`translate(${cx} ${cy}) scale(${0.4 + p * 0.6}) translate(${-cx} ${-cy})`}
          />
        );
      })}
    </svg>
  );
}

/** The adire band (diamond + ringed dot), drawn in from the left at `start`. */
export function Band({
  start = 0,
  top = 0,
  h = 44,
  ground = C.indigo,
  ink = C.cotton,
}: {
  start?: number;
  top?: number;
  h?: number;
  ground?: string;
  ink?: string;
}) {
  const f = useCurrentFrame();
  const p = prog(f, start, start + 24, ease.inOut);
  return (
    <div
      style={{
        backgroundImage: bandTile(ground, ink, h),
        backgroundRepeat: "repeat-x",
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        height: h,
        left: 0,
        position: "absolute",
        right: 0,
        top,
      }}
    />
  );
}

/** Big headline type in the app's UI face. */
export function Headline({
  children,
  size = 92,
  color = C.indigoDeep,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        color,
        fontFamily: F.ui,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "-0.03em",
        lineHeight: 1.08,
        textWrap: "balance",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A small, quiet credit line (translation, commentary, music). */
export function Credit({
  children,
  color = C.inkFaint,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        color,
        fontFamily: F.ui,
        fontSize: 28,
        fontWeight: 500,
        lineHeight: 1.35,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---- Phone frame for real app captures (390x844 CSS px viewport) ----

export const VW = 390;
export const VH = 844;
export const STATUS = 30;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A phone on the canvas: `width` px wide at (x, y). Children are laid out in
 *  the app's own 390-wide CSS space (STATUS px status strip at the top). */
export function Phone({
  x,
  y,
  width = 620,
  dark = false,
  style,
  children,
}: {
  x: number;
  y: number;
  width?: number;
  dark?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const bezel = width * 0.0194;
  const k = (width - bezel * 2) / VW;
  const screenH = (VH + STATUS) * k;
  return (
    <div
      style={{
        background: dark ? "#2a2e3d" : "#20232f",
        borderRadius: width * 0.139,
        boxShadow: `0 0 0 2px ${dark ? "#3a3f52" : "#3a3e4d"}, 0 40px 90px rgba(16,20,40,${dark ? 0.55 : 0.22})`,
        height: screenH + bezel * 2,
        left: x,
        position: "absolute",
        top: y,
        width,
        ...style,
      }}
    >
      <div
        style={{
          background: dark ? C.night : C.cotton,
          borderRadius: width * 0.119,
          height: screenH,
          left: bezel,
          overflow: "hidden",
          position: "absolute",
          top: bezel,
          width: width - bezel * 2,
        }}
      >
        <div
          style={{
            height: VH + STATUS,
            left: 0,
            overflow: "hidden",
            position: "absolute",
            top: 0,
            transform: `scale(${k})`,
            transformOrigin: "0 0",
            width: VW,
          }}
        >
          {children}
          <div
            style={{
              background: dark ? C.night : C.cotton,
              height: STATUS,
              left: 0,
              position: "absolute",
              top: 0,
              width: VW,
            }}
          />
        </div>
        <div
          style={{
            background: "#0b0c10",
            borderRadius: 11,
            height: 22,
            left: (width - bezel * 2) / 2 - 11,
            position: "absolute",
            top: 14,
            width: 22,
          }}
        />
      </div>
    </div>
  );
}

/** Height of a Phone of `width` on the canvas. */
export const phoneHeight = (width = 620) => {
  const bezel = width * 0.0194;
  return (VH + STATUS) * ((width - bezel * 2) / VW) + bezel * 2;
};

/** A full-width screenshot inside a Phone, under the status strip. */
export function Screen({
  src,
  y = 0,
  opacity = 1,
}: {
  src: string;
  y?: number;
  opacity?: number;
}) {
  return (
    <Img
      src={src}
      style={{
        left: 0,
        opacity,
        position: "absolute",
        top: STATUS + y,
        width: VW,
      }}
    />
  );
}

/** A tap ring at the centre of `rect` (app CSS px, viewport coordinates). */
export function Touch({ f, at, rect }: { f: number; at: number; rect: Rect }) {
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

/** Characters of `text` visible at frame `f` when typing starts at `from`. */
export function typed(text: string, f: number, from: number, perFrame = 0.75) {
  return text.slice(
    0,
    Math.max(0, Math.min(text.length, Math.floor((f - from) * perFrame)))
  );
}

/** A blinking caret, for typing. */
export function Caret({
  f,
  color = C.ink,
  height = 20,
  solid = false,
}: {
  f: number;
  color?: string;
  height?: number;
  solid?: boolean;
}) {
  const on = solid || Math.floor(f / 8) % 2 === 0;
  return (
    <span
      style={{
        background: color,
        display: "inline-block",
        height,
        marginLeft: 2,
        opacity: on ? 1 : 0,
        verticalAlign: "text-bottom",
        width: Math.max(1.5, height / 14),
      }}
    />
  );
}

export const TRANSLATION_CREDIT =
  "English translation by Talal Itani (ClearQuran)";
export const NASHEED_CREDIT = "Music: “Alhamdulilah” by Jawad Syed · CC BY 3.0";
export const NASHEED = staticFile("audio/alhamdulillah-jawad-syed.m4a");
