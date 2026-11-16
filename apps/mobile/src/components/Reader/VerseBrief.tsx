import {
  BRIEF_CREDIT,
  BRIEF_HEADING,
  briefFor,
  briefSharedLabel,
} from "@mindfulverse/core/brief";
import type { Brief } from "@mindfulverse/core/brief";
import { loadSurahBrief } from "@mindfulverse/core/data";
import type { Ayah } from "@mindfulverse/core/types";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { space, useTheme } from "../../theme";
import { Text } from "../../ui";
import { SectionHeading } from "./RelatedVerses";

/** Web's VerseBrief: Al-Mukhtasar's explanation of the verse, with its
 *  credit. Renders nothing until it loads, or if it can't be read. */
export function VerseBrief({ ayah }: { ayah: Ayah }) {
  const { colors } = useTheme();
  const [brief, setBrief] = useState<Brief | null>(null);

  useEffect(() => {
    let live = true;
    setBrief(null);
    const load = async () => {
      try {
        const all = await loadSurahBrief(ayah.surah);
        if (live) {
          setBrief(briefFor(all, ayah.ayah));
        }
      } catch {
        /* the rest of the Deeper look stands on its own */
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [ayah.surah, ayah.ayah]);

  if (!brief) {
    return null;
  }
  const shared = briefSharedLabel(brief, ayah.ayah);
  return (
    <View
      style={{
        borderBottomColor: colors.line,
        borderBottomWidth: 1,
        gap: space.sm,
        paddingBottom: space.md,
      }}
    >
      <SectionHeading>{BRIEF_HEADING}</SectionHeading>
      {brief.paragraphs.map((p, i) => (
        <Text key={i} variant="soft">
          {p}
        </Text>
      ))}
      <Text variant="muted" style={{ fontSize: 13, lineHeight: 19 }}>
        {shared ? `${shared}. ` : ""}
        {BRIEF_CREDIT}
      </Text>
    </View>
  );
}
