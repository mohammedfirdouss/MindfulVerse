// Adire ornaments, drawn in SVG. Adire is Yoruba resist-dyed indigo cloth:
// pale motifs left where the dye could not reach. The web uses one of them
// (the band, index.css --adire-band); the app carries the same language a
// little further: the band on every screen, the diamond as the verse and
// surah marker, and a dyed-cloth panel for the moments that matter most.
import { useId, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import { fonts, useTheme } from "../theme";
import { Text } from "./Text";

/** Pattern ids must be unique per mounted Svg (web shares one DOM). */
function usePatternId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** The web's adire band: diamond and ringed dot, repeated. 12dp tall. */
export function AdireBand({ height = 12 }: { height?: number }) {
  const { colors, scheme } = useTheme();
  const id = usePatternId("band");
  const ground = scheme === "dark" ? colors.indigoWash : colors.indigo;
  const ink = scheme === "dark" ? colors.indigo : colors.cotton;
  const k = height / 12;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={height}>
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={36 * k} height={height}>
            <Rect width={36 * k} height={height} fill={ground} />
            <Path
              d={`M${9 * k} ${1 * k} L${14 * k} ${6 * k} L${9 * k} ${11 * k} L${4 * k} ${6 * k}Z`}
              fill="none"
              stroke={ink}
              strokeWidth={1.2}
            />
            <Circle cx={27 * k} cy={6 * k} r={2.4 * k} fill="none" stroke={ink} strokeWidth={1.2} />
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
    <View style={{ paddingTop: insets.top, backgroundColor: colors.cotton, zIndex: 1 }}>
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
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
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
            fontFamily: fonts.readSemiBold,
            fontSize,
            lineHeight: fontSize * 1.2,
            color: solid ? colors.cottonRaised : colors.indigo,
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
      style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.lineStrong }} />
      <Svg width={10} height={10}>
        <Path d="M5 0 L10 5 L5 10 L0 5Z" fill={colors.kola} />
      </Svg>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.lineStrong }} />
    </View>
  );
}

/** One tile of resist motifs: a nested diamond, ringed dots at the corners,
 *  and dashes between, the way eleko stencils repeat across a cloth. */
function ClothTile({ id, size, ink }: { id: string; size: number; ink: string }) {
  const s = size;
  const m = s / 2;
  const d = s * 0.26;
  return (
    <Pattern id={id} patternUnits="userSpaceOnUse" width={s} height={s}>
      <Path d={`M${m} ${m - d} L${m + d} ${m} L${m} ${m + d} L${m - d} ${m}Z`} fill="none" stroke={ink} strokeWidth={1.3} />
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
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={s * 0.09} fill="none" stroke={ink} strokeWidth={1.2} />
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
    <View style={[{ backgroundColor: ground, borderRadius: 6, overflow: "hidden" }, style]}>
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <ClothTile id={id} size={tile} ink={ink} />
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={motifOpacity} />
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
    ? { strong: colors.ink, soft: colors.inkSoft, accent: colors.kola }
    : { strong: colors.cottonRaised, soft: "#d6d9ea", accent: "#e9a174" };
}
