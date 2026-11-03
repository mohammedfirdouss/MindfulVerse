import { Composition, registerRoot } from "remotion";

import { SevenMornings, SEVENMORNINGS_DURATION } from "./SevenMornings";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
