import { View } from "react-native";
import { SIZES, type ReadView } from "@mindfulverse/core/readingPrefs";
import { space } from "../../theme";
import { Segmented } from "./Segmented";

const SIZE_NAMES: Record<string, string> = { s: "small", m: "medium", l: "large" };

/** Port of apps/web/src/components/ReadingControls.tsx: A/A/A size and the
 *  Translation / Reading (Arabic-only, flowing) view. */
export function ReadingControls({
  sizeKey,
  onSize,
  view,
  onView,
}: {
  sizeKey: string;
  onSize: (k: string) => void;
  view: ReadView;
  onView: (v: ReadView) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md, alignItems: "center" }}>
      <Segmented
        accessibilityLabel="Reading size"
        value={sizeKey}
        onChange={onSize}
        options={SIZES.map((s, i) => ({
          key: s.key,
          label: s.label,
          accessibilityLabel: `Reading size ${SIZE_NAMES[s.key] ?? s.key}`,
          // web: 0.78rem + 0.16rem per step, so the three A's grow
          labelStyle: { fontSize: 13 + i * 2.7, lineHeight: 22 },
        }))}
      />
      <Segmented<ReadView>
        accessibilityLabel="Reading view"
        value={view}
        onChange={onView}
        options={[
          { key: "translation", label: "Translation", accessibilityLabel: "Translation view: Arabic with English" },
          { key: "reading", label: "Reading", accessibilityLabel: "Reading view: Arabic only" },
        ]}
      />
    </View>
  );
}
