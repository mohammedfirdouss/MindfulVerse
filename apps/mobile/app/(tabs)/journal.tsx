// Journal (web: apps/web/src/pages/Journal.tsx): reflections grouped by what
// they were written about, newest group first; delete; share as plain text.
// PDF export is deferred on native.
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionList, Share, View } from "react-native";
import { loadAyahsByKeys, loadSessions, loadSurahs } from "@mindfulverse/core/data";
import { deleteEntry, getEntries } from "@mindfulverse/core/journal";
import { groupEntries, type JournalGroup } from "@mindfulverse/core/journalGroups";
import { useAccount } from "@mindfulverse/core/sync/auth";
import { getSyncStatus, onSyncStatus, statusLabel, type SyncStatus } from "@mindfulverse/core/sync/engine";
import type { Ayah, JournalEntry } from "@mindfulverse/core/types";
import { EntryCard } from "../../src/components/Journal/EntryCard";
import {
  buildJournalText,
  exportVerseKeys,
  groupTitle,
  toSections,
} from "../../src/components/Journal/journalText";
import { space, useTheme } from "../../src/theme";
import { Button, Screen, Text } from "../../src/ui";

/** Empty state: quiet and minimal — one line of intent, one way to begin. */
function EmptyJournal() {
  return (
    <View style={{ alignItems: "center", paddingVertical: space.xxl, paddingHorizontal: 20, gap: 6 }}>
      <Text style={{ textAlign: "center" }} variant="body">
        Nothing here yet, and that’s fine.
      </Text>
      <Text variant="soft" style={{ textAlign: "center" }}>
        When a verse stops you, write what it said to you.
      </Text>
      <Link href="/checkin" asChild>
        <Button title="Begin with today’s verse" style={{ marginTop: 14 }} />
      </Link>
    </View>
  );
}

interface Section {
  group: JournalGroup;
  title: string;
  data: JournalEntry[];
}

export default function Journal() {
  const { colors } = useTheme();
  const { user, loading } = useAccount();
  const [entries, setEntries] = useState<JournalEntry[]>(getEntries);
  const [sessionTitles, setSessionTitles] = useState<Map<string, string>>(new Map());
  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());
  const [verses, setVerses] = useState<Map<string, Ayah>>(new Map());
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Nothing is reactive: re-read whenever the tab regains focus (a check-in or
  // tadabbur just saved, or an entry was deleted elsewhere).
  useFocusEffect(
    useCallback(() => {
      setEntries(getEntries());
    }, []),
  );

  useEffect(() => {
    loadSessions()
      .then((list) => setSessionTitles(new Map(list.map((s) => [s.id, s.title]))))
      .catch(() => {});
    loadSurahs()
      .then((list) => setSurahNames(new Map(list.map((s) => [s.number, s.name]))))
      .catch(() => {});
  }, []);

  // A sync can pull entries from the account after this screen mounted (a new
  // device, a cold open straight to the journal) — show them when it lands.
  useEffect(
    () =>
      onSyncStatus((s) => {
        setStatus(s);
        if (s === "synced") setEntries(getEntries());
      }),
    [],
  );

  // The verses entries were written about, loaded once per set of keys (core
  // caches each surah file). A missing verse just isn't shown, as on web.
  const verseKeys = useMemo(() => exportVerseKeys(entries).sort().join(","), [entries]);
  useEffect(() => {
    if (!verseKeys) return;
    let alive = true;
    loadAyahsByKeys(verseKeys.split(","))
      .then((list) => alive && setVerses(new Map(list.map((a) => [a.verseKey, a]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [verseKeys]);

  const groups = useMemo(() => groupEntries(entries), [entries]);
  const titleFor = useCallback(
    (g: JournalGroup) => groupTitle(g, surahNames, sessionTitles),
    [surahNames, sessionTitles],
  );
  const sections: Section[] = useMemo(
    () => groups.map((g) => ({ group: g, title: titleFor(g), data: g.entries })),
    [groups, titleFor],
  );

  const remove = useCallback((id: string) => {
    deleteEntry(id);
    setEntries(getEntries());
  }, []);

  async function shareText() {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const ayahs = await loadAyahsByKeys(exportVerseKeys(entries)).catch(() => [] as Ayah[]);
      const text = buildJournalText({
        sections: toSections(groups, titleFor, surahNames, new Map(ayahs.map((a) => [a.verseKey, a]))),
        exportedAt: new Date(),
      });
      await Share.share({ message: text, title: "MindfulVerse — Your reflections" });
    } catch {
      setExportError("Couldn’t share your journal — please try again.");
    } finally {
      setExporting(false);
    }
  }

  // Signed in, the line only exists to carry the sync status — skip it
  // entirely when there is no wording for the current status.
  const showStatus =
    !loading && (entries.length >= 3 || !!user) && (!user || statusLabel(status) !== "");

  const header = (
    <View style={{ gap: space.md, marginBottom: space.md }}>
      <View>
        <Text variant="eyebrow">Journal</Text>
        <Text variant="h1">Your reflections</Text>
        {user ? <Text variant="muted">Backed up to your account.</Text> : null}
      </View>
      {entries.length > 0 ? (
        <View style={{ gap: space.md }}>
          {showStatus ? (
            <Text variant="soft" style={{ fontSize: 15.6, lineHeight: 24 }} accessibilityLiveRegion="polite">
              {user ? (
                statusLabel(status)
              ) : (
                <>
                  Entries live only on this device.{" "}
                  <Link href="/account" style={{ color: colors.indigo }}>
                    Sign in
                  </Link>{" "}
                  to back them up.
                </>
              )}
            </Text>
          ) : null}
          <View style={{ alignItems: "flex-start" }}>
            <Button
              kind="secondary"
              title={exporting ? "Preparing your journal…" : "Share as text"}
              accessibilityHint="Opens the share sheet with your journal as plain text"
              busy={exporting}
              onPress={() => void shareText()}
            />
          </View>
          {exportError ? (
            <Text style={{ color: colors.kola }} accessibilityLiveRegion="assertive">
              {exportError}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false} contentStyle={{ paddingBottom: 0, paddingHorizontal: 0 }}>
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyJournal />}
        renderSectionHeader={({ section }) => {
          const { group: g, title } = section as Section;
          const n = g.entries.length;
          return (
            <View
              accessibilityRole="header"
              style={{
                borderBottomWidth: 2,
                borderBottomColor: colors.indigoWash,
                paddingBottom: space.sm,
                marginTop: space.lg,
                marginBottom: space.md,
              }}
            >
              <Text variant="h2" style={{ fontSize: 19.5, lineHeight: 26 }}>
                {title}
              </Text>
              <Text variant="muted" style={{ fontSize: 14.5, lineHeight: 22, marginTop: 2 }}>
                {n === 1 ? "1 reflection" : `${n} reflections`}
                {g.surah ? (
                  <>
                    {" · "}
                    <Link
                      href={{ pathname: "/tadabbur/[surah]", params: { surah: String(g.surah) } }}
                      style={{ color: colors.indigo }}
                    >
                      Continue this surah’s tadabbur
                    </Link>
                  </>
                ) : null}
              </Text>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        renderItem={({ item }) => (
          <EntryCard entry={item} verses={verses} sessionTitles={sessionTitles} onDelete={remove} />
        )}
      />
    </Screen>
  );
}
