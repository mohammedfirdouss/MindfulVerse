import { Composition, registerRoot } from "remotion";

import { YOURSALONE_DURATION, YoursAlone } from "./YoursAlone";

function R() {
  return (
    <>
      <Composition
        id="YoursAlone"
        component={YoursAlone}
        durationInFrames={YOURSALONE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="YoursAloneNasheed"
        component={YoursAlone}
        durationInFrames={YOURSALONE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ withNasheed: true }}
      />
    </>
  );
}
registerRoot(R);
