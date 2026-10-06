// The surah's background text (Ibn Kathir's introduction), shown first.
// Long texts open trimmed to the first paragraphs with a "Read more".
import { useMemo, useState } from "react";
import { View } from "react-native";
import { fonts, space } from "../../theme";
import { Button, Text } from "../../ui";
import { infoBlocks } from "./logic";

export function InfoText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const { blocks, truncated } = useMemo(() => infoBlocks(text, expanded), [text, expanded]);
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.sm + 4 }}>
        {blocks.map((b, i) =>
          b.kind === "heading" ? (
            <Text key={i} accessibilityRole="header" style={{ fontFamily: fonts.readSemiBold, marginTop: i ? space.sm : 0 }}>
              {b.text}
            </Text>
          ) : (
            <Text key={i} variant="soft">
              {b.text}
            </Text>
          ),
        )}
      </View>
      {truncated ? (
        <View style={{ alignItems: "flex-start" }}>
          <Button
            kind="ghost"
            title="Read more"
            accessibilityHint="Shows the rest of the introduction"
            onPress={() => setExpanded(true)}
          />
        </View>
      ) : null}
    </View>
  );
}
