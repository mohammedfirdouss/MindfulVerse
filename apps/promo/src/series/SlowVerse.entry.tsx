import { Composition, registerRoot } from "remotion";

import { SLOWVERSE_DURATION, SlowVerse } from "./SlowVerse";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
