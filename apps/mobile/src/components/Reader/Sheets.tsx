import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { Ayah } from "@mindfulverse/core/types";
import { space, useTheme } from "../../theme";
import { ArabicText, Text } from "../../ui";
import { ActionLink } from "./ActionLink";
import {
  commentaryLabel,
  commentaryTitle,
  coveringFor,
  splitParagraphs,
  type TafsirIndex,
} from "./commentary";
import { useShareVerse } from "../../share";
import { Sheet } from "./Sheet";
import type { Tafsir } from "./useTafsir";

/** Web's CommentaryBody: the verse, then Ibn Kathir's paragraphs. */
export function CommentaryBody({ ayah, text, failed }: { ayah: Ayah; text: string | null; failed: boolean }) {
  const { colors } = useTheme();
  const paragraphs = splitParagraphs(text);
  return (
    <View style={{ gap: space.md }}>
      <ArabicText
        scale={0.74}
        style={{ paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: colors.line }}
      >
        {ayah.arabic}
      </ArabicText>
      {failed ? (
        <Text variant="muted">The commentary isn’t available offline yet. Try again when you’re connected.</Text>
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
            Verse quotations inside the commentary follow its classical English edition, which differs from the
            ClearQuran translation shown in the reader.
          </Text>
        </>
      )}
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
  const { request } = tafsir;
  useEffect(() => {
    request(ayah.surah);
  }, [request, ayah.surah]);
  if (covering === null) return null;
  return (
    <Sheet label={`Commentary on verse ${ayah.verseKey}`} title={commentaryTitle(ayah, covering)} onClose={onClose}>
      <CommentaryBody ayah={ayah} text={tafsir.textFor(ayah, covering)} failed={tafsir.failedFor(ayah.surah)} />
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
    if (covering === null) return;
    tafsir.request(ayah.surah);
    setShowCommentary(true);
  }

  function reflect() {
    onClose();
    router.push({ pathname: "/tadabbur/[surah]", params: { surah: String(ayah.surah), v: String(ayah.ayah) } });
  }

  const inCommentary = showCommentary && covering !== null;
  return (
    <Sheet
      label={`Verse ${ayah.verseKey}`}
      title={inCommentary ? commentaryTitle(ayah, covering) : `Verse ${ayah.verseKey}`}
      onClose={onClose}
    >
      {inCommentary ? (
        <View style={{ gap: space.md }}>
          <ActionLink title="← Back to the verse" onPress={() => setShowCommentary(false)} />
          <CommentaryBody ayah={ayah} text={tafsir.textFor(ayah, covering)} failed={tafsir.failedFor(ayah.surah)} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <ArabicText scale={0.8}>{ayah.arabic}</ArabicText>
          <Text variant="translation">{ayah.translation}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: space.lg, rowGap: space.sm, marginTop: space.sm }}>
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
