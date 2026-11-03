import { Composition, registerRoot } from "remotion";

import { WHOLESURAH_DURATION, WholeSurah } from "./WholeSurah";

function R() {
  return (
    <>
      <Composition
        id="WholeSurah"
        component={WholeSurah}
        durationInFrames={WHOLESURAH_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="WholeSurahNasheed"
        component={WholeSurah}
        durationInFrames={WHOLESURAH_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ withNasheed: true }}
      />
    </>
  );
}
registerRoot(R);
