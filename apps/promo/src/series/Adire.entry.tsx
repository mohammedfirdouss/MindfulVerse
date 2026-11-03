import { Composition, registerRoot } from "remotion";

import { ADIRE_DURATION, Adire } from "./Adire";

function R() {
  return (
    <>
      <Composition
        id="Adire"
        component={Adire}
        durationInFrames={ADIRE_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="AdireNasheed"
        component={Adire}
        durationInFrames={ADIRE_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ withNasheed: true }}
      />
    </>
  );
}
registerRoot(R);
