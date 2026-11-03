import { Composition, registerRoot } from "remotion";

import {
  SEARCHTHETRANSLATION_DURATION,
  SearchTheTranslation,
} from "./SearchTheTranslation";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
