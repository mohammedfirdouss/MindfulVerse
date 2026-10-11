import { View } from "react-native";
import { SIZES, type ReadView } from "@mindfulverse/core/readingPrefs";
import { tickSelection } from "../../platform/haptics";
import { space } from "../../theme";
import { Text } from "../../ui";
import { Segmented } from "./Segmented";

const SIZE_NAMES: Record<string, string> = { s: "small", m: "medium", l: "large" };

/** Port of apps/web/src/components/ReadingControls.tsx: the size and the
 *  Translation / Reading (Arabic-only, flowing) choices, shown inside the
 *  "Reading settings" sheet (ReaderTools.tsx). Each choice applies at once. */
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
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.sm }}>
        <Text variant="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          Text size
        </Text>
        <Segmented
          accessibilityLabel="Reading size"
          value={sizeKey}
          onChange={(k) => {
            if (k !== sizeKey) tickSelection();
            onSize(k);
          }}
          options={SIZES.map((s, i) => ({
            key: s.key,
            label: s.label,
            accessibilityLabel: `Reading size ${SIZE_NAMES[s.key] ?? s.key}`,
            // web: the three A's grow
            labelStyle: { fontSize: 14 + i * 3.2, lineHeight: 24 },
          }))}
        />
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          View
        </Text>
        <Segmented<ReadView>
          accessibilityLabel="Reading view"
          value={view}
          onChange={(v) => {
            if (v !== view) tickSelection();
            onView(v);
          }}
          options={[
            { key: "translation", label: "Translation", accessibilityLabel: "Translation view: Arabic with English" },
            { key: "reading", label: "Reading", accessibilityLabel: "Reading view: Arabic only" },
          ]}
        />
        <Text variant="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          {view === "translation" ? "Arabic with English, verse by verse." : "Arabic only, flowing as on the page."}
        </Text>
      </View>
    </View>
  );
}
