// "Read together": a 9:16 update in eight scenes. A circle chooses this
// week's verses of Al-Mulk, sees how many are reading (never who), gets
// questions for when they meet, invites with a QR code, and moves on to next
// week's verses; then "In short" in Deeper look. Every screen is a capture of
// the running app with invented test data (scripts/capture-together.mjs);
// only the taps and rings are drawn on top.
import { AbsoluteFill } from "remotion";

import layout from "../public/screens/three/together-layout.json";
import { C, Fonts, Screen, Touch, prog } from "./kit";
import {
  Caption,
  EndCard,
  Nasheed,
  Ring,
  SITE,
  SceneStack,
  StagePhone,
  Swap,
  TitleCard,
  VerseCredit,
  ZOOM_X,
  Zoom,
  fullWidth,
  shot,
  totalOf,
} from "./threeKit";
import type { Scene, SceneProps } from "./threeKit";

export const TOGETHER_FPS = 30;

/** Scene lengths in frames, storyboard scenes 1 to 8. */
const LENGTHS = [90, 120, 120, 120, 120, 120, 165, 120] as const;
export const TOGETHER_DURATION = totalOf(LENGTHS);

function S1Title({ t }: SceneProps) {
  return <TitleCard t={t}>New: read together, week by week.</TitleCard>;
}

function S2Week({ t }: SceneProps) {
  const field = layout.togetherPortionField;
  const select = layout.togetherPortion;
  const TAP_AT = 46;
  const PICK_AT = TAP_AT + 14;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Choose this week’s verses
      </Caption>
      <StagePhone t={t} from="below">
        <Swap
          a="together-form-whole"
          b="together-form-week"
          t={t}
          at={PICK_AT}
        />
      </StagePhone>
      <Zoom
        crop={fullWidth(field.y - 8, field.h + 16)}
        x={ZOOM_X}
        y={1240}
        t={t}
        at={22}
      >
        <Swap
          a="together-form-whole"
          b="together-form-week"
          t={t}
          at={PICK_AT}
        />
        <Touch f={t} at={TAP_AT} rect={select} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S3Home({ t }: SceneProps) {
  const lead = layout.togetherLead;
  const count = layout.togetherCount;
  const top = lead.y - 8;
  const bottom = count.y + count.h + 10;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        See how many are reading, never who
      </Caption>
      <StagePhone t={t} dim={prog(t, 10, 24) * 0.25}>
        <Screen src={shot("together-home")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, bottom - top)}
        x={ZOOM_X}
        y={820}
        t={t}
        at={12}
      >
        <Screen src={shot("together-home")} />
        <Ring t={t} at={52} rect={count} pad={6} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S4Questions({ t }: SceneProps) {
  const toggle = layout.togetherQuestionsToggle;
  const block = layout.togetherQuestions;
  const TAP_AT = 30;
  const OPEN_AT = TAP_AT + 10;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Questions ready for when you meet
      </Caption>
      <StagePhone t={t} dim={prog(t, OPEN_AT, OPEN_AT + 14) * 0.25}>
        <Swap a="together-card" b="together-questions" t={t} at={OPEN_AT} />
        <Touch f={t} at={TAP_AT} rect={toggle} />
      </StagePhone>
      <Zoom
        crop={fullWidth(block.y - 8, block.h + 16)}
        x={ZOOM_X}
        y={1080}
        t={t}
        at={OPEN_AT + 4}
      >
        <Screen src={shot("together-questions")} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S5Qr({ t }: SceneProps) {
  const button = layout.togetherQrButton;
  const qr = layout.togetherQr;
  const TAP_AT = 30;
  const OPEN_AT = TAP_AT + 10;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Friends join with one scan
      </Caption>
      <StagePhone t={t} dim={prog(t, OPEN_AT, OPEN_AT + 14) * 0.25}>
        <Swap a="together-share" b="together-qr" t={t} at={OPEN_AT} />
        <Touch f={t} at={TAP_AT} rect={button} />
      </StagePhone>
      <Zoom
        crop={fullWidth(qr.y - 10, qr.h + 20)}
        x={ZOOM_X}
        y={860}
        t={t}
        at={OPEN_AT + 4}
      >
        <Screen src={shot("together-qr")} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S6Next({ t }: SceneProps) {
  const summary = layout.togetherSummary;
  const row = layout.togetherNextRow;
  const button = layout.togetherNextButton;
  const top = summary.y - 10;
  const bottom = row.y + row.h + 10;
  const TAP_AT = 50;
  const MOVE_AT = TAP_AT + 12;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Move on together
      </Caption>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.25}>
        <Swap
          a="together-before-next"
          b="together-after-next"
          t={t}
          at={MOVE_AT}
        />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, bottom - top)}
        x={ZOOM_X}
        y={1000}
        t={t}
        at={10}
      >
        <Swap
          a="together-before-next"
          b="together-after-next"
          t={t}
          at={MOVE_AT}
        />
        <Ring t={t} at={24} until={TAP_AT} rect={button} pad={6} />
        <Touch f={t} at={TAP_AT} rect={button} />
        <Ring t={t} at={MOVE_AT + 14} rect={summary} pad={4} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S7InShort({ t }: SceneProps) {
  const open = layout.briefOpen;
  const brief = layout.brief;
  const TAP_AT = 30;
  const OPEN_AT = TAP_AT + 12;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        And “In short” explains every verse
      </Caption>
      <StagePhone t={t} dim={prog(t, OPEN_AT + 6, OPEN_AT + 20) * 0.25}>
        <Swap a="brief-reader" b="brief-sheet" t={t} at={OPEN_AT} />
        <Touch f={t} at={TAP_AT} rect={open} />
      </StagePhone>
      <Zoom
        crop={fullWidth(brief.y - 8, brief.h + 16)}
        x={ZOOM_X}
        y={1000}
        t={t}
        at={OPEN_AT + 8}
      >
        <Screen src={shot("brief-sheet")} />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S8End({ t, credit }: SceneProps) {
  return (
    <EndCard
      t={t}
      credit={credit}
      headline="Read together."
      lines={[{ link: true, text: SITE }]}
    />
  );
}

const SCENES: Scene[] = [
  S1Title,
  S2Week,
  S3Home,
  S4Questions,
  S5Qr,
  S6Next,
  S7InShort,
  S8End,
];

export function ReadTogether({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed duration={TOGETHER_DURATION} /> : null}
      <SceneStack scenes={SCENES} lengths={LENGTHS} credit={withNasheed} />
    </AbsoluteFill>
  );
}
