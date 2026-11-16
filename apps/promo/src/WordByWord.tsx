// "Word by word": a 9:16 update in six scenes, on Al-Baqarah 2:282, the
// longest verse in the Qur'an. Tap Deeper look, see each Arabic word with its
// meaning, scroll all 128 of them, and meet the authors. Every screen is a
// capture of the running app (scripts/capture-words.mjs); only the taps, the
// scroll and the rings are drawn on top.
import { AbsoluteFill, Img } from "remotion";

import layout from "../public/screens/three/words-layout.json";
import { C, Credit, Fonts, STATUS, Screen, Touch, VW, ease, prog } from "./kit";
import {
  Caption,
  EndCard,
  Nasheed,
  Ring,
  SITE,
  SceneStack,
  StagePhone,
  TitleCard,
  VerseCredit,
  ZOOM_X,
  Zoom,
  fullWidth,
  shot,
  totalOf,
} from "./threeKit";
import type { Scene, SceneProps } from "./threeKit";

export const WORDS_FPS = 30;

/** Scene lengths in frames, scenes 1 to 6. */
const LENGTHS = [90, 135, 120, 180, 120, 120] as const;
export const WORDS_DURATION = totalOf(LENGTHS);

// As the app credits them (WORD_MEANINGS_CREDIT in packages/core).
const AUTHORS = "Word meanings by Dr. Shehnaz Shaikh and Ms. Kausar Khatri";

/** The authors' credit under the phone, whenever their meanings show. */
function WordsCredit() {
  return (
    <Credit
      style={{
        left: 0,
        position: "absolute",
        right: 0,
        textAlign: "center",
        top: 1850,
      }}
    >
      {AUTHORS}
    </Credit>
  );
}

function S1Title({ t }: SceneProps) {
  return <TitleCard t={t}>New: every verse, word by word.</TitleCard>;
}

function S2Tap({ t }: SceneProps) {
  const open = layout.wordsOpen;
  const DOWN_AT = 44;
  const TAP_AT = 88;
  const OPEN_AT = TAP_AT + 12;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Al-Baqarah 282, the longest verse
      </Caption>
      <StagePhone t={t} from="below">
        <Screen src={shot("words-reader-top")} />
        <Screen
          src={shot("words-reader-open")}
          opacity={prog(t, DOWN_AT, DOWN_AT + 10)}
        />
        <Screen
          src={shot("words-sheet")}
          opacity={prog(t, OPEN_AT, OPEN_AT + 8)}
        />
        {t < OPEN_AT + 8 ? (
          <>
            <Ring t={t} at={DOWN_AT + 14} until={OPEN_AT} rect={open} />
            <Touch f={t} at={TAP_AT} rect={open} />
          </>
        ) : null}
      </StagePhone>
      <VerseCredit />
    </AbsoluteFill>
  );
}

function S3Meaning({ t }: SceneProps) {
  const top = layout.wordsList.y - 8;
  const end = layout.wordsCloseUpEnd;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Each Arabic word, with its meaning
      </Caption>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.25}>
        <Screen src={shot("words-sheet")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(top, end.y + end.h + 12 - top)}
        x={ZOOM_X}
        y={1000}
        t={t}
        at={10}
      >
        <Screen src={shot("words-sheet")} />
      </Zoom>
      <WordsCredit />
    </AbsoluteFill>
  );
}

/** The word list sliding up inside the sheet, under its fixed header. */
function S4All({ t }: SceneProps) {
  const body = layout.wordsBody;
  const list = layout.wordsList;
  const tall = layout.wordsTall;
  // Stop with the last rows resting above the bottom of the sheet.
  const travel = tall.h - (body.h - (list.y - body.y)) + 40;
  const y = prog(t, 16, 168, ease.inOut) * travel;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        All {layout.wordsCount} words of it
      </Caption>
      <StagePhone t={t}>
        <Screen src={shot("words-sheet")} />
        <div
          style={{
            background: C.cotton,
            height: body.h,
            left: 0,
            overflow: "hidden",
            position: "absolute",
            top: STATUS + body.y,
            width: VW,
          }}
        >
          <Img
            src={shot("words-all")}
            style={{
              left: list.x,
              position: "absolute",
              top: list.y - body.y - y,
              width: tall.w,
            }}
          />
        </div>
      </StagePhone>
      <WordsCredit />
    </AbsoluteFill>
  );
}

function S5Authors({ t }: SceneProps) {
  const credit = layout.wordsCredit;
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Caption t={t} from={0} to={999}>
        Shown exactly as the authors wrote them
      </Caption>
      <StagePhone t={t} dim={prog(t, 8, 22) * 0.25}>
        <Screen src={shot("words-credit")} />
      </StagePhone>
      <Zoom
        crop={fullWidth(credit.y - 96, credit.h + 110)}
        x={ZOOM_X}
        y={1040}
        t={t}
        at={10}
      >
        <Screen src={shot("words-credit")} />
        <Ring t={t} at={34} rect={credit} pad={6} />
      </Zoom>
      <WordsCredit />
    </AbsoluteFill>
  );
}

function S6End({ t, credit }: SceneProps) {
  return (
    <EndCard
      t={t}
      credit={credit}
      headline="Word by word."
      lines={[{ link: true, text: SITE }]}
    />
  );
}

const SCENES: Scene[] = [S1Title, S2Tap, S3Meaning, S4All, S5Authors, S6End];

export function WordByWord({ withNasheed }: { withNasheed: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.cotton }}>
      <Fonts />
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md). */}
      {withNasheed ? <Nasheed duration={WORDS_DURATION} /> : null}
      <SceneStack scenes={SCENES} lengths={LENGTHS} credit={withNasheed} />
    </AbsoluteFill>
  );
}
