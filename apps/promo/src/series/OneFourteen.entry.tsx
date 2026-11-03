import { Composition, registerRoot } from "remotion";

import { ONEFOURTEEN_DURATION, OneFourteen } from "./OneFourteen";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
