// "Sit with the Qur'an": a 9:16, 76-second story of the recent features and
// the move to mindfulverse.app, told with an original faceless character and
// narration that appears phrase by phrase. Sixteen scenes:
//   1-2   a man alone in the evening with his phone
//   3-5   Al-An'am, 165 verses, opened into 40 titled passages
//   6-9   a masjid circle reading Al-Hadid week by week
//   10-14 two friends after salah, then Deeper look on Al-Balad 90:12
//         (Ibn Kathir's commentary and "In short"; no word by word)
//   15-16 the move to mindfulverse.app, and the close
// App screens are real captures with invented test data
// (scripts/capture-sitwith.mjs).
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import layout from "../public/screens/three/sit-layout.json";
import { C, F } from "./brand";
import { Fonts, Mark, Screen, Touch, VH, ease, prog, rise } from "./kit";
import { Character, LOOKS } from "./sitwith/Character";
import { MasjidInside, MasjidOutside } from "./sitwith/Masjid";
import { Room } from "./sitwith/Room";
import {
  Nasheed,
  Ring,
  SceneStack,
  StagePhone,
  Swap,
  ZOOM_X,
  Zoom,
  fullWidth,
  shot,
  totalOf,
} from "./threeKit";
import type { Scene, SceneProps } from "./threeKit";

export const SIT_FPS = 30;

/** Scene lengths in frames, scenes 1 to 16 (2,280 frames, 76 s). */
const LENGTHS = [
  120, 120, 120, 150, 150, 150, 150, 150, 120, 120, 120, 120, 150, 120, 180,
  240,
] as const;
export const SIT_DURATION = totalOf(LENGTHS);

const WALL_HEIGHT = 2400;
const WALL_TRAVEL = WALL_HEIGHT - VH;
const AN_AM_VERSES = 165;
const SITE_OLD = "mindfulverse.vercel.app";
const SITE = "mindfulverse.app";

const TRANSLATION_NOTE = "English translation by Talal Itani (ClearQuran)";

/** Narration in the reference's spirit: large, centred, one phrase at a time. */
function Narration({
  t,
  at = 8,
  top = 300,
  size = 80,
  children,
}: {
  t: number;
  at?: number;
  top?: number;
  size?: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        ...rise(t, at, 18),
        color: C.nightInk,
        fontFamily: F.ui,
        fontSize: size,
        fontWeight: 600,
        left: 80,
        letterSpacing: "-0.02em",
        lineHeight: 1.12,
        position: "absolute",
        right: 80,
        textAlign: "center",
        textShadow: "0 4px 30px rgba(10,12,30,0.65)",
        textWrap: "balance",
        top,
      }}
    >
      {children}
    </div>
  );
}

function Note({ children, top = 1858 }: { children: ReactNode; top?: number }) {
  return (
    <div
      style={{
        color: C.nightSoft,
        fontFamily: F.ui,
        fontSize: 26,
        fontWeight: 500,
        left: 0,
        position: "absolute",
        right: 0,
        textAlign: "center",
        top,
      }}
    >
      {children}
    </div>
  );
}

/** A dark stage for the app screens, with a soft indigo glow behind. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 62%, #24306f 0%, ${C.night} 62%)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

const PHONE_SCENE_TOP = 170;

// ---- 1-2: alone in the evening ----

function S1Room({ t }: SceneProps) {
  const lit = prog(t, 0, 40);
  return (
    <AbsoluteFill>
      <Room t={t} lantern={0.6 + 0.4 * lit} />
      <Character
        look={LOOKS.indigo}
        x={540}
        y={1620}
        scale={1.25}
        glow={lit}
        tilt={10}
        t={t}
      />
      <Narration t={t}>You read the Qur’an.</Narration>
    </AbsoluteFill>
  );
}

function S2Closer({ t }: SceneProps) {
  // A slow push in towards the phone in his hands.
  const z = 1 + prog(t, 0, 110, ease.inOut) * 1.1;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${z})`,
          transformOrigin: "540px 1330px",
        }}
      >
        <Room t={t + 120} />
        <Character
          look={LOOKS.indigo}
          x={540}
          y={1620}
          scale={1.25}
          glow={1}
          tilt={10}
          t={t + 120}
        />
      </AbsoluteFill>
      <Narration t={t}>But do you stay with it?</Narration>
    </AbsoluteFill>
  );
}

// ---- 3-5: Al-An'am, opened into passages ----

function S3Wall({ t }: SceneProps) {
  const glide = prog(t, 8, 116, ease.inOut);
  const count = Math.round(1 + (AN_AM_VERSES - 1) * glide);
  return (
    <Stage>
      <Narration t={t} top={PHONE_SCENE_TOP} at={0}>
        Al-An’am.{" "}
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{count}</span>{" "}
        {count === 1 ? "verse" : "verses"}
        {count === AN_AM_VERSES ? "." : "…"}
      </Narration>
      <StagePhone t={t} from="below">
        <Screen src={shot("sit-wall")} y={-WALL_TRAVEL * glide} />
      </StagePhone>
    </Stage>
  );
}

function S4Map({ t }: SceneProps) {
  const summary = layout.sitSummary;
  const list = layout.sitList;
  const TAP_AT = 34;
  const OPEN_AT = TAP_AT + 10;
  return (
    <Stage>
      <Narration t={t} top={PHONE_SCENE_TOP}>
        Now every surah opens as a map.
      </Narration>
      <StagePhone t={t} dim={prog(t, OPEN_AT + 6, OPEN_AT + 20) * 0.3}>
        <Swap a="sit-folded" b="sit-open" t={t} at={OPEN_AT} />
        <Touch f={t} at={TAP_AT} rect={summary} />
      </StagePhone>
      <Zoom
        crop={fullWidth(list.y - 52, 330)}
        x={ZOOM_X}
        y={860}
        t={t}
        at={OPEN_AT + 8}
      >
        <Screen src={shot("sit-open")} />
      </Zoom>
    </Stage>
  );
}

function S5Tap({ t }: SceneProps) {
  const target = layout.sitTarget;
  const TAP_AT = 64;
  const LAND_AT = TAP_AT + 12;
  return (
    <Stage>
      <Narration t={t} top={PHONE_SCENE_TOP}>
        Know what you’re reading, before you read it.
      </Narration>
      <StagePhone t={t}>
        <Swap a="sit-titles" b="sit-landed" t={t} at={LAND_AT} />
        <Ring t={t} at={24} until={TAP_AT} rect={target} pad={4} />
        <Touch f={t} at={TAP_AT} rect={target} />
      </StagePhone>
      {t > LAND_AT ? <Note>{TRANSLATION_NOTE}</Note> : null}
    </Stage>
  );
}

// ---- 6-9: the masjid circle ----

function S6Outside({ t }: SceneProps) {
  return (
    <AbsoluteFill>
      <MasjidOutside t={t} />
      <Narration t={t} top={230}>
        Some verses are meant to be read together.
      </Narration>
    </AbsoluteFill>
  );
}

/** Five men in a circle on the carpet; the back row smaller, phones lit. */
const CIRCLE = [
  { flip: true, look: LOOKS.earth, s: 0.62, x: 330, y: 1290 },
  { flip: false, look: LOOKS.cotton, s: 0.62, x: 750, y: 1290 },
  { flip: true, look: LOOKS.sage, s: 0.82, x: 190, y: 1560 },
  { flip: false, look: LOOKS.indigo, s: 0.82, x: 890, y: 1560 },
  { flip: false, look: LOOKS.cotton, s: 0.98, x: 540, y: 1840 },
];

function S7Circle({ t }: SceneProps) {
  return (
    <AbsoluteFill>
      <MasjidInside t={t} />
      {CIRCLE.map((m, i) => (
        <Character
          key={`${m.x}-${m.y}`}
          look={m.look}
          x={m.x}
          y={m.y}
          scale={m.s}
          glow={prog(t, 10 + i * 9, 30 + i * 9)}
          tilt={10}
          flip={m.flip}
          t={t + i * 17}
        />
      ))}
      <Narration t={t} top={230}>
        One surah. One week. One circle.
      </Narration>
    </AbsoluteFill>
  );
}

function S8Count({ t }: SceneProps) {
  const lead = layout.sitLead;
  const count = layout.sitCount;
  const top = lead.y - 8;
  const bottom = count.y + count.h + 10;
  return (
    <Stage>
      <Narration t={t} top={PHONE_SCENE_TOP}>
        See how many are reading. Never who.
      </Narration>
      <StagePhone t={t} from="below" dim={prog(t, 20, 34) * 0.3}>
        <Screen src={shot("sit-home")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, bottom - top)}
        x={ZOOM_X}
        y={820}
        t={t}
        at={22}
      >
        <Screen src={shot("sit-home")} />
        <Ring t={t} at={62} rect={count} pad={6} />
      </Zoom>
    </Stage>
  );
}

function S9Questions({ t }: SceneProps) {
  const block = layout.sitQuestions;
  return (
    <Stage>
      <Narration t={t} top={PHONE_SCENE_TOP}>
        Questions ready for when you meet.
      </Narration>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.3}>
        <Screen src={shot("sit-questions")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(block.y - 8, block.h + 16)}
        x={ZOOM_X}
        y={760}
        t={t}
        at={10}
      >
        <Screen src={shot("sit-questions")} />
      </Zoom>
    </Stage>
  );
}

// ---- 10-14: two friends, then Deeper look ----

function Bubble({
  t,
  at,
  side,
  children,
}: {
  t: number;
  at: number;
  side: "left" | "right";
  children: ReactNode;
}) {
  return (
    <div
      style={{
        ...rise(t, at, 16, 20),
        background: C.cotton,
        borderRadius: 40,
        color: C.indigoDeep,
        fontFamily: F.ui,
        fontSize: 58,
        fontWeight: 600,
        left: side === "left" ? 70 : undefined,
        letterSpacing: "-0.02em",
        lineHeight: 1.15,
        maxWidth: 760,
        padding: "34px 44px",
        position: "absolute",
        right: side === "right" ? 70 : undefined,
        textWrap: "balance",
        top: 380,
      }}
    >
      {children}
    </div>
  );
}

function Friends({ t }: { t: number }) {
  return (
    <>
      <MasjidOutside t={t} dim={0.35} />
      <Character
        look={LOOKS.earth}
        pose="stand"
        x={330}
        y={1800}
        scale={1.15}
        glow={0}
        tilt={-4}
        t={t}
      />
      <Character
        look={LOOKS.cotton}
        pose="stand"
        x={760}
        y={1800}
        scale={1.15}
        glow={0}
        tilt={-4}
        flip
        t={t + 30}
      />
    </>
  );
}

function S10Friend({ t }: SceneProps) {
  return (
    <AbsoluteFill>
      <Friends t={t} />
      <Bubble t={t} at={10} side="left">
        “Al-Balad is only twenty verses…”
      </Bubble>
    </AbsoluteFill>
  );
}

function S11Reply({ t }: SceneProps) {
  return (
    <AbsoluteFill>
      <Friends t={t + 120} />
      <Bubble t={t} at={8} side="right">
        “…but what does ‘the steep path’ mean?”
      </Bubble>
    </AbsoluteFill>
  );
}

function S12Alone({ t }: SceneProps) {
  const lit = prog(t, 6, 40);
  return (
    <AbsoluteFill>
      <Room t={t + 400} lantern={0.7} />
      <Character
        look={LOOKS.cotton}
        x={540}
        y={1620}
        scale={1.25}
        glow={lit}
        tilt={12}
        t={t}
      />
      <Narration t={t} at={14}>
        Have you used Deeper look?
      </Narration>
    </AbsoluteFill>
  );
}

function S13Commentary({ t }: SceneProps) {
  const open = layout.sitDeeperOpen;
  const heading = layout.sitCommentary;
  const TAP_AT = 28;
  const OPEN_AT = TAP_AT + 12;
  return (
    <Stage>
      <Narration t={t} top={PHONE_SCENE_TOP}>
        The commentary of Ibn Kathir, verse by verse.
      </Narration>
      <StagePhone t={t} dim={prog(t, OPEN_AT + 10, OPEN_AT + 24) * 0.3}>
        <Swap a="sit-deeper-reader" b="sit-commentary" t={t} at={OPEN_AT} />
        <Touch f={t} at={TAP_AT} rect={open} />
      </StagePhone>
      <Zoom
        crop={fullWidth(heading.y - 14, 360)}
        x={ZOOM_X}
        y={860}
        t={t}
        at={OPEN_AT + 12}
      >
        <Screen src={shot("sit-commentary")} />
      </Zoom>
    </Stage>
  );
}

function S14Brief({ t }: SceneProps) {
  const brief = layout.sitBrief;
  return (
    <Stage>
      <Narration t={t} top={PHONE_SCENE_TOP}>
        Every verse, in short.
      </Narration>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.3}>
        <Screen src={shot("sit-brief")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(brief.y - 10, brief.h + 20)}
        x={ZOOM_X}
        y={800}
        t={t}
        at={10}
      >
        <Screen src={shot("sit-brief")} />
      </Zoom>
    </Stage>
  );
}

// ---- 15-16: the move, and the close ----

function S15Moved({ t }: SceneProps) {
  // The old address types out, then its middle folds away into the new one.
  const typed = Math.min(SITE_OLD.length, Math.floor(t / 1.6));
  const fold = prog(t, 64, 92, ease.inOut);
  const shownOld = SITE_OLD.slice(0, typed);
  const tail = ".vercel";
  const head = "mindfulverse";
  const morphing = typed === SITE_OLD.length;
  return (
    <Stage>
      <div
        style={{
          alignItems: "center",
          background: C.nightRaised,
          border: `2px solid ${C.indigo}`,
          borderRadius: 60,
          color: C.nightInk,
          display: "flex",
          fontFamily: F.ui,
          fontSize: 60,
          fontWeight: 600,
          gap: 18,
          height: 130,
          justifyContent: "center",
          left: 90,
          letterSpacing: "-0.01em",
          position: "absolute",
          right: 90,
          top: 820,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"
            fill="none"
            stroke={morphing ? C.nightIndigo : C.nightSoft}
            strokeWidth="2"
          />
        </svg>
        {morphing ? (
          <span>
            {head}
            <span
              style={{
                display: "inline-block",
                maxWidth: `${(1 - fold) * 5.2}em`,
                opacity: 1 - fold,
                overflow: "hidden",
                verticalAlign: "bottom",
                whiteSpace: "nowrap",
              }}
            >
              {tail}
            </span>
            .app
          </span>
        ) : (
          <span>{shownOld}</span>
        )}
      </div>
      <Narration t={t} at={96} top={1060} size={68}>
        MindfulVerse has moved. Everything you saved came with you.
      </Narration>
    </Stage>
  );
}

function S16End({ t, credit }: SceneProps) {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, #24306f 0%, ${C.night} 70%)`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 520,
        }}
      >
        <Mark frame={t} size={250} />
      </div>
      <Narration t={t} at={18} top={850} size={100}>
        Sit with the Qur’an.
      </Narration>
      <div
        style={{
          ...rise(t, 44, 16),
          color: C.nightIndigo,
          fontFamily: F.ui,
          fontSize: 64,
          fontWeight: 600,
          left: 0,
          position: "absolute",
          right: 0,
          textAlign: "center",
          top: 1010,
        }}
      >
        {SITE}
      </div>
      {credit ? (
        <Note top={1560}>Nasheed: “Alhamdulilah” by Jawad Syed, CC BY 3.0</Note>
      ) : null}
    </AbsoluteFill>
  );
}

const SCENES: Scene[] = [
  S1Room,
  S2Closer,
  S3Wall,
  S4Map,
  S5Tap,
  S6Outside,
  S7Circle,
  S8Count,
  S9Questions,
  S10Friend,
  S11Reply,
  S12Alone,
  S13Commentary,
  S14Brief,
  S15Moved,
  S16End,
];

export function SitWith({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed duration={SIT_DURATION} /> : null}
      <SceneStack scenes={SCENES} lengths={LENGTHS} credit={withNasheed} />
    </AbsoluteFill>
  );
}
