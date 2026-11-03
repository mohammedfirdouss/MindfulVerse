// "Two ways to read": 9:16, 25 s. The reader's two views, then by surah or by juz.
// Real captures of /read and /read/94 (scripts/capture-TwoWaysToRead.mjs). The view
// choice is in the "Reading settings" sheet (Aa), so the video taps Aa, then Reading.
// Storyboard (30 fps, 750 frames):
//   0-100   "The Qur’an, with translation and commentary."  (Home "Read" entry desc) phone rises in on Ash-Sharh, Translation view
//   100-318 "Translation, or Reading."  tap Aa; sheet; tap Reading; Done; page cross-fades to flowing Arabic (settles down)
//   318-596 "By surah, or by juz."      Read index (Surah) -> tap Juz -> juz list
//   596-750 end card: Mark, MindfulVerse, URL, translation credit (+ music credit in the Nasheed cut)
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import layout from "../../public/screens/series/TwoWaysToRead/layout.json";
import { C, clothTile, F } from "../brand";
import {
  beat,
  Credit,
  ease,
  Fonts,
  Headline,
  Mark,
  NASHEED,
  NASHEED_CREDIT,
  Phone,
  prog,
  rise,
  Screen,
  Touch,
  TRANSLATION_CREDIT,
} from "../kit";

export const TWOWAYSTOREAD_DURATION = 750;
export const meta = {
  durationInFrames: TWOWAYSTOREAD_DURATION,
  height: 1920,
  id: "TwoWaysToRead",
  width: 1080,
};

const PHONE_W = 640;
const PHONE_X = 220;
const PHONE_Y = 380;
const shot = (n: string) => staticFile(`screens/series/TwoWaysToRead/${n}.png`);

function Caption({
  children,
  from,
  to,
  size = 84,
  kicker,
}: {
  children: string;
  from: number;
  to: number;
  size?: number;
  kicker?: string;
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
        top: kicker ? 90 : 120,
      }}
    >
      {kicker ? (
        <div
          style={{
            color: C.indigo,
            fontFamily: F.ui,
            fontSize: 38,
            fontWeight: 600,
            letterSpacing: "0.04em",
            marginBottom: 14,
          }}
        >
          {kicker}
        </div>
      ) : null}
      <Headline size={size}>{children}</Headline>
    </div>
  );
}

export function TwoWaysToRead({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  const phoneIn = prog(f, 20, 54);
  const phoneOut = prog(f, 584, 602, ease.inOut);
  const sheet = prog(f, 136, 148);
  const sheetR = prog(f, 190, 198);
  const sheetOut = prog(f, 238, 246);
  const reading = prog(f, 240, 262);
  const readingOut = prog(f, 328, 348);
  const surah = prog(f, 332, 354);
  const juz = prog(f, 424, 442);
  const end = prog(f, 602, 620);
  const settle = (1 - prog(f, 240, 270)) * -18;
  const settleIdx = (1 - prog(f, 332, 362)) * 14;
  return (
    <AbsoluteFill style={{ backgroundColor: C.cotton }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(x) =>
            interpolate(
              x,
              [0, 24, TWOWAYSTOREAD_DURATION - 60, TWOWAYSTOREAD_DURATION],
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

      <Caption from={-14} to={102} size={68} kicker="Read">
        The Qur’an, with translation and commentary.
      </Caption>
      <Caption from={102} to={326}>
        Translation, or Reading.
      </Caption>
      <Caption from={328} to={598}>
        By surah, or by juz.
      </Caption>

      <div
        style={{
          inset: 0,
          opacity: phoneIn * (1 - phoneOut),
          position: "absolute",
          transform: `translateY(${(1 - phoneIn) * 120}px)`,
        }}
      >
        <Phone x={PHONE_X} y={PHONE_Y} width={PHONE_W}>
          <Screen src={shot("s94-translation")} opacity={1 - reading} />
          <Screen
            src={shot("sheet-translation")}
            opacity={sheet * (1 - sheetR)}
          />
          <Screen
            src={shot("sheet-reading")}
            opacity={sheetR * (1 - sheetOut)}
          />
          <Screen
            src={shot("s94-reading")}
            y={settle}
            opacity={reading * (1 - readingOut)}
          />
          <Screen
            src={shot("read-surah")}
            y={settleIdx}
            opacity={surah * (1 - juz)}
          />
          <Screen src={shot("read-juz")} opacity={juz} />
          <Touch f={f} at={128} rect={layout.aa} />
          <Touch f={f} at={182} rect={layout.btnReading} />
          <Touch f={f} at={232} rect={layout.done} />
          <Touch f={f} at={414} rect={layout.tabJuz} />
        </Phone>
      </div>

      <div
        style={{
          bottom: 50,
          left: 0,
          opacity: prog(f, 50, 70) * (1 - prog(f, 586, 602)),
          position: "absolute",
          right: 0,
          textAlign: "center",
        }}
      >
        <Credit style={{ fontSize: 26 }}>{TRANSLATION_CREDIT}</Credit>
      </div>

      {f >= 596 ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: end,
          }}
        >
          <Mark frame={f - 602} size={220} />
          <div
            style={{
              ...rise(f, 616),
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
              ...rise(f, 628),
              color: C.inkSoft,
              fontFamily: F.ui,
              fontSize: 40,
              fontWeight: 500,
              marginTop: 16,
            }}
          >
            mindfulverse.vercel.app
          </div>
          <Credit
            style={{ ...rise(f, 640), marginTop: 44, textAlign: "center" }}
          >
            {TRANSLATION_CREDIT}
          </Credit>
          {withNasheed ? (
            <Credit
              style={{
                ...rise(f, 648),
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
