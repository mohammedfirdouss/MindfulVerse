// Tab icons, drawn on a 24-unit grid with the same line weight as the adire
// band so the bar reads as part of the cloth. `focused` fills the motif.
import Svg, { Circle, Path } from "react-native-svg";

type IconProps = { color: string; focused: boolean; size?: number };

const STROKE = 1.6;

/** Home: the adire diamond, today's verse at its centre. */
export function HomeIcon({ color, focused, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5 L21.5 12 L12 21.5 L2.5 12Z" fill="none" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
      <Path d="M12 8.2 L15.8 12 L12 15.8 L8.2 12Z" fill={focused ? color : "none"} stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
    </Svg>
  );
}

/** Read: an open mushaf. */
export function ReadIcon({ color, focused, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M2.8 5.6 C6 4.6 9.2 5 12 6.8 C14.8 5 18 4.6 21.2 5.6 V18.6 C18 17.6 14.8 18 12 19.8 C9.2 18 6 17.6 2.8 18.6Z"
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.18 : 0}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path d="M12 6.8 V19.8" stroke={color} strokeWidth={STROKE} />
    </Svg>
  );
}

/** Journal: a reed pen over its line. */
export function JournalIcon({ color, focused, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 17.2 L7 13.4 L15.9 4.5 A1.9 1.9 0 0 1 18.6 7.2 L9.7 16.1Z"
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.18 : 0}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path d="M3.5 20.5 H20.5" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

/** Account: a person. */
export function AccountIcon({ color, focused, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.4} r={3.6} fill={focused ? color : "none"} fillOpacity={focused ? 0.18 : 0} stroke={color} strokeWidth={STROKE} />
      <Path d="M4.8 20.2 C5.8 15.6 18.2 15.6 19.2 20.2" fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

/** Tadabbur: ripples spreading from a still point. */
export function TadabburIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 9.6 L14.4 12 L12 14.4 L9.6 12Z" fill={color} />
      <Circle cx={12} cy={12} r={5.6} fill="none" stroke={color} strokeWidth={STROKE} />
      <Circle cx={12} cy={12} r={9.4} fill="none" stroke={color} strokeWidth={STROKE} strokeDasharray="2.2 2.6" />
    </Svg>
  );
}

/** Dhikr: a ring of prayer beads. */
export function DhikrIcon({ color, size = 24 }: { color: string; size?: number }) {
  const beads = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2 - Math.PI / 2;
    return [12 + Math.cos(a) * 7.6, 11 + Math.sin(a) * 7.6] as const;
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {beads.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.35} fill={color} />
      ))}
      <Path d="M12 18.6 V22.6 M10.6 22.6 H13.4" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

/** A chevron for rows that open somewhere. */
export function ChevronIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5 L16 12 L9 19" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
