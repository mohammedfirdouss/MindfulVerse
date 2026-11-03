import { Composition, registerRoot } from "remotion";

import { THREEQ_DURATION, ThreeQuestions } from "./ThreeQuestions";

function R() {
  return (
    <>
      <Composition
        id="ThreeQuestions"
        component={ThreeQuestions}
        durationInFrames={THREEQ_DURATION}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ withNasheed: false }}
      />
      <Composition
        id="ThreeQuestionsNasheed"
        component={ThreeQuestions}
        durationInFrames={THREEQ_DURATION}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ withNasheed: true }}
      />
    </>
  );
}
registerRoot(R);
