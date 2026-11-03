import { Composition, registerRoot } from "remotion";

import { TWENTYDOORS_DURATION, TwentyDoors } from "./TwentyDoors";

function R() {
  return (
    <>
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
    </>
  );
}
registerRoot(R);
