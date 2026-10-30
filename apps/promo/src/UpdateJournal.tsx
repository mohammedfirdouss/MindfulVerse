// "New in MindfulVerse": a 9:16 update video for the tadabbur journal release.
// Every screen inside the phone is a capture of the running web app with
// invented test entries (scripts/capture-update.mjs); only the scrolling, the
// taps, the card rising in and the typing are drawn on top, at the positions
// the capture measured. Journal first, then Home's follow-up, then the intention.
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { MARK_RECTS, markBounds } from "../../../packages/core/brand";
import layout from "../public/screens/update/layout.json";
import { C, F, clothTile, fontCss } from "./brand";

export const UPDATE_FPS = 30;
export const UPDATE_DURATION = 1140;

/** Story beats in frames (storyboard scenes 1–11). */
const T = {
  hook: 0,
  deeper: 90,
  phoneIn: 150,
  journal: 165,
  journalTap: 232,
  page: 270,
  scrollDown: 284,
  scrollUp: 384,
  pdfTap: 428,
  pdfLift: 440,
  home: 495,
  cardIn: 512,
  partlyTap: 652,
  kept: 666,
  intro: 720,
  type: 760,
  typed: 828,
  walks: 855,
  cta: 960,
  credit: 1080,
};

const out = Easing.bezier(0.23, 1, 0.32, 1);
const inOut = Easing.bezier(0.77, 0, 0.175, 1);

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

// ---- Words around the phone ----

const CAP_X = 96;

function Caption({
  f,
  from,
  to,
  label,
  children,
}: {
  f: number;
  from: number;
  to: number;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        left: CAP_X,
        position: "absolute",
        right: CAP_X,
        top: 104,
        ...beat(f, from, to),
      }}
    >
      {label ? (
        <div
          style={{
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 42,
            fontWeight: 600,
            marginBottom: 18,
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          color: C.indigoDeep,
          fontFamily: F.ui,
          fontSize: 74,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          textWrap: "balance",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Captions() {
  const f = useCurrentFrame();
  return (
    <>
      <Caption f={f} from={T.journal} to={T.page} label="In Journal">
        Open a surah
      </Caption>
      <Caption f={f} from={T.page + 4} to={T.pdfTap - 6} label="New">
        Every surah you ponder, on one page.
      </Caption>
      <Caption f={f} from={T.pdfTap - 2} to={T.home}>
        Save it as a PDF.
      </Caption>
      <Caption f={f} from={T.home + 6} to={T.intro} label="On Home">
        A week later, we ask how it went.
      </Caption>
      <Caption f={f} from={T.intro + 6} to={T.walks} label="Before verse 1">
        Begin with why.
      </Caption>
    </>
  );
}

// ---- The phone ----

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

/** A measured page rect, moved into the viewport of a shot scrolled by `scroll`. */
const inView = (r: Rect, scroll = 0): Rect => ({ ...r, y: r.y - scroll });

const shot = (name: string) => staticFile(`screens/update/${name}.png`);
const PAGE_H = 1279;
const PAGE_SCROLL = 330;

function Fill({
  src,
  opacity = 1,
  y = 0,
}: {
  src: string;
  opacity?: number;
  y?: number;
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

/** The surah page: scrolls down to the follow-up, then back up to Save as PDF. */
function SurahPage({ f }: { f: number }) {
  const down = prog(f, T.scrollDown, T.scrollDown + 80, inOut);
  const up = prog(f, T.scrollUp, T.scrollUp + 30, inOut);
  const y = -PAGE_SCROLL * (down - up);
  return (
    <>
      <Img
        src={shot("surah-page")}
        style={{
          height: PAGE_H,
          left: 0,
          position: "absolute",
          top: STATUS + y,
          width: VW,
        }}
      />
      <Img
        src={shot("tabbar")}
        style={{ bottom: 0, left: 0, position: "absolute", width: VW }}
      />
    </>
  );
}

/** Home with the follow-up card rising into its place. */
function HomeCard({ f }: { f: number }) {
  const card = inView(layout.homeCard, layout.homeScroll);
  const p = prog(f, T.cardIn, T.cardIn + 20);
  return (
    <>
      <Fill src={shot("home-followup")} />
      {/* Before the card arrives its place is plain page. */}
      <div
        style={{
          background: C.cotton,
          height: card.h + 8,
          left: card.x - 4,
          opacity: 1 - p,
          position: "absolute",
          top: STATUS + card.y - 4,
          width: card.w + 8,
        }}
      />
      <div
        style={{
          height: card.h,
          left: card.x,
          opacity: p,
          overflow: "hidden",
          position: "absolute",
          top: STATUS + card.y,
          transform: `translateY(${(1 - p) * 24}px)`,
          width: card.w,
        }}
      >
        <Img
          src={shot("home-followup")}
          style={{
            left: -card.x,
            position: "absolute",
            top: -card.y,
            width: VW,
          }}
        />
      </div>
    </>
  );
}

/** After "Partly": the answered card replaces the question in place, then the
 *  page settles where the shorter page leaves it (as the browser does). */
function Kept({ f }: { f: number }) {
  if (f < T.kept - 8) {
    return null;
  }
  const kept = inView(layout.homeKeptCard, layout.homeKeptScroll);
  const asked = inView(layout.homeCard, layout.homeScroll);
  const offset = kept.y - asked.y;
  const settle = prog(f, T.kept + 10, T.kept + 30, inOut);
  return (
    <div
      style={{
        background: C.cotton,
        inset: 0,
        opacity: prog(f, T.kept - 8, T.kept + 4),
        position: "absolute",
      }}
    >
      {/* The shot without its own tab bar moves; the pinned bar stays put. */}
      <div
        style={{
          height: VH - layout.tabbarH,
          left: 0,
          overflow: "hidden",
          position: "absolute",
          top: STATUS - offset * (1 - settle),
          width: VW,
        }}
      >
        <Img
          src={shot("home-kept")}
          style={{ left: 0, position: "absolute", top: 0, width: VW }}
        />
      </div>
      {/* Home's own tab bar (Home selected), pinned to the bottom. */}
      <div
        style={{
          bottom: 0,
          height: layout.tabbarH,
          left: 0,
          overflow: "hidden",
          position: "absolute",
          width: VW,
        }}
      >
        <Img
          src={shot("home-kept")}
          style={{
            left: 0,
            position: "absolute",
            top: layout.tabbarH - VH,
            width: VW,
          }}
        />
      </div>
    </div>
  );
}

const INTENTION = "To slow down and trust";

function Typing({ f }: { f: number }) {
  const box = inView(layout.introField, layout.introScroll);
  if (f < T.type - 2 || f >= T.typed) {
    return null;
  }
  const n = Math.max(
    0,
    Math.min(INTENTION.length, Math.floor((f - T.type) * 0.75))
  );
  const caretOn = Math.floor(f / 8) % 2 === 0 || n < INTENTION.length;
  return (
    <div
      style={{
        background: C.raised,
        border: `1px solid ${C.indigo}`,
        borderRadius: 3,
        boxSizing: "border-box",
        color: C.ink,
        fontFamily: "OutfitText, sans-serif",
        fontSize: 17,
        height: box.h,
        left: box.x,
        lineHeight: "26px",
        padding: "12px 14px",
        position: "absolute",
        top: STATUS + box.y,
        width: box.w,
      }}
    >
      {INTENTION.slice(0, n)}
      <span
        style={{
          background: C.ink,
          display: "inline-block",
          height: 20,
          marginLeft: 1,
          opacity: caretOn ? 1 : 0,
          verticalAlign: "text-bottom",
          width: 1.5,
        }}
      />
    </div>
  );
}

function Screens({ f }: { f: number }) {
  const fadeIn = (at: number) => prog(f, at - 8, at + 4);
  if (f < T.page) {
    return (
      <>
        <Fill src={shot("journal")} />
        <Touch f={f} at={T.journalTap} rect={layout.journalPageLink} />
      </>
    );
  }
  if (f < T.home) {
    return (
      <>
        <Fill src={shot("journal")} />
        <div
          style={{ inset: 0, opacity: fadeIn(T.page), position: "absolute" }}
        >
          <SurahPage f={f} />
          <Touch f={f} at={T.pdfTap} rect={layout.pagePdf} />
        </div>
      </>
    );
  }
  if (f < T.intro) {
    return (
      <>
        <HomeCard f={f} />
        <Touch
          f={f}
          at={T.partlyTap}
          rect={inView(layout.homePartly, layout.homeScroll)}
        />
        <Kept f={f} />
      </>
    );
  }
  return (
    <>
      <Fill src={shot("intro-empty")} />
      <Typing f={f} />
      <Fill src={shot("intro-typed")} opacity={prog(f, T.typed - 4, T.typed)} />
    </>
  );
}

/** How far the phone leans in on the intention field, 0 to 1. */
function lean(f: number, fps: number) {
  const zin = spring({
    config: { damping: 22, stiffness: 120 },
    fps,
    frame: f - (T.type - 14),
  });
  const zout =
    f < T.walks - 20
      ? 0
      : spring({
          config: { damping: 22, stiffness: 120 },
          fps,
          frame: f - (T.walks - 20),
        });
  return f < T.type - 14 ? 0 : zin - zout;
}

function Phone() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < T.phoneIn - 2 || f > T.walks + 30) {
    return null;
  }
  const enter = spring({
    config: { damping: 22, stiffness: 140 },
    fps,
    frame: f - T.phoneIn,
  });
  const leave = prog(f, T.walks - 6, T.walks + 20, inOut);
  const field = inView(layout.introField, layout.introScroll);
  const ox = PHONE_X + BEZEL + (field.x + field.w / 2) * K;
  const oy = PHONE_Y + BEZEL + (STATUS + field.y + field.h / 2) * K;
  const zoom = 1 + 0.14 * lean(f, fps);
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: `${ox}px ${oy}px`,
      }}
    >
      <div
        style={{
          background: "#20232f",
          borderRadius: 86,
          boxShadow: "0 0 0 2px #3a3e4d, 0 40px 90px rgba(16,20,40,0.22)",
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
            background: C.cotton,
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
              overflow: "hidden",
              position: "absolute",
              top: 0,
              transform: `scale(${K})`,
              transformOrigin: "0 0",
              width: VW,
            }}
          >
            <Screens f={f} />
            <div
              style={{
                background: C.cotton,
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

/** The surah PDF's first page lifts out of the phone. */
function PdfLift() {
  const f = useCurrentFrame();
  if (f < T.pdfLift || f >= T.home) {
    return null;
  }
  const p = spring({
    config: { damping: 18, stiffness: 120 },
    fps: UPDATE_FPS,
    frame: f - T.pdfLift,
  });
  const gone = prog(f, T.home - 10, T.home, inOut);
  const w = 560;
  return (
    <Img
      src={staticFile("screens/update/surah-pdf.png")}
      style={{
        borderRadius: 6,
        boxShadow: "0 30px 70px rgba(16,20,40,0.28)",
        left: 300 + p * 120,
        opacity: Math.min(1, p * 1.4) * (1 - gone),
        position: "absolute",
        top: 1180 - p * 420,
        transform: `rotate(${-2 + p * 6}deg) scale(${0.6 + p * 0.4})`,
        width: w,
      }}
    />
  );
}

// ---- Opening and close ----

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

/** The adire band across the top, drawn in from the left. */
function Band() {
  const f = useCurrentFrame();
  const p = prog(f, 0, 24, inOut);
  return (
    <div
      style={{
        backgroundColor: C.indigo,
        backgroundImage: clothTile(C.cotton, 0.55, 44),
        backgroundSize: "44px 44px",
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        height: 44,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
      }}
    />
  );
}

function Hook() {
  const f = useCurrentFrame();
  if (f >= T.phoneIn + 10) {
    return null;
  }
  const up = prog(f, T.deeper, T.deeper + 20, inOut);
  const away = prog(f, T.phoneIn - 10, T.phoneIn + 10, inOut);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        opacity: 1 - away,
        padding: "0 96px",
        transform: `translateY(${-up * 160 - away * 80}px)`,
      }}
    >
      <div style={{ display: "grid", gap: 44, justifyItems: "start" }}>
        <Mark frame={f - 6} size={220} />
        <div
          style={{
            ...rise(f, 30, 16),
            color: C.indigoDeep,
            fontFamily: F.ui,
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          New in MindfulVerse
        </div>
        <div
          style={{
            ...rise(f, T.deeper + 10, 16),
            color: C.inkSoft,
            fontFamily: F.text,
            fontSize: 60,
            lineHeight: 1.25,
          }}
        >
          Your tadabbur journal just got deeper.
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Close({ credit }: { credit: boolean }) {
  const f = useCurrentFrame();
  if (f < T.walks) {
    return null;
  }
  const walksOut = prog(f, T.cta - 10, T.cta + 6, inOut);
  const c = f - T.cta;
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 96px" }}>
      {c < 6 ? (
        <div
          style={{
            ...rise(f, T.walks + 24, 18),
            color: C.indigoDeep,
            fontFamily: F.ui,
            fontSize: 92,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            opacity: prog(f, T.walks + 24, T.walks + 42) * (1 - walksOut),
            textWrap: "balance",
          }}
        >
          Your tadabbur journal now walks with you.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 44, justifyItems: "start" }}>
          <Mark frame={c} size={240} />
          <div
            style={{
              ...rise(c, 24, 16),
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 104,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            MindfulVerse
          </div>
          <div style={{ display: "grid", gap: 16, ...rise(c, 38, 16) }}>
            <div style={{ color: C.ink, fontFamily: F.text, fontSize: 56 }}>
              Update now live
            </div>
            <div
              style={{
                color: C.inkSoft,
                fontFamily: F.ui,
                fontSize: 42,
                fontWeight: 500,
              }}
            >
              Journal → your surah
            </div>
            <div
              style={{
                color: C.indigo,
                fontFamily: F.ui,
                fontSize: 46,
                fontWeight: 600,
              }}
            >
              mindfulverse.vercel.app
            </div>
          </div>
        </div>
      )}
      {credit ? (
        <div
          style={{
            ...rise(f, T.credit, 14, 12),
            bottom: 96,
            color: C.inkFaint,
            fontFamily: F.ui,
            fontSize: 30,
            fontWeight: 500,
            left: 96,
            position: "absolute",
            right: 96,
          }}
        >
          Music: “Alhamdulilah” by Jawad Syed · CC BY 3.0
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

const textFace = `@font-face{font-family:OutfitText;font-weight:400;src:url(${staticFile("fonts/outfit-regular.woff2")}) format("woff2");font-display:block}`;

export function UpdateJournal({ withNasheed }: { withNasheed: boolean }) {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.cotton, height, width }}>
      <style>{fontCss + textFace}</style>
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md): fade in, settle under the
          story, and fade out over the last two seconds. */}
      {withNasheed ? (
        <Audio
          src={staticFile("audio/alhamdulillah-jawad-syed.m4a")}
          volume={(f) =>
            interpolate(
              f,
              [0, 24, UPDATE_DURATION - 60, UPDATE_DURATION],
              [0, 0.8, 0.8, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            )
          }
        />
      ) : null}
      <Band />
      <Hook />
      <Captions />
      <Phone />
      <PdfLift />
      <Close credit={withNasheed} />
    </AbsoluteFill>
  );
}
