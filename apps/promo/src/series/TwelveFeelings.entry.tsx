import { Composition, registerRoot } from "remotion";

import { TwelveFeelings, TWELVEFEELINGS_DURATION } from "./TwelveFeelings";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
