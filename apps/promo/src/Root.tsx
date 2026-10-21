import { Composition } from "remotion";
import { DURATION, FPS, HeartPromo } from "./HeartPromo";

export function Root() {
  return (
    <Composition id="HeartPromo" component={HeartPromo} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
  );
}
