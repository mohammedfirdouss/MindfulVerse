import { commentaryParagraphs } from "@mindfulverse/core/commentaryText";
import type { Ayah } from "@mindfulverse/core/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useShareVerse } from "../../share";
import { fonts, space, useTheme } from "../../theme";
import { ArabicText, Sheet, Text } from "../../ui";
import { ActionLink } from "./ActionLink";
import {
  commentaryLabel,
  commentaryTitle,
  coveringFor,
  deeperLookTitle,
} from "./commentary";
import type { TafsirIndex } from "./commentary";
import { RelatedVerses, SectionHeading } from "./RelatedVerses";
import type { Tafsir } from "./useTafsir";
import { VerseBrief } from "./VerseBrief";
import { VerseWords } from "./VerseWords";

/** Web's CommentaryBody: the verse, then Ibn Kathir's paragraphs. */
export function CommentaryBody({
  ayah,
  source,
  text,
  failed,
  onClose,
  onExpand,
}: {
  ayah: Ayah;
  /** Called when the commentary is unfolded, to load it on first need. */
  onExpand: () => void;
  /** The verse whose Ibn Kathir entry covers this one. */
  source: number;
  /** Closes the sheet before a related verse opens. */
  onClose: () => void;
  text: string | null;
  failed: boolean;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  // Folded until asked for: it is long, and its file is the largest to read.
  const [open, setOpen] = useState(false);
  const paragraphs = commentaryParagraphs(text);

  function toggle() {
    if (!open) {
      onExpand();
    }
    setOpen(!open);
  }

  function openVerse(a: Ayah) {
    onClose();
    router.push({
      params: { surah: String(a.surah), v: String(a.ayah) },
      pathname: "/read/[surah]",
    });
  }
  return (
    <View style={{ gap: space.md }}>
      <VerseWords ayah={ayah} />
      <VerseBrief ayah={ayah} />
      <RelatedVerses ayah={ayah} onOpenVerse={openVerse} />
      <SectionHeading>{commentaryTitle(ayah, source)}</SectionHeading>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: space.md,
          justifyContent: "space-between",
          minHeight: 44,
        }}
      >
        <Text
          style={{
            color: colors.indigo,
            flex: 1,
            fontFamily: fonts.readMedium,
          }}
        >
          {open ? "Hide the commentary" : "Read the full commentary"}
        </Text>
        <Text style={{ color: colors.indigo }}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? (
        failed ? (
          <Text variant="muted">
            The commentary isn’t available offline yet. Try again when you’re
            connected.
          </Text>
        ) : text === null ? (
          <Text variant="muted">Opening the commentary…</Text>
        ) : (
          <>
            {paragraphs.map((p, i) => (
              <Text key={i} variant="soft">
                {p}
              </Text>
            ))}
            <Text variant="muted" style={{ fontSize: 13.5, lineHeight: 20 }}>
              Verse quotations inside the commentary follow its classical
              English edition, which differs from the ClearQuran translation
              shown in the reader.
            </Text>
          </>
        )
      ) : null}
    </View>
  );
}

/** Translation view: the commentary on one verse (web CommentarySheet). */
export function CommentarySheet({
  ayah,
  index,
  tafsir,
  onClose,
}: {
  ayah: Ayah;
  index: TafsirIndex | null;
  tafsir: Tafsir;
  onClose: () => void;
}) {
  const covering = coveringFor(index, ayah);
  if (covering === null) {
    return null;
  }
  return (
    <Sheet
      scroll
      label={`Deeper look at verse ${ayah.verseKey}`}
      title={deeperLookTitle(ayah)}
      onClose={onClose}
    >
      <CommentaryBody
        ayah={ayah}
        source={covering}
        onClose={onClose}
        onExpand={() => tafsir.request(ayah.surah)}
        text={tafsir.textFor(ayah, covering)}
        failed={tafsir.failedFor(ayah.surah)}
      />
    </Sheet>
  );
}

/** Reading view: a tapped verse, its translation and what you can do with it
 *  (web VerseSheet). Commentary opens inside the same sheet. */
export function VerseSheet({
  ayah,
  index,
  tafsir,
  onClose,
}: {
  ayah: Ayah;
  index: TafsirIndex | null;
  tafsir: Tafsir;
  onClose: () => void;
}) {
  const router = useRouter();
  const [showCommentary, setShowCommentary] = useState(false);
  const share = useShareVerse("reader");
  const covering = coveringFor(index, ayah);

  function openCommentary() {
    if (covering === null) {
      return;
    }
    setShowCommentary(true);
  }

  function reflect() {
    onClose();
    router.push({
      params: { surah: String(ayah.surah), v: String(ayah.ayah) },
      pathname: "/tadabbur/[surah]",
    });
  }

  const inCommentary = showCommentary && covering !== null;
  return (
    <Sheet
      scroll
      label={`Verse ${ayah.verseKey}`}
      title={inCommentary ? deeperLookTitle(ayah) : `Verse ${ayah.verseKey}`}
      onClose={onClose}
    >
      {inCommentary ? (
        <View style={{ gap: space.md }}>
          <ActionLink
            title="← Back to the verse"
            onPress={() => setShowCommentary(false)}
          />
          <CommentaryBody
            ayah={ayah}
            source={covering}
            onClose={onClose}
            onExpand={() => tafsir.request(ayah.surah)}
            text={tafsir.textFor(ayah, covering)}
            failed={tafsir.failedFor(ayah.surah)}
          />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <ArabicText scale={0.8}>{ayah.arabic}</ArabicText>
          <Text variant="translation">{ayah.translation}</Text>
          <View
            style={{
              columnGap: space.lg,
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: space.sm,
              rowGap: space.sm,
            }}
          >
            <ActionLink
              title={commentaryLabel(index, ayah)}
              disabled={covering === null}
              onPress={openCommentary}
            />
            <ActionLink
              title={share.label ?? "Share"}
              accessibilityLabel={`Share verse ${ayah.verseKey}`}
              onPress={() => void share.share(ayah)}
            />
            <ActionLink title="Reflect on this verse" onPress={reflect} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
