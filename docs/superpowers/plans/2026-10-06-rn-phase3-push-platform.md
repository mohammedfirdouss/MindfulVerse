# RN Phase 3 — push platform (backend) — as built

**Date:** 2026-10-06
**Branch:** `feat/push-platform`
**Spec:** `2026-09-22-react-native-app-design.md` → "Phase 3 — backend", open risk #3.

Status: code and tests done. **Not applied, not deployed** — run the steps
under "Apply later" when the native app is ready to register devices.

## What changed

### Migration `migrations/20261006205107_push-subscriptions-platform.sql`

Additive change to `push_subscriptions`:

| Change | Why |
| --- | --- |
| `platform TEXT NOT NULL DEFAULT 'web'` | Existing rows become `web` with no backfill |
| `CHECK (platform IN ('web','expo'))` | Rejects typos and unknown transports |
| `keys` drops `NOT NULL` | Expo rows carry no Web Push keys |
| `CHECK (platform <> 'web' OR keys IS NOT NULL)` | Web rows still require keys |
| `CHECK (platform <> 'expo' OR endpoint ~ '^Expo(nent)?PushToken\[.+\]$')` | Catches a client writing the wrong value into `endpoint` |

The RLS policies (`own_push_select/insert/update/delete`, all
`user_id = auth.uid()`) and the grants to `authenticated` are unchanged. They
are row-level on `user_id`, so they already cover native rows.

I ran the SQL against an in-memory Postgres (PGlite) holding the original
table. The existing web row came back as `platform = 'web'`. An expo row with
no keys was accepted (both token prefixes). A web row without keys, an unknown
platform, and an expo row whose endpoint is not a token were all rejected.

### Function `functions/send-reminders.ts`

The two notification stacks split only at the send step:

- New exported `deliverReminders(items, deps)` takes the rows that are due,
  each with its payload already built. Rows with `platform = 'web'` (or no
  platform) go through `web-push` with the same 404/410 prune logic as
  before. Rows with `platform = 'expo'` are collected, then POSTed to
  `https://exp.host/--/api/v2/push/send` as a JSON array, at most 100 per
  request.
- `expoMessage(token, payload)` turns the existing web payload JSON
  `{title, body, url}` into
  `{ to, title, body, sound: "default", data: { url } }`.
- Expo tickets come back in request order:
  - `status: "ok"` stamps `last_sent_date` on that row.
  - `details.error === "DeviceNotRegistered"` deletes that row.
  - Any other ticket error is logged with tokens redacted and counted as
    `failed`.
  - A non-2xx response or a thrown fetch fails only that batch. Later batches
    and the web rows still go out. The function never throws on a send.
- `Authorization: Bearer $EXPO_ACCESS_TOKEN` is sent only when that optional
  secret is set.
- The cron path still runs the same steps: auth, row fetch (now also
  selecting `platform`), the 15-minute window, `last_sent_date` skip,
  `pickContinueTarget()` and payload building. The only change is that it
  hands the due rows to `deliverReminders`. The response shape is unchanged:
  `{ sent, pruned, skipped, failed }`.
- Welcome path (`POST` with a user JWT and `{ endpoint }`): an expo row goes
  through `deliverReminders` with the caller's RLS-scoped client. A web row
  takes the original code path, unchanged.

`last_sent_date` is stored on each row (`.eq("endpoint", …)`), not per user.
A user with a web row and an expo row gets one reminder on each device, and
each row is stamped separately. This matches how multiple web devices already
behave.

### Tests

- `functions/reminder-logic.test.ts`: unchanged, 13/13 pass.
- New `functions/push-platform.test.ts` (17 tests): web/expo/mixed/unknown
  branching, pre-migration rows treated as web, Expo request body including
  `data.url`, Bearer header only when set, 250 rows → batches of 100/100/50,
  DeviceNotRegistered pruning, other ticket errors, a failed batch followed by
  a good one, a thrown fetch, missing tickets, and web 404/410 prune parity.
- Full suite: 62 → 79 passing (`npx vitest run`).

## Mobile registration contract

Table `public.push_subscriptions`. Each device+account pair is one row.

| Column | Native value |
| --- | --- |
| `endpoint` (PK) | Expo push token, `ExponentPushToken[…]`, from `Notifications.getExpoPushTokenAsync({ projectId })` |
| `platform` | `'expo'` (required; the default `'web'` would fail the keys check) |
| `user_id` | omit: defaults to `auth.uid()`, and RLS requires it to equal the caller |
| `keys` | omit / `null` |
| `reminder_time` | `'HH:MM'` local, NOT NULL |
| `timezone` | IANA zone, NOT NULL (e.g. `Intl.DateTimeFormat().resolvedOptions().timeZone`) |
| `last_sent_date`, `created_at` | server-managed, omit |

These are the same calls web makes (`src/lib/sync/push.ts`). The authenticated
`insforge` client needs to be signed in:

```ts
// enable: delete-then-insert acts as an upsert under RLS
await insforge.database.from("push_subscriptions").delete().eq("endpoint", token);
await insforge.database.from("push_subscriptions").insert([
  { endpoint: token, platform: "expo", reminder_time: time, timezone },
]);
// optional welcome push (today's verse now; stamps last_sent_date)
await insforge.functions.invoke("send-reminders", { body: { endpoint: token } });

// read current time
await insforge.database.from("push_subscriptions").select("reminder_time").eq("endpoint", token).maybeSingle();
// change time
await insforge.database.from("push_subscriptions").update({ reminder_time: time }).eq("endpoint", token);
// disable
await insforge.database.from("push_subscriptions").delete().eq("endpoint", token);
// before sign-out (Account.tsx does this): RLS blocks it once signed out
await insforge.database.from("push_subscriptions").delete().eq("user_id", user.id);
```

Notification payload the app receives (`notification.request.content`):

- `title`, `body`: the same text as web.
- `data.url`: one of
  - `"/tadabbur/{surah}?v={ayah}"` (continue nudge)
  - `"/checkin"` (daily verse fallback, and the welcome push)

Route on `data.url` in both places: the cold-start response
(`getLastNotificationResponseAsync`) and the
`addNotificationResponseReceivedListener` handler.

## Apply later (do not run until the app ships registration)

Order matters. The new function selects `platform`, so the migration has to
go in first.

```bash
npx -y @insforge/cli db migrations list          # confirm remote head is 20260915100614 (or older than 20261006205107)
npx -y @insforge/cli db migrations up 20261006205107_push-subscriptions-platform.sql
npx -y @insforge/cli db query "SELECT platform, count(*) FROM push_subscriptions GROUP BY 1"   # expect only 'web'
# optional, Expo "enhanced push security":
npx -y @insforge/cli secrets add EXPO_ACCESS_TOKEN <token>
npx -y @insforge/cli functions deploy send-reminders --file functions/send-reminders.ts --name "Send daily reminders"
npx -y @insforge/cli functions list              # expect send-reminders active
```

The existing 15-minute schedule and `CRON_SECRET` stay as they are. Smoke
test: wait for the next scheduled run, or check `schedules logs <id>`. With
only web rows, `sent/skipped` should look the same as before the change.

If the remote head is newer than `20261006205107`, rename the file to a later
version, e.g. by moving the SQL into the file from
`npx -y @insforge/cli db migrations new push-subscriptions-platform`.

## Rollback

1. Function first, so nothing selects `platform` after the column is gone:
   ```bash
   git show bb1a248:functions/send-reminders.ts > /tmp/send-reminders.prev.ts
   npx -y @insforge/cli functions deploy send-reminders --file /tmp/send-reminders.prev.ts --name "Send daily reminders"
   ```
2. Schema, as a new forward migration (applied history is not edited):
   ```sql
   DELETE FROM public.push_subscriptions WHERE platform <> 'web';
   ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_expo_token_check;
   ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_web_keys_check;
   ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_platform_check;
   ALTER TABLE public.push_subscriptions ALTER COLUMN keys SET NOT NULL;
   ALTER TABLE public.push_subscriptions DROP COLUMN platform;
   ```
   The old function ignores the extra column, so step 2 is optional. Leaving
   the column in place is harmless.

## Known gaps / follow-ups

- **Push receipts are not polled.** Expo can also report `DeviceNotRegistered`
  later, in receipts (`/--/api/v2/push/getReceipts`), after an `ok` ticket.
  Today only tickets prune. Tokens that die that way are pruned on the next
  day's ticket instead, which is good enough at current volume.
- No retry or backoff on `MessageRateExceeded` or 5xx. Those rows count as
  `failed` and are not stamped. The next run is already outside that row's
  15-minute window, so the reminder is effectively dropped for the day. Web
  failures behave the same way today.
- A device token is the PK. If account B signs in on a device whose token
  still belongs to account A's row, B's delete matches nothing under RLS and
  the insert hits a PK conflict. This is the same limit web has. The app must
  delete by `user_id` before sign-out, as web does.
