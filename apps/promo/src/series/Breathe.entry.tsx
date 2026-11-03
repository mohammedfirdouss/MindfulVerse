import { Composition, registerRoot } from "remotion";

import { Breathe, BREATHE_DURATION } from "./Breathe";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
