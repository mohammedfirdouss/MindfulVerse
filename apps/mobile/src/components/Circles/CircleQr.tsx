// The circle's invite link as a QR code (web: components/CircleQr.tsx): dark
// on white with a two-module quiet zone, so any phone camera reads it in the
// light or night theme.
import { qrPath } from "@mindfulverse/core/qr";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

const QUIET = 2;
/** About this wide in dp; rounded down to whole dp per module so rows meet
 *  cleanly (react-native-svg has no shapeRendering). */
const TARGET = 200;
const DARK = "#161a2e";
const LIGHT = "#ffffff";

export function CircleQr({ url, label }: { url: string; label: string }) {
  const qr = useMemo(() => qrPath(url), [url]);
  const span = qr.size + QUIET * 2;
  const side = Math.max(1, Math.floor(TARGET / span)) * span;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg
        width={side}
        height={side}
        viewBox={`${-QUIET} ${-QUIET} ${span} ${span}`}
      >
        <Rect x={-QUIET} y={-QUIET} width={span} height={span} fill={LIGHT} />
        <Path d={qr.path} fill={DARK} />
      </Svg>
    </View>
  );
}
