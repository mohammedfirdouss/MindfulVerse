// Topic sessions: short guided reflections, a few verses gathered around one
// theme. Port of the "By theme" half of web's pages/Sessions.tsx.
import { loadSessions } from "@mindfulverse/core/data";
import { getAllSessionProgress } from "@mindfulverse/core/progress";
import { sessionStatusText } from "@mindfulverse/core/sessionStatus";
import type { TadabburSession } from "@mindfulverse/core/types";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { sessionRows } from "../../src/components/Sessions/logic";
import type { SessionRow } from "../../src/components/Sessions/logic";
import { fonts, space, useTheme } from "../../src/theme";
import { Button, Card, LinkPressable, Screen, Text } from "../../src/ui";
import { ChevronIcon } from "../../src/ui/icons";

type Status =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; sessions: TadabburSession[] };

const KIND = {
  completed: "done",
  inProgress: "progress",
  new: "new",
} as const;

function stateWords(row: SessionRow): string {
  return sessionStatusText(KIND[row.state], row.step, row.session.steps.length);
}

function StateLabel({ row }: { row: SessionRow }) {
  const { colors } = useTheme();
  return (
    <Text
      variant="muted"
      style={row.state === "inProgress" ? { color: colors.indigo } : undefined}
    >
      {stateWords(row)}
    </Text>
  );
}

function Row({ row, first }: { row: SessionRow; first: boolean }) {
  const { colors } = useTheme();
  return (
    <LinkPressable
      href={`/sessions/${row.session.id}`}
      accessibilityLabel={`${row.session.theme}. ${stateWords(row)}`}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? colors.indigoWash : "transparent",
        borderColor: colors.line,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: 12,
        minHeight: 56,
        paddingVertical: 12,
      })}
    >
      <Text
        style={{
          color: colors.ink,
          flex: 1,
          fontFamily: fonts.readMedium,
        }}
      >
        {row.session.theme}
      </Text>
      <StateLabel row={row} />
      <ChevronIcon color={colors.inkFaint} />
    </LinkPressable>
  );
}

export default function Sessions() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(getAllSessionProgress);

  useFocusEffect(
    useCallback(() => {
      setProgress(getAllSessionProgress());
    }, [])
  );

  useEffect(() => {
    let alive = true;
    setStatus({ kind: "loading" });
    loadSessions()
      .then((sessions) => {
        if (alive) {
          setStatus({ kind: "ready", sessions });
        }
      })
      .catch(() => {
        if (alive) {
          setStatus({ kind: "error" });
        }
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const rows = useMemo(
    () =>
      status.kind === "ready" ? sessionRows(status.sessions, progress) : [],
    [status, progress]
  );

  return (
    <Screen edges="bottom">
      <Stack.Screen options={{ title: "Tadabbur" }} />
      <Text variant="soft">A few verses on one theme.</Text>

      {status.kind === "loading" ? (
        <View
          style={{ alignItems: "center", flexDirection: "row", gap: space.sm }}
          accessible
          accessibilityLabel="Gathering the sessions"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator color={colors.indigo} />
          <Text variant="muted">Gathering the sessions…</Text>
        </View>
      ) : null}

      {status.kind === "error" ? (
        <Card>
          <Text variant="h2">We couldn’t reach the sessions</Text>
          <Text variant="muted">
            Something interrupted them loading. Try again in a moment.
          </Text>
          <View style={{ alignItems: "flex-start" }}>
            <Button
              kind="secondary"
              title="Try again"
              onPress={() => setAttempt((x) => x + 1)}
            />
          </View>
        </Card>
      ) : null}

      {status.kind === "ready" && rows.length === 0 ? (
        <Text variant="muted">No sessions yet.</Text>
      ) : null}

      {rows.length > 0 ? (
        <View>
          {rows.map((row, i) => (
            <Row key={row.session.id} row={row} first={i === 0} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
