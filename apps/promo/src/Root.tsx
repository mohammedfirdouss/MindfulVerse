import { Composition } from "remotion";

import { DAY_DURATION, DAY_FPS, DayInTheLife } from "./DayInTheLife";
import { DEEPER_DURATION, DEEPER_FPS, DeeperLook } from "./DeeperLook";
import { EXPLAINER_DURATION, EXPLAINER_FPS, Explainer } from "./Explainer";
import { DURATION, FPS, HeartPromo } from "./HeartPromo";
import {
  ONE_SURAH_DURATION,
  ONE_SURAH_FPS,
  OneSurahOneWeek,
} from "./OneSurahOneWeek";
import { STAND_DURATION, STAND_FPS, StandLoop } from "./StandLoop";
import {
  START_CIRCLE_DURATION,
  START_CIRCLE_FPS,
  StartACircle,
} from "./StartACircle";
import { WHATS_NEW_DURATION, WHATS_NEW_FPS, WhatsNew } from "./WhatsNew";

export function Root() {
  return (
    <>
      <Composition
        id="HeartPromo"
        component={HeartPromo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      {/* For adding a sound from TikTok, Reels or CapCut when posting. */}
      <Composition
        id="HeartPromoSilent"
        component={HeartPromo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      {/* Real app screens from scripts/capture-screens.mjs; silent. */}
      <Composition
        id="DayInTheLife"
        component={DayInTheLife}
        durationInFrames={DAY_DURATION}
        fps={DAY_FPS}
        width={1080}
        height={1920}
      />
      {/* What's new (circles first): screens from scripts/capture-whatsnew.mjs. */}
      <Composition
        id="WhatsNew"
        component={WhatsNew}
        durationInFrames={WHATS_NEW_DURATION}
        fps={WHATS_NEW_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      {/* For adding a sound from TikTok, Reels or CapCut when posting. */}
      <Composition
        id="WhatsNewSilent"
        component={WhatsNew}
        durationInFrames={WHATS_NEW_DURATION}
        fps={WHATS_NEW_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      {/* One surah, one week: screens from scripts/capture-three.mjs. */}
      <Composition
        id="OneSurahOneWeek"
        component={OneSurahOneWeek}
        durationInFrames={ONE_SURAH_DURATION}
        fps={ONE_SURAH_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      {/* For adding a sound from TikTok, Reels or CapCut when posting. */}
      <Composition
        id="OneSurahOneWeekSilent"
        component={OneSurahOneWeek}
        durationInFrames={ONE_SURAH_DURATION}
        fps={ONE_SURAH_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      {/* The exhibition stand loop: silent, and the end runs into the start. */}
      <Composition
        id="StandLoop"
        component={StandLoop}
        durationInFrames={STAND_DURATION}
        fps={STAND_FPS}
        width={1920}
        height={1080}
        defaultProps={{ vertical: false }}
      />
      <Composition
        id="StandLoopVertical"
        component={StandLoop}
        durationInFrames={STAND_DURATION}
        fps={STAND_FPS}
        width={1080}
        height={1920}
        defaultProps={{ vertical: true }}
      />
      {/* Start a circle in three steps. */}
      <Composition
        id="StartACircle"
        component={StartACircle}
        durationInFrames={START_CIRCLE_DURATION}
        fps={START_CIRCLE_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      {/* For adding a sound from TikTok, Reels or CapCut when posting. */}
      <Composition
        id="StartACircleSilent"
        component={StartACircle}
        durationInFrames={START_CIRCLE_DURATION}
        fps={START_CIRCLE_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      {/* Deeper look and the tidier commentary. */}
      <Composition
        id="DeeperLook"
        component={DeeperLook}
        durationInFrames={DEEPER_DURATION}
        fps={DEEPER_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      {/* For adding a sound from TikTok, Reels or CapCut when posting. */}
      <Composition
        id="DeeperLookSilent"
        component={DeeperLook}
        durationInFrames={DEEPER_DURATION}
        fps={DEEPER_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      {/* What the app is, in a minute. */}
      <Composition
        id="Explainer"
        component={Explainer}
        durationInFrames={EXPLAINER_DURATION}
        fps={EXPLAINER_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      {/* No music: a voiceover is recorded over this one. */}
      <Composition
        id="ExplainerSilent"
        component={Explainer}
        durationInFrames={EXPLAINER_DURATION}
        fps={EXPLAINER_FPS}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
    </>
  );
}
