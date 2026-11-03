// "Search the translation": 9:16, 24 s. One word, a whole Qur'an of answers.
// Real captures of /search, /read and /themes (scripts/capture-SearchTheTranslation.mjs).
// The count and the surah band are computed from search.json with the app's own
// matching rule (case-insensitive substring) and checked against the page's count.
// Storyboard (30 fps, 720 frames):
//   0-84    "Looking for a word?"        phone rises in on the empty Search page
//   84-272  "Search the translation."    "patience" typed in the box, Search tapped, results drop in and scroll
//   272-424 "15 verses on patience."    phone settles back; count ticks up; band of the 10 surahs they come from
//   424-600 "Or find verses by topic."  phone returns; Read page, the link is tapped, Themes
//   600-720 end card: Mark, MindfulVerse, URL, translation credit (+ music credit in the Nasheed cut)
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import searchIndex from "../../../web/public/data/search.json";
import surahs from "../../../web/public/data/surahs.json";
import layout from "../../public/screens/series/SearchTheTranslation/layout.json";
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
  Screen,
  rise,
  Touch,
  TRANSLATION_CREDIT,
  VH,
} from "../kit";

export const SEARCHTHETRANSLATION_DURATION = 720;
export const meta = {
  durationInFrames: SEARCHTHETRANSLATION_DURATION,
  height: 1920,
  id: "SearchTheTranslation",
  width: 1080,
};

const WORD = "patience";
const norm = (s: string) => s.replaceAll(/[’‘]/gu, "'").toLowerCase();
const hits = (searchIndex as [string, string][]).filter(([, t]) =>
  norm(t).includes(WORD)
);
const COUNT = hits.length;
const SURAH_NUMBERS = [
  ...new Set(hits.map(([k]) => Number(k.split(":")[0]))),
].sort((a, b) => a - b);
const NAMES = SURAH_NUMBERS.map(
  (n) =>
    (surahs as { number: number; name: string }[]).find((s) => s.number === n)
      ?.name ?? ""
);
if (`${COUNT} verses` !== layout.count) {
  throw new Error(`Count ${COUNT} does not match the page: ${layout.count}`);
}

const PHONE_W = 640;
const PHONE_X = 220;
const PHONE_Y = 380;
const PHONE_H = 1403;
const BOTTOM = PHONE_Y + PHONE_H;
const shot = (n: string) =>
  staticFile(`screens/series/SearchTheTranslation/${n}.png`);
const TAB_Y = VH - layout.tabbarH;
const SCROLL_MAX = 760;

function Caption({
  children,
  from,
  to,
  sub,
}: {
  children: string;
  from: number;
  to: number;
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
      <Headline size={84}>{children}</Headline>
      {sub ? (
        <div
          style={{
            color: C.inkSoft,
            fontFamily: F.ui,
            fontSize: 44,
            fontWeight: 500,
            marginTop: 18,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function SearchTheTranslation({
  withNasheed,
}: {
  withNasheed: boolean;
}) {
  const f = useCurrentFrame();
  const phoneIn = prog(f, 28, 62);
  const phoneOut = prog(f, 588, 606, ease.inOut);
  const small = prog(f, 272, 306, ease.inOut) - prog(f, 424, 458, ease.inOut);
  const scale = 1 - 0.2 * small;
  const typedN = Math.max(0, Math.min(WORD.length, Math.floor((f - 112) / 5)));
  const results = prog(f, 164, 182);
  const scroll = SCROLL_MAX * prog(f, 196, 262, ease.inOut);
  const read = prog(f, 434, 452);
  const themes = prog(f, 506, 526);
  const count = Math.round(COUNT * prog(f, 300, 336));
  const end = prog(f, 606, 624);
  const b = layout.button;
  const link = layout.linkTopic;
  return (
    <AbsoluteFill style={{ backgroundColor: C.cotton }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(x) =>
            interpolate(
              x,
              [
                0,
                24,
                SEARCHTHETRANSLATION_DURATION - 60,
                SEARCHTHETRANSLATION_DURATION,
              ],
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

      <Caption from={-14} to={86}>
        Looking for a word?
      </Caption>
      <Caption from={86} to={274}>
        Search the translation.
      </Caption>
      <Caption from={278} to={428}>{`${COUNT} verses on ${WORD}.`}</Caption>
      <Caption from={430} to={602}>
        Or find verses by topic.
      </Caption>

      {/* the band of surahs the results come from */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          justifyContent: "center",
          left: 70,
          position: "absolute",
          right: 70,
          top: 262,
        }}
      >
        {NAMES.map((n, i) => {
          const s = 318 + i * 4;
          const out = prog(f, 410 + i * 2, 426 + i * 2, ease.inOut);
          const p = prog(f, s, s + 14);
          return (
            <div
              key={n}
              style={{
                background: C.wash,
                border: `2px solid ${C.line}`,
                borderRadius: 999,
                color: C.indigoDeep,
                fontFamily: F.ui,
                fontSize: 36,
                fontWeight: 500,
                opacity: p * (1 - out),
                padding: "8px 26px",
                transform: `translateY(${(1 - p) * 22 - out * 10}px)`,
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
      <div
        style={{
          ...beat(f, 332, 424),
          color: C.inkSoft,
          fontFamily: F.ui,
          fontSize: 38,
          fontWeight: 500,
          left: 0,
          position: "absolute",
          right: 0,
          textAlign: "center",
          top: 262 + 3 * 70 + 24,
        }}
      >
        {`${count} verses · ${NAMES.length} surahs`}
      </div>

      <div
        style={{
          inset: 0,
          opacity: phoneIn * (1 - phoneOut),
          position: "absolute",
          transform: `translateY(${(1 - phoneIn) * 120}px) scale(${scale})`,
          transformOrigin: `540px ${BOTTOM}px`,
        }}
      >
        <Phone x={PHONE_X} y={PHONE_Y} width={PHONE_W}>
          <Screen
            src={shot(`type-${f < 164 ? typedN : WORD.length}`)}
            opacity={1 - results}
          />
          <Screen
            src={shot("results-full")}
            y={-scroll}
            opacity={results * (1 - read)}
          />
          <Screen src={shot("read")} opacity={read * (1 - themes)} />
          <Screen src={shot("themes")} opacity={themes} />
          {/* tab bar stays pinned over the scrolling results */}
          <Img
            src={shot("tabbar")}
            style={{
              height: layout.tabbarH,
              left: 0,
              opacity: results * (1 - read),
              position: "absolute",
              top: 30 + TAB_Y,
              width: 390,
            }}
          />
          <Touch f={f} at={152} rect={b} />
          <Touch f={f} at={488} rect={link} />
        </Phone>
      </div>

      <div
        style={{
          bottom: 50,
          left: 0,
          opacity: prog(f, 60, 80) * (1 - prog(f, 590, 606)),
          position: "absolute",
          right: 0,
          textAlign: "center",
        }}
      >
        <Credit style={{ fontSize: 26 }}>{TRANSLATION_CREDIT}</Credit>
      </div>

      {f >= 600 ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: end,
          }}
        >
          <Mark frame={f - 606} size={220} />
          <div
            style={{
              ...rise(f, 620),
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
              ...rise(f, 632),
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
            style={{ ...rise(f, 644), marginTop: 44, textAlign: "center" }}
          >
            {TRANSLATION_CREDIT}
          </Credit>
          {withNasheed ? (
            <Credit
              style={{
                ...rise(f, 652),
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
