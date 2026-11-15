// "Deeper look": a 9:16 update in six scenes. Tap Deeper look under a verse,
// see where else its subject is mentioned, open one of those verses, and read
// the commentary with each quoted verse on its own line. Every screen is a
// capture of the running app (scripts/capture-deeper.mjs); only the taps and
// rings are drawn on top.
import { AbsoluteFill } from "remotion";

import layout from "../public/screens/three/deeper-layout.json";
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

export const DEEPER_FPS = 30;

/** Scene lengths in frames, scenes 1 to 6. */
const LENGTHS = [90, 120, 120, 105, 120, 120] as const;
export const DEEPER_DURATION = totalOf(LENGTHS);

function S1Title({ t }: SceneProps) {
  return <TitleCard t={t}>New: a deeper look at every verse.</TitleCard>;
}

function S2Tap({ t }: SceneProps) {
  const open = layout.deeperOpen;
  const top = layout.deeperTranslation.y - 10;
  const TAP_AT = 70;
  const OPEN_AT = TAP_AT + 12;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Tap Deeper look under any verse
      </Caption>
      <StagePhone t={t} from="below">
        <Swap a="deeper-reader" b="deeper-sheet" t={t} at={OPEN_AT} />
        <Touch f={t} at={TAP_AT} rect={open} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, open.y + open.h + 18 - top)}
        x={ZOOM_X}
        y={1100}
        t={t}
        at={24}
        until={OPEN_AT - 4}
      >
        <Screen src={shot("deeper-reader")} />
        <Ring t={t} at={36} rect={open} pad={6} />
        <Touch f={t} at={TAP_AT} rect={open} />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S3Mentioned({ t }: SceneProps) {
  const related = layout.deeperRelated;
  const topic = layout.deeperTopic;
  const first = layout.deeperFirstVerse;
  const TAP_AT = 44;
  const OPEN_AT = TAP_AT + 10;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        See where else it is mentioned
      </Caption>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.25}>
        <Swap a="deeper-sheet" b="deeper-topic-open" t={t} at={OPEN_AT} />
      </StagePhone>
      <Zoom
        crop={fullWidth(related.y - 10, related.h + 12)}
        x={ZOOM_X}
        y={1180}
        t={t}
        at={10}
        until={OPEN_AT - 2}
      >
        <Screen src={shot("deeper-sheet")} />
        <Touch f={t} at={TAP_AT} rect={topic} />
      </Zoom>
      <Zoom
        crop={fullWidth(topic.y - 4, topic.h + first.h + 14)}
        x={ZOOM_X}
        y={1040}
        t={t}
        at={OPEN_AT + 2}
      >
        <Screen src={shot("deeper-topic-open")} />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S4Open({ t }: SceneProps) {
  const first = layout.deeperFirstVerse;
  const link = layout.deeperFirstLink;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Open any of them in the reader
      </Caption>
      <StagePhone t={t} dim={0.25}>
        <Screen src={shot("deeper-topic-open")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(first.y - 6, first.h + 10)}
        x={ZOOM_X}
        y={1100}
        t={t}
        at={6}
      >
        <Screen src={shot("deeper-topic-open")} />
        <Ring t={t} at={26} rect={link} pad={5} />
        <Touch f={t} at={66} rect={link} />
      </Zoom>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S5Commentary({ t }: SceneProps) {
  const top = layout.deeperLines.y - 6;
  const bottom = layout.deeperLastLine.y + layout.deeperLastLine.h + 14;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        The commentary, one verse per line
      </Caption>
      <StagePhone t={t} dim={prog(t, 10, 24) * 0.25}>
        <Screen src={shot("deeper-commentary")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, bottom - top)}
        x={ZOOM_X}
        y={780}
        t={t}
        at={14}
      >
        <Screen src={shot("deeper-commentary")} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S6End({ t, credit }: SceneProps) {
  return (
    <EndCard
      t={t}
      credit={credit}
      headline="Look deeper."
      lines={[{ link: true, text: SITE }]}
    />
  );
}

const SCENES: Scene[] = [
  S1Title,
  S2Tap,
  S3Mentioned,
  S4Open,
  S5Commentary,
  S6End,
];

export function DeeperLook({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed duration={DEEPER_DURATION} /> : null}
      <SceneStack scenes={SCENES} lengths={LENGTHS} credit={withNasheed} />
    </AbsoluteFill>
  );
}
