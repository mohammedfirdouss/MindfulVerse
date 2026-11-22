// "Passage by passage": a 9:16 update in nine scenes, about 45 seconds.
// Surah Yusuf as an unbroken wall, then its map of 22 titled passages, a tap
// on "They told their father that Yusuf was eaten by a wolf", the reader
// landing on that passage's heading, then the maps of two long surahs,
// Al-A'raf and Al-Ma'idah. Every screen is a capture of the running app
// (scripts/capture-passages.mjs); only the taps and rings are drawn on top.
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import layout from "../public/screens/three/passages-layout.json";
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

export const PASSAGES_FPS = 30;

/** Scene lengths in frames, storyboard scenes 1 to 9 (1,350 frames, 45 s). */
const LENGTHS = [105, 120, 150, 180, 135, 165, 165, 165, 165] as const;
export const PASSAGES_DURATION = totalOf(LENGTHS);

function S1Title({ t }: SceneProps) {
  return (
    <TitleCard t={t}>
      A long surah.
      <br />
      Where do you begin?
    </TitleCard>
  );
}

function S2Wall({ t }: SceneProps) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        111 verses.
      </Caption>
      <StagePhone t={t} from="below">
        <Screen src={shot("passages-wall")} />
      </StagePhone>
    </AbsoluteFill>
  );
}

function S3Map({ t }: SceneProps) {
  const summary = layout.passagesSummary;
  const list = layout.passagesList;
  const TAP_AT = 34;
  const OPEN_AT = TAP_AT + 10;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Now every surah opens as a map.
      </Caption>
      <StagePhone t={t} dim={prog(t, OPEN_AT + 6, OPEN_AT + 20) * 0.25}>
        <Swap a="passages-folded" b="passages-open" t={t} at={OPEN_AT} />
        <Touch f={t} at={TAP_AT} rect={summary} />
      </StagePhone>
      <Zoom
        crop={fullWidth(list.y - 52, 330)}
        x={ZOOM_X}
        y={860}
        t={t}
        at={OPEN_AT + 8}
      >
        <Screen src={shot("passages-open")} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S4Titles({ t }: SceneProps) {
  const wolf = layout.passagesWolf;
  const SCROLL_AT = 40;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Titled passages, so you know what each part is about.
      </Caption>
      <StagePhone t={t} dim={prog(t, SCROLL_AT + 14, SCROLL_AT + 28) * 0.25}>
        <Swap a="passages-open" b="passages-wolf" t={t} at={SCROLL_AT} />
      </StagePhone>
      <Zoom
        crop={fullWidth(wolf.y - 140, 330)}
        x={ZOOM_X}
        y={900}
        t={t}
        at={SCROLL_AT + 12}
      >
        <Screen src={shot("passages-wolf")} />
        <Ring t={t} at={SCROLL_AT + 46} rect={wolf} pad={4} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S5Tap({ t }: SceneProps) {
  const wolf = layout.passagesWolf;
  const TAP_AT = 30;
  const LAND_AT = TAP_AT + 12;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <VerseCredit opacity={prog(t, LAND_AT, LAND_AT + 10)} />
      <Caption t={t} from={0} to={999}>
        Tap one. You’re there.
      </Caption>
      <StagePhone t={t}>
        <Swap a="passages-wolf" b="passages-landed" t={t} at={LAND_AT} />
        <Touch f={t} at={TAP_AT} rect={wolf} />
      </StagePhone>
    </AbsoluteFill>
  );
}

function S6Read({ t }: SceneProps) {
  const heading = layout.passagesHeading;
  const verse = layout.passagesFirstVerse;
  const top = heading.y - 6;
  const bottom = verse.y + verse.h + 6;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <VerseCredit />
      <Caption t={t} from={0} to={999}>
        Read it. Ponder it. Then the next.
      </Caption>
      <StagePhone t={t} dim={prog(t, 6, 20) * 0.25}>
        <Screen src={shot("passages-landed")} />
      </StagePhone>
      <Zoom crop={fullWidth(top, bottom - top)} x={ZOOM_X} y={700} t={t} at={8}>
        <Screen src={shot("passages-landed")} />
      </Zoom>
    </AbsoluteFill>
  );
}

/** A long surah's map: the phone, then its first titles magnified. */
function LongSurah({
  t,
  caption,
  screen,
  list,
}: {
  t: number;
  caption: ReactNode;
  screen: string;
  list: { y: number };
}) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        {caption}
      </Caption>
      <StagePhone t={t} from="below" dim={prog(t, 34, 48) * 0.25}>
        <Screen src={shot(screen)} />
      </StagePhone>
      <Zoom crop={fullWidth(list.y - 50, 330)} x={ZOOM_X} y={900} t={t} at={40}>
        <Screen src={shot(screen)} />
      </Zoom>
    </AbsoluteFill>
  );
}

function S7Araf({ t }: SceneProps) {
  return (
    <LongSurah
      t={t}
      screen="passages-araf"
      list={layout.passagesArafList}
      caption={<>Every surah. Al‑A’raf: 206 verses, 39 passages.</>}
    />
  );
}

function S8Maidah({ t }: SceneProps) {
  return (
    <LongSurah
      t={t}
      screen="passages-maidah"
      list={layout.passagesMaidahList}
      caption={<>Al‑Ma’idah: 120 verses, 37 passages.</>}
    />
  );
}

function S9End({ t, credit }: SceneProps) {
  return (
    <EndCard
      t={t}
      credit={credit}
      headline="Passage by passage."
      lines={[
        { text: "Read a surah, one passage at a time." },
        { link: true, text: SITE },
      ]}
    />
  );
}

const SCENES: Scene[] = [
  S1Title,
  S2Wall,
  S3Map,
  S4Titles,
  S5Tap,
  S6Read,
  S7Araf,
  S8Maidah,
  S9End,
];

export function Passages({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed duration={PASSAGES_DURATION} /> : null}
      <SceneStack scenes={SCENES} lengths={LENGTHS} credit={withNasheed} />
    </AbsoluteFill>
  );
}
