import { Composition, registerRoot } from "remotion";

import { NightMode, NIGHTMODE_DURATION } from "./NightMode";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
