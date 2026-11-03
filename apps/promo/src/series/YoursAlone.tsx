// "Yours alone": a 9:16 video about privacy, said only as far as the app says it.
// Storyboard (30 fps, 750 frames = 25 s). Screens are real captures of the web app,
// signed out, with invented entries (scripts/capture-YoursAlone.mjs).
//   0-80    "Your reflections are yours."  phone rises in on the check-in's reflection box
//   82-205  "No sign-up needed."           a reflection is typed word by word, then "Keep in journal"
//   205-250 "Kept in your journal ✓" holds
//   250-420 camera pulls back; Journal fades in; the phone sits alone, no text (quiet)
//   420-566 push in; "Entries live only on this device." highlighted on the screen + caption
//   566-650 Account sign-in screen; "Sign in to back them up." / "Only if you want to."
//   650-750 end card: Mark, "MindfulVerse", mindfulverse.vercel.app (+ music credit in the Nasheed cut)
// The translation credit sits at the foot while the screens show verses.
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import { C, clothTile, F } from "../brand";
import {
  beat,
  Credit,
  Fonts,
  Headline,
  Mark,
  NASHEED,
  NASHEED_CREDIT,
  Phone,
  Screen,
  Touch,
  VH,
  VW,
  STATUS,
  TRANSLATION_CREDIT,
  ease,
  prog,
  rise,
} from "../kit";

export const YOURSALONE_DURATION = 750;
export const meta = {
  durationInFrames: YOURSALONE_DURATION,
  height: 1920,
  id: "YoursAlone",
  width: 1080,
};

const WORDS = 13;
const TYPE_START = 96;
const PER_WORD = 7;
const PHONE_W = 640;
const PHONE_X = 220;
const PHONE_Y = 380;
const CENTER_Y = 1094;
const shot = (n: string) => staticFile(`screens/series/YoursAlone/${n}.png`);

function Caption({
  children,
  from,
  to,
  size = 84,
  sub,
}: {
  children: string;
  from: number;
  to: number;
  size?: number;
  sub?: string;
}) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        ...beat(f, from, to),
        left: 80,
        position: "absolute",
        right: 80,
        textAlign: "center",
        top: 120,
      }}
    >
      <Headline size={size}>{children}</Headline>
      {sub ? (
        <div
          style={{
            color: C.inkSoft,
            fontFamily: F.ui,
            fontSize: 44,
            fontWeight: 500,
            marginTop: 22,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function YoursAlone({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  const typedN = Math.max(
    0,
    Math.min(WORDS, Math.floor((f - TYPE_START) / PER_WORD))
  );
  const phoneIn = prog(f, 34, 70);
  const phoneOut = prog(f, 636, 654, ease.inOut);
  const scale =
    1 -
    0.44 * prog(f, 250, 312, ease.inOut) +
    0.44 * prog(f, 420, 462, ease.inOut);
  const dy =
    (960 - CENTER_Y) *
    (prog(f, 250, 312, ease.inOut) - prog(f, 420, 462, ease.inOut));
  const breathe = f > 330 && f < 420 ? Math.sin((f - 330) / 28) * 0.004 : 0;
  const kept = f >= 205 ? 1 : 0;
  const journal = prog(f, 316, 328, ease.drawer);
  const journalOut = prog(f, 572, 584, ease.drawer);
  const hl = prog(f, 474, 500);
  const hlOut = prog(f, 556, 566);
  const end = prog(f, 650, 668);
  return (
    <AbsoluteFill style={{ backgroundColor: C.cotton }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(x) =>
            interpolate(
              x,
              [0, 24, YOURSALONE_DURATION - 60, YOURSALONE_DURATION],
              [0, 0.8, 0.8, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            )
          }
        />
      ) : null}
      <AbsoluteFill
        style={{
          backgroundImage: clothTile(C.indigo, 0.05, 120),
          opacity: 1 - end * 0.5,
        }}
      />

      <Caption from={0} to={84}>
        Your reflections are yours.
      </Caption>
      <Caption from={84} to={206}>
        No sign-up needed.
      </Caption>
      <Caption from={466} to={566}>
        Entries live only on this device.
      </Caption>
      <Caption from={570} to={652} sub="Only if you want to.">
        Sign in to back them up.
      </Caption>

      <div
        style={{
          inset: 0,
          opacity: phoneIn * (1 - phoneOut),
          position: "absolute",
          transform: `translateY(${(1 - phoneIn) * 120 + dy}px) scale(${scale + breathe})`,
          transformOrigin: `540px ${CENTER_Y}px`,
        }}
      >
        <Phone x={PHONE_X} y={PHONE_Y} width={PHONE_W}>
          <div
            style={{
              height: VH + STATUS,
              left: 0,
              overflow: "hidden",
              position: "absolute",
              top: 0,
              transform: `translateX(${-journal * 100}px)`,
              width: VW,
            }}
          >
            <Screen src={shot(`type-${typedN}`)} />
            <Screen src={shot("kept")} opacity={kept} />
          </div>
          <div
            style={{
              height: VH + STATUS,
              left: 0,
              position: "absolute",
              top: 0,
              transform: `translateX(${(1 - journal) * VW - journalOut * 100}px)`,
              width: VW,
            }}
          >
            <Screen src={shot("journal")} />
          </div>
          <div
            style={{
              height: VH + STATUS,
              left: 0,
              position: "absolute",
              top: 0,
              transform: `translateX(${(1 - journalOut) * VW}px)`,
              width: VW,
            }}
          >
            <Screen src={shot("account")} />
          </div>
          <Touch f={f} at={193} rect={{ h: 48, w: 152, x: 22, y: 692 }} />
          <div
            style={{
              background: `${C.indigo}1f`,
              border: `2px solid ${C.indigo}`,
              borderRadius: 10,
              height: 58,
              left: 14,
              opacity: hl * (1 - hlOut),
              position: "absolute",
              top: 30 + 76,
              width: 362,
              clipPath: `inset(0 ${(1 - hl) * 100}% 0 0)`,
            }}
          />
        </Phone>
      </div>

      <div
        style={{
          bottom: 50,
          left: 0,
          opacity: prog(f, 60, 80) * (1 - prog(f, 636, 652)),
          position: "absolute",
          right: 0,
          textAlign: "center",
        }}
      >
        <Credit color={C.inkFaint} style={{ fontSize: 26 }}>
          {TRANSLATION_CREDIT}
        </Credit>
      </div>

      {f >= 650 ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: end,
          }}
        >
          <Mark frame={f - 650} size={220} />
          <div
            style={{
              ...rise(f, 664),
              color: C.indigoDeep,
              fontFamily: F.ui,
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              marginTop: 44,
            }}
          >
            MindfulVerse
          </div>
          <div
            style={{
              ...rise(f, 676),
              color: C.inkSoft,
              fontFamily: F.ui,
              fontSize: 40,
              fontWeight: 500,
              marginTop: 16,
            }}
          >
            mindfulverse.vercel.app
          </div>
          {withNasheed ? (
            <Credit
              style={{
                ...rise(f, 688),
                bottom: 70,
                position: "absolute",
                textAlign: "center",
              }}
            >
              {NASHEED_CREDIT}
            </Credit>
          ) : null}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}
