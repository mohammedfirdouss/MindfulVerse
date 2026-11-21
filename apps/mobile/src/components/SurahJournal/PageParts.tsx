import { parseFollowUpBody } from "@mindfulverse/core/followUps";
import type { SurahJournalItem } from "@mindfulverse/core/surahJournal";
import { TADABBUR_LABELS } from "@mindfulverse/core/tadabburBody";
import type { TadabburParts } from "@mindfulverse/core/tadabburBody";
import type { JournalEntry } from "@mindfulverse/core/types";
import type { ReactNode } from "react";
import { View } from "react-native";

import { fonts, space, useTheme } from "../../theme";
import { Text } from "../../ui";
import { formatDate } from "../Journal/journalText";
import { followUpLine } from "./sections";

const PART_KEYS = ["lessons", "reflection", "action", "connections"] as const;

const DATE_STYLE = { fontSize: 14.5, lineHeight: 22 } as const;

/** One written entry inside a card: a hairline above, then its date. */
function ItemFrame({ date, children }: { date: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderTopColor: colors.line,
        borderTopWidth: 1,
        gap: space.sm,
        paddingTop: 12,
      }}
    >
      <Text variant="soft" style={DATE_STYLE}>
        {date}
      </Text>
      {children}
    </View>
  );
}

function Parts({ parts }: { parts: TadabburParts }) {
  const { colors } = useTheme();
  return (
    <>
      {PART_KEYS.map((key) =>
        parts[key] ? (
          <View key={key}>
            <Text
              style={{
                color: colors.indigo,
                fontFamily: fonts.readSemiBold,
                fontSize: 14.5,
                lineHeight: 22,
              }}
            >
              {TADABBUR_LABELS[key]}
            </Text>
            <Text selectable>{parts[key]}</Text>
          </View>
        ) : null
      )}
    </>
  );
}

export function VerseItem({ item }: { item: SurahJournalItem }) {
  return (
    <ItemFrame date={formatDate(item.entry.createdAt)}>
      {item.parts ? (
        <Parts parts={item.parts} />
      ) : (
        <Text selectable>{item.entry.body}</Text>
      )}
      {item.followUps.map((f) => {
        const { answer, note } = parseFollowUpBody(f.body);
        return (
          <Text key={f.id} variant="soft" selectable>
            {followUpLine(answer, note, f.body)}
          </Text>
        );
      })}
    </ItemFrame>
  );
}

export function AlsoItem({ entry }: { entry: JournalEntry }) {
  return (
    <ItemFrame
      date={`${entry.context?.ref ?? ""}, ${formatDate(entry.createdAt)}`}
    >
      <Text selectable>{entry.body}</Text>
    </ItemFrame>
  );
}

/** The current intention, set off by a rule at its inline start. */
export function IntentionQuote({ body }: { body: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderLeftColor: colors.line,
        borderLeftWidth: 2,
        paddingLeft: 12,
      }}
    >
      <Text selectable>{body}</Text>
    </View>
  );
}
