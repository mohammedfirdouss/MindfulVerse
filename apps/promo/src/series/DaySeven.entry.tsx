import { Composition, registerRoot } from "remotion";

import { DAYSEVEN_DURATION, DaySeven } from "./DaySeven";

function R() {
  return (
    <>
      <Composition
        id="DaySeven"
        component={DaySeven}
        durationInFrames={DAYSEVEN_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="DaySevenNasheed"
        component={DaySeven}
        durationInFrames={DAYSEVEN_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
    </>
  );
}
registerRoot(R);
