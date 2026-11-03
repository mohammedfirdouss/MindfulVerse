import { Composition, registerRoot } from "remotion";

import { CURLAVERSE_DURATION, CurlAVerse } from "./CurlAVerse";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
