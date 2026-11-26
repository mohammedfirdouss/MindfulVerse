import { parseFollowUpBody } from "@mindfulverse/core/followUps";
import type {
  SurahJournalItem,
  ToLookInto,
} from "@mindfulverse/core/surahJournal";
import { PART_ORDER, TADABBUR_LABELS } from "@mindfulverse/core/tadabburBody";
import type { TadabburParts } from "@mindfulverse/core/tadabburBody";
import type { JournalEntry } from "@mindfulverse/core/types";
import type { ReactNode } from "react";
import { View } from "react-native";

import { fonts, space, useTheme } from "../../theme";
import { LinkPressable, Text } from "../../ui";
import { formatDate } from "../Journal/journalText";
import { followUpLine } from "./sections";

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

/** Every labelled part that has text, in the order bodies are written. Walks
 *  core's whole PART_ORDER so no saved part, old or new, is ever left out. */
function Parts({ parts }: { parts: TadabburParts }) {
  const { colors } = useTheme();
  return (
    <>
      {PART_ORDER.map((key) =>
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

/** A "To look into" note: the verse it came from (opens that verse in the
 *  surah's Tadabbur, like web's link) and the note itself. */
export function LookIntoItem({
  note,
  surah,
}: {
  note: ToLookInto;
  surah: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderTopColor: colors.line,
        borderTopWidth: 1,
        gap: space.xs,
        paddingTop: 12,
      }}
    >
      <LinkPressable
        href={{
          params: { surah: String(surah), v: String(note.ayah) },
          pathname: "/tadabbur/[surah]",
        }}
        accessibilityLabel={`Verse ${note.verseKey}`}
        accessibilityHint="Opens this verse"
        hitSlop={8}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          justifyContent: "center",
          minHeight: 44,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            color: colors.indigo,
            fontFamily: fonts.readSemiBold,
            fontSize: 14.5,
            lineHeight: 22,
            textDecorationLine: "underline",
          }}
        >
          {note.verseKey}
        </Text>
      </LinkPressable>
      <Text selectable>{note.text}</Text>
    </View>
  );
}
