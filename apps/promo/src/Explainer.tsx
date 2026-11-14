// "Explainer": a 9:16 minute on what MindfulVerse is. The problem, the three
// steps of one surah journal, the follow-up a week later, the surah's own
// page, circles, and what the app will not do. Every screen in a phone or a
// card is a capture of the running app with invented test data
// (scripts/capture-three.mjs); the typing, taps and rings are drawn on top.
// The silent version takes a voiceover, so nothing but the translation
// credit sits in the bottom 12% of the frame.
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import layout from "../public/screens/three/layout.json";
import { C, F, Fonts, Mark, Screen, Touch, beat, ease, prog } from "./kit";
import {
  ACTION,
  CAP_TOP,
  CAP_X,
  EndCard,
  Nasheed,
  REFLECTION,
  Ring,
  SITE,
  SceneStack,
  StagePhone,
  Swap,
  TitleCard,
  TypedField,
  VerseCredit,
  W,
  ZOOM_X,
  Zoom,
  fullWidth,
  shot,
  totalOf,
} from "./threeKit";
import type { Scene, SceneProps } from "./threeKit";

export const EXPLAINER_FPS = 30;

/** Scene lengths in frames, storyboard scenes 1 to 13. */
const LENGTHS = [
  90, 135, 120, 180, 150, 135, 165, 135, 240, 120, 120, 90, 150,
] as const;
export const EXPLAINER_DURATION = totalOf(LENGTHS);

// A smaller phone, higher up: it ends above the bottom 12% of the frame.
const PHONE = { width: 500, x: (W - 500) / 2, y: 570 };
const CREDIT_TOP = 1716;

// ---- Words ----

/** Caption lines stacked from the top; each child brings its own timing. */
function Words({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 22,
        left: CAP_X,
        position: "absolute",
        right: CAP_X,
        top: CAP_TOP,
      }}
    >
      {children}
    </div>
  );
}

function Lead({ t, from = 0, children }: Line) {
  return (
    <div
      style={{
        color: C.indigoDeep,
        fontFamily: F.ui,
        fontSize: 70,
        fontWeight: 600,
        letterSpacing: "-0.03em",
        lineHeight: 1.1,
        textWrap: "balance",
        ...beat(t, from, 9999),
      }}
    >
      {children}
    </div>
  );
}

/** The second line of a caption, added beneath the first. */
function Sub({ t, from = 0, children }: Line) {
  return (
    <div
      style={{
        color: C.indigo,
        fontFamily: F.ui,
        fontSize: 50,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        lineHeight: 1.15,
        ...beat(t, from, 9999),
      }}
    >
      {children}
    </div>
  );
}

interface Line {
  t: number;
  from?: number;
  children: ReactNode;
}

function Caption({ t, children }: Line) {
  return (
    <Words>
      <Lead t={t}>{children}</Lead>
    </Words>
  );
}

// ---- Scenes (t is the scene's own frame) ----

function S1Problem({ t }: SceneProps) {
  return <TitleCard t={t}>Most of us read a surah and move on.</TitleCard>;
}

function S2What({ t }: SceneProps) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <div style={{ left: CAP_X, position: "absolute", top: 300 }}>
        <Mark frame={t} size={230} />
      </div>
      <div
        style={{
          display: "grid",
          gap: 34,
          left: CAP_X,
          position: "absolute",
          right: CAP_X,
          top: 620,
        }}
      >
        <div
          style={{
            color: C.indigoDeep,
            fontFamily: F.ui,
            fontSize: 92,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            textWrap: "balance",
            ...beat(t, 14, 9999),
          }}
        >
          MindfulVerse helps you stay with one.
        </div>
        <div
          style={{
            color: C.inkSoft,
            fontFamily: F.text,
            fontSize: 56,
            lineHeight: 1.3,
            textWrap: "balance",
            ...beat(t, 64, 9999),
          }}
        >
          A free app for pondering the Qur’an.
        </div>
      </div>
    </AbsoluteFill>
  );
}

function S3Pick({ t }: SceneProps) {
  const opened = prog(t, 66, 82, ease.inOut);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t}>1. Pick a surah</Caption>
      <VerseCredit top={CREDIT_TOP} />
      <StagePhone t={t} from="below" place={PHONE}>
        <Screen src={shot("home-begin")} />
        <Ring t={t} at={30} until={60} rect={layout.beginChip} pad={4} />
        <Touch f={t} at={50} rect={layout.beginChip} />
        <div
          style={{
            inset: 0,
            opacity: opened,
            position: "absolute",
            transform: `translateX(${(1 - opened) * 120}px)`,
          }}
        >
          <Screen src={shot("intention-empty")} />
        </div>
      </StagePhone>
    </AbsoluteFill>
  );
}

function S4Verse({ t }: SceneProps) {
  const top = layout.verse.y - 10;
  const bottom = layout.verseTranslation.y + layout.verseTranslation.h + 18;
  const VERSE_OUT = 78;
  const OPEN_AT = 88;
  const dim =
    prog(t, 12, 26) * (1 - prog(t, VERSE_OUT, VERSE_OUT + 10)) +
    prog(t, OPEN_AT + 26, OPEN_AT + 40);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t}>2. Go verse by verse, with Ibn Kathir</Caption>
      <StagePhone t={t} dim={dim * 0.25} place={PHONE}>
        <Swap a="verse" b="verse-commentary" t={t} at={OPEN_AT + 12} />
        <Touch f={t} at={OPEN_AT} rect={layout.commentaryOpen} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, bottom - top)}
        x={ZOOM_X}
        y={1170}
        t={t}
        at={14}
        until={VERSE_OUT}
      >
        <Screen src={shot("verse")} />
      </Zoom>
      <Zoom
        crop={fullWidth(layout.commentaryCard.y - 4, 168)}
        x={ZOOM_X}
        y={1210}
        t={t}
        at={OPEN_AT + 28}
      >
        <Screen src={shot("verse-commentary")} />
      </Zoom>
      <VerseCredit top={CREDIT_TOP} />
    </AbsoluteFill>
  );
}

/** One of the tadabbur questions being answered: label and field, large. */
function Question({
  t,
  caption,
  empty,
  filled,
  text,
  perFrame,
}: {
  t: number;
  caption: string;
  empty: string;
  filled: string;
  text: string;
  perFrame: number;
}) {
  const field = layout.reflectField;
  const top = layout.reflectLabel.y - 28;
  const TYPE_AT = 28;
  const done = TYPE_AT + Math.ceil(text.length / perFrame) + 10;
  const typing = (
    <TypedField
      rect={field}
      text={text}
      t={t}
      from={TYPE_AT}
      perFrame={perFrame}
    />
  );
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t}>{caption}</Caption>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.25} place={PHONE}>
        <Swap a={empty} b={filled} t={t} at={done} />
        {t >= TYPE_AT && t < done + 8 ? typing : null}
      </StagePhone>
      <Zoom
        crop={fullWidth(top, field.y + field.h + 14 - top)}
        x={ZOOM_X}
        y={1180}
        t={t}
        at={8}
      >
        <Screen src={shot(empty)} />
        {typing}
      </Zoom>
      <VerseCredit top={CREDIT_TOP} />
    </AbsoluteFill>
  );
}

function S5Write({ t }: SceneProps) {
  return (
    <Question
      t={t}
      caption="3. Write what it says to you"
      empty="reflect-empty"
      filled="reflect-typed"
      text={REFLECTION}
      perFrame={0.5}
    />
  );
}

function S6Action({ t }: SceneProps) {
  return (
    <Question
      t={t}
      caption="And one thing you will do"
      empty="action-empty"
      filled="action-typed"
      text={ACTION}
      perFrame={0.55}
    />
  );
}

function S7FollowUp({ t }: SceneProps) {
  const ask = layout.followup;
  const note = layout.followupNote;
  const YES_AT = 104;
  const grown = prog(t, YES_AT + 12, YES_AT + 30, ease.drawer);
  const SCALE = 2.3;
  const crop = {
    h: ask.h + 12 + (note.h - ask.h) * grown,
    w: ask.w + 12,
    x: ask.x - 6,
    y: ask.y - 6,
  };
  const screens = (
    <Swap a="home-followup" b="home-followup-yes" t={t} at={YES_AT + 12} />
  );
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t}>A week later, it asks: did you do it?</Caption>
      <StagePhone t={t} dim={prog(t, 26, 40) * 0.3} place={PHONE}>
        {screens}
      </StagePhone>
      <Zoom
        crop={crop}
        scale={SCALE}
        x={(W - crop.w * SCALE) / 2}
        y={630}
        t={t}
        at={28}
      >
        {screens}
        <Touch f={t} at={YES_AT} rect={layout.followupYes} />
      </Zoom>
      <VerseCredit top={CREDIT_TOP} />
    </AbsoluteFill>
  );
}

function S8Page({ t }: SceneProps) {
  const item = layout.journalItem;
  // The verse's card: its reference and translation, then what was written.
  const top = item.y - 96;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t}>Everything you write is kept on its own page</Caption>
      <StagePhone t={t} dim={prog(t, 34, 48) * 0.25} place={PHONE}>
        <Screen src={shot("surah-journal")} />
        <Ring t={t} at={12} until={36} rect={layout.journalHeading} pad={4} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, item.y + item.h + 22 - top)}
        x={ZOOM_X}
        y={1010}
        t={t}
        at={36}
      >
        <Screen src={shot("surah-journal")} />
      </Zoom>
      <VerseCredit top={CREDIT_TOP} />
    </AbsoluteFill>
  );
}

function S9Circle({ t }: SceneProps) {
  const SHARE_AT = 116;
  const notice = layout.createdNotice;
  const link = layout.createdLink;
  const top = notice.y - 6;
  const dim =
    prog(t, 22, 36) * (1 - prog(t, SHARE_AT - 14, SHARE_AT - 4)) +
    prog(t, SHARE_AT + 16, SHARE_AT + 30);
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Words>
        <Lead t={t}>Read with friends in a circle</Lead>
        <Sub t={t} from={SHARE_AT}>
          Share one link. No account needed.
        </Sub>
      </Words>
      <StagePhone t={t} dim={dim * 0.25} place={PHONE}>
        <Swap a="home-circle" b="circle-created" t={t} at={SHARE_AT - 6} />
        <Ring t={t} at={SHARE_AT + 6} rect={link} pad={5} />
        <Touch f={t} at={SHARE_AT + 80} rect={layout.createdCopy} />
      </StagePhone>
      <Zoom
        crop={fullWidth(layout.homeLead.y - 6, 124)}
        x={ZOOM_X}
        y={1180}
        t={t}
        at={24}
        until={SHARE_AT - 16}
      >
        <Screen src={shot("home-circle")} />
      </Zoom>
      <Zoom
        crop={fullWidth(top, link.y + link.h + 8 - top)}
        x={ZOOM_X}
        y={760}
        t={t}
        at={SHARE_AT + 18}
      >
        <Screen src={shot("circle-created")} />
      </Zoom>
      <VerseCredit
        top={CREDIT_TOP}
        opacity={1 - prog(t, SHARE_AT - 6, SHARE_AT + 2)}
      />
    </AbsoluteFill>
  );
}

function S10Count({ t }: SceneProps) {
  const count = layout.homeCount;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t}>Your journal stays private</Caption>
      <StagePhone t={t} dim={prog(t, 12, 26) * 0.25} place={PHONE}>
        <Screen src={shot("home-circle")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(count.y - 9, count.h + 20)}
        x={ZOOM_X}
        y={1210}
        t={t}
        at={14}
      >
        <Screen src={shot("home-circle")} />
      </Zoom>
      <VerseCredit top={CREDIT_TOP} opacity={prog(t, 0, 8)} />
    </AbsoluteFill>
  );
}

function S11Source({ t }: SceneProps) {
  return <TitleCard t={t}>Every word from a real source. No AI.</TitleCard>;
}

function S12Free({ t }: SceneProps) {
  return <TitleCard t={t}>Free. No ads.</TitleCard>;
}

function S13End({ t, credit }: SceneProps) {
  return (
    <EndCard
      t={t}
      credit={credit}
      headline="Sit with one surah."
      lines={[
        { link: true, text: SITE },
        { size: 46, text: "On the web. Android app on the way." },
      ]}
    />
  );
}

const SCENES: Scene[] = [
  S1Problem,
  S2What,
  S3Pick,
  S4Verse,
  S5Write,
  S6Action,
  S7FollowUp,
  S8Page,
  S9Circle,
  S10Count,
  S11Source,
  S12Free,
  S13End,
];

export function Explainer({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed duration={EXPLAINER_DURATION} /> : null}
      <SceneStack scenes={SCENES} lengths={LENGTHS} credit={withNasheed} />
    </AbsoluteFill>
  );
}
