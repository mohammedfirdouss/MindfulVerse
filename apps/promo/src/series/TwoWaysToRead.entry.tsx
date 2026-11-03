import { Composition, registerRoot } from "remotion";

import { TWOWAYSTOREAD_DURATION, TwoWaysToRead } from "./TwoWaysToRead";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
