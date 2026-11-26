import { loadSurahAyahs, loadSurahs } from "@mindfulverse/core/data";
import { getEntries } from "@mindfulverse/core/journal";
import { surahJournal, toLookInto } from "@mindfulverse/core/surahJournal";
import { onSyncStatus } from "@mindfulverse/core/sync/engine";
import type { Ayah } from "@mindfulverse/core/types";
// One surah's journal (web: pages/SurahJournal.tsx): the current intention,
// every "To look into" note (newest first, each opening its verse), each verse
// written on in verse order with its translation and entries, then check-ins
// on the surah. Save as PDF prints it and opens the share sheet.
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Share, View } from "react-native";

import {
  AlsoItem,
  IntentionQuote,
  LookIntoItem,
  VerseItem,
} from "../../../src/components/SurahJournal/PageParts";
import { buildSurahJournalHtml } from "../../../src/components/SurahJournal/pdfHtml";
import { shareJournalPdf } from "../../../src/components/SurahJournal/savePdf";
import {
  exportBaseName,
  surahJournalSections,
  titledJournalText,
} from "../../../src/components/SurahJournal/sections";
import { surahPageLabel } from "../../../src/components/Tadabbur/intention";
import { parseSurahParam } from "../../../src/components/Tadabbur/logic";
import { space, useTheme } from "../../../src/theme";
import { Button, Card, Screen, Text } from "../../../src/ui";
import { FadeRise, useReducedMotion } from "../../../src/ui/FadeRise";

type Exporting = "pdf" | "txt" | null;

function backToJournal() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/journal");
  }
}

export default function SurahJournalScreen() {
  const { surah } = useLocalSearchParams<{ surah: string }>();
  return (
    <SurahJournalPage key={String(surah)} surah={parseSurahParam(surah)} />
  );
}

function SurahJournalPage({ surah }: { surah: number | null }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahName, setSurahName] = useState<string | null>(null);
  const [exporting, setExporting] = useState<Exporting>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [entries, setEntries] = useState(getEntries);

  // Re-read on focus (an entry was just written) and when a sync lands.
  useFocusEffect(
    useCallback(() => {
      setEntries(getEntries());
    }, [])
  );
  useEffect(
    () =>
      onSyncStatus((s) => {
        if (s === "synced") {
          setEntries(getEntries());
        }
      }),
    []
  );

  const page = useMemo(
    () => (surah === null ? null : surahJournal(entries, surah)),
    [surah, entries]
  );

  useEffect(() => {
    if (surah === null) {
      return;
    }
    let active = true;
    loadSurahs()
      .then((list) => {
        if (active) {
          setSurahName(
            list.find((s) => s.number === surah)?.name ?? `Surah ${surah}`
          );
        }
      })
      .catch(() => {
        if (active) {
          setSurahName(`Surah ${surah}`);
        }
      });
    loadSurahAyahs(surah)
      .then((data) => {
        if (active) {
          setAyahs(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [surah]);

  const byKey = useMemo(
    () => new Map(ayahs.map((a) => [a.verseKey, a])),
    [ayahs]
  );

  if (surah === null || !page) {
    return (
      <Screen edges="bottom">
        <Stack.Screen options={{ title: "Journal" }} />
        <Card>
          <Text variant="h2">That surah isn’t here</Text>
          <Text variant="muted">That surah doesn’t exist.</Text>
          <View style={{ alignItems: "flex-start" }}>
            <Button
              kind="secondary"
              title="Back to your reflections"
              onPress={backToJournal}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  const name = surahName ?? `Surah ${surah}`;
  const research = toLookInto(page);
  const title = `${name} — my tadabbur`;

  async function exportPage(kind: "pdf" | "txt") {
    if (exporting || !page) {
      return;
    }
    setExporting(kind);
    setExportError(null);
    try {
      const input = {
        exportedAt: new Date(),
        sections: surahJournalSections(page, name, byKey),
        title,
      };
      await (kind === "pdf"
        ? shareJournalPdf(
            (fontCss) => buildSurahJournalHtml(input, fontCss),
            exportBaseName(name),
            title
          )
        : Share.share({
            message: titledJournalText(input, title),
            title: `MindfulVerse | ${title}`,
          }));
    } catch {
      setExportError(
        kind === "pdf"
          ? "Couldn’t make the PDF. Please try again, or use plain text."
          : "Couldn’t share your journal. Please try again."
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <Screen edges="bottom">
      <Stack.Screen options={{ title: name }} />
      <FadeRise reduce={reduce} style={{ gap: space.md }}>
        <View>
          <Text variant="eyebrow">{name}</Text>
          <Text variant="h1">{surahPageLabel(name)}</Text>
        </View>

        {page.isEmpty ? (
          <View style={{ alignItems: "flex-start", gap: space.sm }}>
            <Text variant="soft">{`Nothing written on ${name} yet.`}</Text>
            <View style={{ alignItems: "flex-start" }}>
              <Button
                kind="secondary"
                title="Begin pondering"
                onPress={() =>
                  router.push({
                    params: { surah: String(surah) },
                    pathname: "/tadabbur/[surah]",
                  })
                }
              />
            </View>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <Button
                title={exporting === "pdf" ? "Making your PDF…" : "Save as PDF"}
                accessibilityHint="Makes a PDF of this page and opens the share sheet"
                busy={exporting === "pdf"}
                disabled={exporting !== null}
                onPress={() => void exportPage("pdf")}
              />
              <Button
                kind="secondary"
                title="Plain text"
                accessibilityHint="Opens the share sheet with this page as plain text"
                busy={exporting === "txt"}
                disabled={exporting !== null}
                onPress={() => void exportPage("txt")}
              />
            </View>
            {exportError ? (
              <Text
                style={{ color: colors.kola }}
                accessibilityLiveRegion="assertive"
              >
                {exportError}
              </Text>
            ) : null}

            {page.intention ? (
              <Card>
                <Text variant="eyebrow" accessibilityRole="header">
                  My intention
                </Text>
                <IntentionQuote body={page.intention.body} />
              </Card>
            ) : null}

            {research.length > 0 ? (
              <Card>
                <Text
                  variant="h2"
                  accessibilityRole="header"
                  style={{ fontSize: 19.5, lineHeight: 26 }}
                >
                  To look into
                </Text>
                {research.map((r) => (
                  <LookIntoItem key={r.entryId} note={r} surah={surah} />
                ))}
              </Card>
            ) : null}

            {page.verses.map((v) => {
              const ayah = byKey.get(v.verseKey);
              return (
                <Card key={v.verseKey}>
                  <Text
                    variant="eyebrow"
                    accessibilityRole="header"
                    accessibilityLabel={`Verse ${v.verseKey}`}
                  >
                    {v.verseKey}
                  </Text>
                  {ayah ? (
                    <Text variant="translation" selectable>
                      {ayah.translation}
                    </Text>
                  ) : null}
                  {v.items.map((item) => (
                    <VerseItem key={item.entry.id} item={item} />
                  ))}
                </Card>
              );
            })}

            {page.also.length > 0 ? (
              <Card>
                <Text
                  variant="h2"
                  style={{ fontSize: 19.5, lineHeight: 26 }}
                >{`Also written on ${name}`}</Text>
                {page.also.map((e) => (
                  <AlsoItem key={e.id} entry={e} />
                ))}
              </Card>
            ) : null}
          </>
        )}
      </FadeRise>
    </Screen>
  );
}
