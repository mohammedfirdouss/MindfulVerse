/*
 * NightMode — 9:16, 20 s, silent + nasheed. Light to night.
 * Real captures (scripts/capture-NightMode.mjs, invented journal entry): Home, /read/94,
 * Journal, Account > Appearance, each in light and dark. Copy: Account.tsx ("Appearance",
 * "Light" / "Night").
 *
 * STORYBOARD (30 fps)
 *  0.3–8.4 s   "Read at night, gently." A phone shows the light Home -> Read (94) -> Journal;
 *              a slow soft-edged wipe (1.6 -> 8.4 s) sweeps left to right revealing the dark
 *              version of the same screens beneath, page background cotton -> night.
 *  8.8–14.2 s  "Light or Night. Your choice." Account > Appearance (Night selected); tap
 *              "Light" (10.4 s) -> light; tap "Night" (12.4 s) -> dark.
 *  14.2–20 s   End card in night colours: Mark, "MindfulVerse", URL, translation credit
 *              (+ nasheed credit in the nasheed version).
 */
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import layout from "../../public/screens/series/NightMode/layout.json";
import {
  Band,
  C,
  Credit,
  F,
  Fonts,
  Headline,
  Mark,
  NASHEED_CREDIT,
  Phone,
  Screen,
  TRANSLATION_CREDIT,
  Touch,
  VW,
  beat,
  ease,
  prog,
  rise,
  sec,
} from "../kit";

export const NIGHTMODE_DURATION = sec(20);
export const meta = {
  durationInFrames: NIGHTMODE_DURATION,
  height: 1920,
  id: "NightMode",
  width: 1080,
};

const img = (n: string, t: "light" | "dark") =>
  staticFile(`screens/series/NightMode/${n}-${t}.png`);
const PW = 640;
const PY = 380;
const URL = "mindfulverse.vercel.app";

/** Mix two hex colours. */
function mix(a: string, b: string, t: number) {
  const p = (h: string) =>
    [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
}

const SCREENS = ["home", "read", "journal"] as const;
/** Opacity of screen i (cross-fades at 3.2 s and 5.7 s, 0.5 s each). */
function screenOpacity(f: number, i: number) {
  const a = prog(f, sec(3.2), sec(3.7), ease.inOut);
  const b = prog(f, sec(5.7), sec(6.2), ease.inOut);
  return i === 0 ? 1 - a : i === 1 ? a * (1 - b) : b;
}

function Stack({ f, t }: { f: number; t: "light" | "dark" }) {
  return (
    <>
      {SCREENS.map((n, i) => (
        <Screen key={n} src={img(n, t)} opacity={screenOpacity(f, i)} />
      ))}
    </>
  );
}

export function NightMode({ withNasheed = false }: { withNasheed?: boolean }) {
  const f = useCurrentFrame();
  // Wipe 0 -> 1 across the phone, slow ease-in-out.
  const wipe = prog(f, sec(1.6), sec(8.4), ease.inOut);
  // Canvas-space front (soft edge 60px); the phone's front is the same line.
  const cf = wipe * (1080 + 120) - 60;
  const pk = (PW - PW * 0.0194 * 2) / VW;
  const front = (cf - ((1080 - PW) / 2 + PW * 0.0194)) / pk;
  const canvasMask = `linear-gradient(to right, #000 ${cf - 30}px, transparent ${cf + 30}px)`;
  const mask = `linear-gradient(to right, #000 ${front - 30}px, transparent ${front + 30}px)`;

  // Account beat: which theme is showing.
  const lightAt = sec(10.4);
  const nightAt = sec(12.4);
  const accLight =
    prog(f, lightAt + 8, lightAt + 16) *
    (1 - prog(f, nightAt + 8, nightAt + 16));
  const accIn = prog(f, sec(8.6), sec(9.1));
  const phoneOut = prog(f, sec(13.4), sec(14), ease.inOut);

  // Page background: cotton -> night with the wipe, then follows the Account theme.
  let bg: string = C.cotton;
  if (f >= sec(8.8)) {
    bg = mix(C.night, C.cotton, accLight);
  }
  const bgEnd = prog(f, sec(13.6), sec(14.2));
  const dark = f >= sec(8.8) ? 1 - accLight : wipe;
  const ink = mix(C.indigoDeep, C.nightIndigo, f >= sec(14) ? 1 : dark);
  const phone = f < sec(14.2);

  const sceneTwo = f >= sec(8.6);

  return (
    <AbsoluteFill style={{ background: bg }}>
      <Fonts />
      {withNasheed && (
        <Audio
          src={staticFile("audio/alhamdulillah-jawad-syed.m4a")}
          volume={(fr) =>
            interpolate(
              fr,
              [0, 24, NIGHTMODE_DURATION - 60, NIGHTMODE_DURATION],
              [0, 0.8, 0.8, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            )
          }
        />
      )}
      <AbsoluteFill style={{ background: C.night, opacity: bgEnd }} />
      <div
        style={{
          inset: 0,
          pointerEvents: "none",
          position: "absolute",
          zIndex: 3,
        }}
      >
        <Band
          start={4}
          top={0}
          h={44}
          ground={mix(C.indigo, C.nightIndigo, f >= sec(14) ? 1 : dark)}
          ink={mix(C.cotton, C.night, f >= sec(14) ? 1 : dark)}
        />
      </div>

      {/* Headlines */}
      <div
        style={{
          left: 80,
          position: "absolute",
          right: 80,
          textAlign: "center",
          top: 150,
          ...beat(f, sec(0.3), sec(8.5)),
        }}
      >
        <Headline color={C.indigoDeep} size={96}>
          Read at night, gently.
        </Headline>
      </div>
      {f < sec(8.8) && (
        <AbsoluteFill
          style={{
            background: C.night,
            maskImage: canvasMask,
            WebkitMaskImage: canvasMask,
          }}
        >
          <div
            style={{
              left: 80,
              position: "absolute",
              right: 80,
              textAlign: "center",
              top: 150,
              ...beat(f, sec(0.3), sec(8.5)),
            }}
          >
            <Headline color={C.nightInk} size={96}>
              Read at night, gently.
            </Headline>
          </div>
        </AbsoluteFill>
      )}
      <div
        style={{
          left: 80,
          position: "absolute",
          right: 80,
          textAlign: "center",
          top: 150,
          ...beat(f, sec(8.9), sec(14)),
        }}
      >
        <Headline color={ink} size={96}>
          Light or Night. Your choice.
        </Headline>
      </div>

      {phone && (
        <div style={{ opacity: 1 - phoneOut }}>
          <Phone
            x={(1080 - PW) / 2}
            y={PY + (1 - prog(f, 0, 18)) * 60}
            width={PW}
            style={{ opacity: prog(f, 0, 14) }}
          >
            {!sceneTwo && (
              <>
                <Stack f={f} t="light" />
                <div
                  style={{
                    inset: 0,
                    maskImage: mask,
                    position: "absolute",
                    WebkitMaskImage: mask,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      background: C.night,
                      height: 30,
                      left: 0,
                      position: "absolute",
                      top: 0,
                      width: VW,
                    }}
                  />
                  <div
                    style={{
                      background: C.night,
                      height: 900,
                      left: 0,
                      position: "absolute",
                      top: 30,
                      width: VW,
                    }}
                  />
                  <Stack f={f} t="dark" />
                </div>
              </>
            )}
            {sceneTwo && (
              <div
                style={{
                  inset: 0,
                  opacity: accIn,
                  position: "absolute",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    background: C.cotton,
                    height: 900,
                    left: 0,
                    position: "absolute",
                    top: 0,
                    width: VW,
                  }}
                />
                <Screen src={img("account", "light")} />
                <div
                  style={{
                    background: C.night,
                    height: 900,
                    left: 0,
                    opacity: 1 - accLight,
                    position: "absolute",
                    top: 0,
                    width: VW,
                  }}
                />
                <Screen src={img("account", "dark")} opacity={1 - accLight} />
                <Touch f={f} at={lightAt} rect={layout.Light} />
                <Touch f={f} at={nightAt} rect={layout.Night} />
                <div
                  style={{
                    background: mix(C.night, C.cotton, accLight),
                    height: 30,
                    left: 0,
                    position: "absolute",
                    top: 0,
                    width: VW,
                  }}
                />
              </div>
            )}
          </Phone>
        </div>
      )}

      {/* End card, night colours */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: prog(f, sec(13.9), sec(14.6)),
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 40,
            textAlign: "center",
          }}
        >
          <Mark
            frame={Math.max(0, f - sec(14.1))}
            size={240}
            ground={C.nightIndigo}
            ink={C.night}
          />
          <Headline color={C.nightInk} size={110}>
            MindfulVerse
          </Headline>
          <div
            style={{
              ...rise(f, sec(14.9)),
              color: C.nightIndigo,
              fontFamily: F.ui,
              fontSize: 52,
              fontWeight: 600,
            }}
          >
            {URL}
          </div>
        </div>
        <div
          style={{
            bottom: 110,
            left: 60,
            position: "absolute",
            right: 60,
            textAlign: "center",
          }}
        >
          <Credit color={C.nightSoft}>{TRANSLATION_CREDIT}</Credit>
          {withNasheed && <Credit color={C.nightSoft}>{NASHEED_CREDIT}</Credit>}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
