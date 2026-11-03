// The promo series (src/series): each video silent, and with the CC BY 3.0 nasheed.
// Each file also has its own .entry.tsx for rendering it on its own.
import { Composition, Folder } from "remotion";

import { ADIRE_DURATION, Adire } from "./series/Adire";
import { BREATHE_DURATION, Breathe } from "./series/Breathe";
import { CURLAVERSE_DURATION, CurlAVerse } from "./series/CurlAVerse";
import { DAYSEVEN_DURATION, DaySeven } from "./series/DaySeven";
import { NIGHTMODE_DURATION, NightMode } from "./series/NightMode";
import { ONEFOURTEEN_DURATION, OneFourteen } from "./series/OneFourteen";
import {
  SEARCHTHETRANSLATION_DURATION,
  SearchTheTranslation,
} from "./series/SearchTheTranslation";
import { SEVENMORNINGS_DURATION, SevenMornings } from "./series/SevenMornings";
import { SLOWVERSE_DURATION, SlowVerse } from "./series/SlowVerse";
import { THREEQ_DURATION, ThreeQuestions } from "./series/ThreeQuestions";
import {
  TWELVEFEELINGS_DURATION,
  TwelveFeelings,
} from "./series/TwelveFeelings";
import { TWENTYDOORS_DURATION, TwentyDoors } from "./series/TwentyDoors";
import { TWOWAYSTOREAD_DURATION, TwoWaysToRead } from "./series/TwoWaysToRead";
import { WHOLESURAH_DURATION, WholeSurah } from "./series/WholeSurah";
import { YOURSALONE_DURATION, YoursAlone } from "./series/YoursAlone";

export function SeriesCompositions() {
  return (
    <Folder name="Series">
      <Composition
        id="Adire"
        component={Adire}
        durationInFrames={ADIRE_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="AdireNasheed"
        component={Adire}
        durationInFrames={ADIRE_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="Breathe"
        component={Breathe}
        durationInFrames={BREATHE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="BreatheNasheed"
        component={Breathe}
        durationInFrames={BREATHE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="CurlAVerse"
        component={CurlAVerse}
        durationInFrames={CURLAVERSE_DURATION}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="CurlAVerseNasheed"
        component={CurlAVerse}
        durationInFrames={CURLAVERSE_DURATION}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="DaySeven"
        component={DaySeven}
        durationInFrames={DAYSEVEN_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="DaySevenNasheed"
        component={DaySeven}
        durationInFrames={DAYSEVEN_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="NightMode"
        component={NightMode}
        durationInFrames={NIGHTMODE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="NightModeNasheed"
        component={NightMode}
        durationInFrames={NIGHTMODE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="OneFourteen"
        component={OneFourteen}
        durationInFrames={ONEFOURTEEN_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="OneFourteenNasheed"
        component={OneFourteen}
        durationInFrames={ONEFOURTEEN_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="SearchTheTranslation"
        component={SearchTheTranslation}
        durationInFrames={SEARCHTHETRANSLATION_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="SearchTheTranslationNasheed"
        component={SearchTheTranslation}
        durationInFrames={SEARCHTHETRANSLATION_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="SevenMornings"
        component={SevenMornings}
        durationInFrames={SEVENMORNINGS_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="SevenMorningsNasheed"
        component={SevenMornings}
        durationInFrames={SEVENMORNINGS_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="SlowVerse"
        component={SlowVerse}
        durationInFrames={SLOWVERSE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="SlowVerseNasheed"
        component={SlowVerse}
        durationInFrames={SLOWVERSE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="ThreeQuestions"
        component={ThreeQuestions}
        durationInFrames={THREEQ_DURATION}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="ThreeQuestionsNasheed"
        component={ThreeQuestions}
        durationInFrames={THREEQ_DURATION}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="TwelveFeelings"
        component={TwelveFeelings}
        durationInFrames={TWELVEFEELINGS_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="TwelveFeelingsNasheed"
        component={TwelveFeelings}
        durationInFrames={TWELVEFEELINGS_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="TwentyDoors"
        component={TwentyDoors}
        durationInFrames={TWENTYDOORS_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="TwentyDoorsNasheed"
        component={TwentyDoors}
        durationInFrames={TWENTYDOORS_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="TwoWaysToRead"
        component={TwoWaysToRead}
        durationInFrames={TWOWAYSTOREAD_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="TwoWaysToReadNasheed"
        component={TwoWaysToRead}
        durationInFrames={TWOWAYSTOREAD_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="WholeSurah"
        component={WholeSurah}
        durationInFrames={WHOLESURAH_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="WholeSurahNasheed"
        component={WholeSurah}
        durationInFrames={WHOLESURAH_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ withNasheed: true }}
      />
      <Composition
        id="YoursAlone"
        component={YoursAlone}
        durationInFrames={YOURSALONE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="YoursAloneNasheed"
        component={YoursAlone}
        durationInFrames={YOURSALONE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
    </Folder>
  );
}
