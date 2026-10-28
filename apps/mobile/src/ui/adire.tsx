import { markBounds, markPath } from "@mindfulverse/core/brand";
// Adire ornaments, drawn in SVG. Adire is Yoruba resist-dyed indigo cloth:
// pale motifs left where the dye could not reach. The web uses one of them
// (the band, index.css --adire-band); the app carries the same language a
// little further: the band on every screen, the diamond as the verse and
// surah marker, and a dyed-cloth panel for the moments that matter most.
import { useId } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";

import { fonts, useTheme } from "../theme";
import { Text } from "./Text";

/** Pattern ids must be unique per mounted Svg (web shares one DOM). */
function usePatternId(prefix: string) {
  return `${prefix}-${useId().replaceAll(/[^a-zA-Z0-9_-]/gu, "")}`;
}

/** The web's adire band: diamond and ringed dot, repeated. 12dp tall. */
export function AdireBand({ height = 12 }: { height?: number }) {
  const { colors, scheme } = useTheme();
  const id = usePatternId("band");
  const ground = scheme === "dark" ? colors.indigoWash : colors.indigo;
  const ink = scheme === "dark" ? colors.indigo : colors.cotton;
  const k = height / 12;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height={height}>
        <Defs>
          <Pattern
            id={id}
            patternUnits="userSpaceOnUse"
            width={36 * k}
            height={height}
          >
            <Rect width={36 * k} height={height} fill={ground} />
            <Path
              d={`M${9 * k} ${1 * k} L${14 * k} ${6 * k} L${9 * k} ${11 * k} L${4 * k} ${6 * k}Z`}
              fill="none"
              stroke={ink}
              strokeWidth={1.2}
            />
            <Circle
              cx={27 * k}
              cy={6 * k}
              r={2.4 * k}
              fill="none"
              stroke={ink}
              strokeWidth={1.2}
            />
            <Circle cx={27 * k} cy={6 * k} r={0.9 * k} fill={ink} />
          </Pattern>
        </Defs>
        <Rect width="100%" height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** The band at the top of a tab screen, just under the status bar. It stays
 *  put while the page scrolls beneath it (web: body::before, fixed). */
export function TopBand() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: colors.cotton,
        paddingTop: insets.top,
        zIndex: 1,
      }}
    >
      <AdireBand />
    </View>
  );
}

/** The adire diamond: verse and surah numbers sit inside it (web .roundel). */
export function Diamond({
  label,
  size = 34,
  tone = "solid",
}: {
  label?: string | number;
  size?: number;
  /** solid: indigo with cotton numeral. outline: indigo line on the ground. */
  tone?: "solid" | "outline";
}) {
  const { colors } = useTheme();
  const solid = tone === "solid";
  const h = size / 2;
  const text = label === undefined ? "" : String(label);
  // Three-digit numbers need a smaller numeral to stay inside the point.
  const fontSize = size * (text.length >= 3 ? 0.27 : 0.34);
  return (
    <View
      style={{
        alignItems: "center",
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Path
          d={`M${h} 1 L${size - 1} ${h} L${h} ${size - 1} L1 ${h}Z`}
          fill={solid ? colors.indigo : "none"}
          stroke={colors.indigo}
          strokeWidth={solid ? 0 : 1.4}
        />
      </Svg>
      {text ? (
        <Text
          style={{
            color: solid ? colors.cottonRaised : colors.indigo,
            fontFamily: fonts.readSemiBold,
            fontSize,
            lineHeight: fontSize * 1.2,
          }}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

/** A dye line with a small diamond at its centre: section breaks. */
export function DyeRule({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ alignItems: "center", flexDirection: "row", gap: 10 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{ backgroundColor: colors.lineStrong, flex: 1, height: 1 }}
      />
      <Svg width={8} height={8}>
        <Path d="M4 0 L8 4 L4 8 L0 4Z" fill={colors.indigo} />
      </Svg>
      <View
        style={{ backgroundColor: colors.lineStrong, flex: 1, height: 1 }}
      />
    </View>
  );
}

/** One tile of resist motifs: a nested diamond, ringed dots at the corners,
 *  and dashes between, the way eleko stencils repeat across a cloth. */
function ClothTile({
  id,
  size,
  ink,
}: {
  id: string;
  size: number;
  ink: string;
}) {
  const s = size;
  const m = s / 2;
  const d = s * 0.26;
  return (
    <Pattern id={id} patternUnits="userSpaceOnUse" width={s} height={s}>
      <Path
        d={`M${m} ${m - d} L${m + d} ${m} L${m} ${m + d} L${m - d} ${m}Z`}
        fill="none"
        stroke={ink}
        strokeWidth={1.3}
      />
      <Path
        d={`M${m} ${m - d * 0.45} L${m + d * 0.45} ${m} L${m} ${m + d * 0.45} L${m - d * 0.45} ${m}Z`}
        fill={ink}
      />
      {[
        [0, 0],
        [s, 0],
        [0, s],
        [s, s],
      ].map(([x, y]) => (
        <Circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={s * 0.09}
          fill="none"
          stroke={ink}
          strokeWidth={1.2}
        />
      ))}
      <Path
        d={`M${m - 3} 0 H${m + 3} M${m - 3} ${s} H${m + 3} M0 ${m - 3} V${m + 3} M${s} ${m - 3} V${m + 3}`}
        stroke={ink}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Pattern>
  );
}

/** A panel of indigo-dyed cloth: deep indigo ground with faint resist motifs.
 *  Text inside should use the `onCloth` colours. */
export function AdireCloth({
  children,
  style,
  tile = 44,
  motifOpacity = 0.13,
}: {
  children: ReactNode;
  style?: ViewStyle;
  tile?: number;
  motifOpacity?: number;
}) {
  const { colors, scheme } = useTheme();
  const id = usePatternId("cloth");
  const ground = scheme === "dark" ? colors.indigoWash : colors.indigoDeep;
  const ink = scheme === "dark" ? colors.indigo : colors.cotton;
  return (
    <View
      style={[
        { backgroundColor: ground, borderRadius: 6, overflow: "hidden" },
        style,
      ]}
    >
      <View
        style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <ClothTile id={id} size={tile} ink={ink} />
          </Defs>
          <Rect
            width="100%"
            height="100%"
            fill={`url(#${id})`}
            opacity={motifOpacity}
          />
        </Svg>
      </View>
      {children}
    </View>
  );
}

/** Text colours for content laid on AdireCloth. */
export function useOnCloth() {
  const { scheme, colors } = useTheme();
  return scheme === "dark"
    ? { accent: "#c5cff2", soft: colors.inkSoft, strong: colors.ink }
    : { accent: "#b9c4ec", soft: "#d6d9ea", strong: colors.cottonRaised };
}

/** The MindfulVerse mark: تدبر in square Kufic, left pale inside an indigo tile
 *  (packages/core/brand.ts, the same construction as the app icon). */
export function BrandMark({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();
  const b = markBounds();
  const span = Math.max(b.width, b.height);
  const box = span / (1 - 2 * 0.16);
  const ox = b.minX - (box - b.width) / 2;
  const oy = b.minY - (box - b.height) / 2;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox={`${ox} ${oy} ${box} ${box}`}>
        <Rect
          x={ox}
          y={oy}
          width={box}
          height={box}
          rx={box * 0.22}
          fill={colors.indigo}
        />
        <Path d={markPath()} fill={colors.cotton} />
      </Svg>
    </View>
  );
}
