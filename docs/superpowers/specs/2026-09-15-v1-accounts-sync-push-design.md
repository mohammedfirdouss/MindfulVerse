# MindfulVerse v1 — Accounts, Journal/Progress Cloud Sync, Push Reminders

**Date:** 2026-09-15
**Status:** Approved design (gate cleared: retention signal met per ROADMAP.md)
**Scope:** Roadmap v1 priorities 1, 2, and 4. Billing (priority 3) is explicitly
out of scope — still blocked on a commercial-safe translation license. React
Native (priority 5) out of scope.

## Goal

Give users an opt-in identity so their journal and progress survive device
loss/change, and a daily verse reminder — the biggest retention lever the PWA
lacks. The logged-out experience must remain byte-for-byte what v0 ships: the
Qur'an is always free, and the app stays fully offline-capable.

## Platform

**InsForge** (first server component): auth (Google OAuth + email/password),
Postgres with row-level security, edge functions, schedules, secrets. The
client talks to it via `@insforge/sdk`. No API layer of our own for data
access.

## Architecture: local-first + RLS

localStorage remains the source of truth for all reads. A background sync
layer reconciles it with per-user Postgres rows. All merges are commutative,
so there is no conflict machinery:

- Journal entries are append-only with client-generated UUIDs → merge = union
  by `id`, with soft deletes (`deleted_at`) winning.
- Progress values only ever advance (furthest step, furthest ayah, visit-day
  set, latest last-read) → merge = per-key max / latest / set-union.

Rejected alternatives: server-authoritative API (breaks offline, ~2× code);
whole-snapshot blob backup (no real multi-device merge).

## Data model

All tables have RLS: a user can only read/write rows where
`user_id = auth.uid()`.

### `journal_entries`

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | client-generated (same UUIDs as localStorage today) |
| `user_id` | uuid | owner, FK to auth user |
| `prompt` | text | mirrors `JournalEntry.prompt` |
| `body` | text | mirrors `JournalEntry.body` |
| `context_kind` | text nullable | `session` \| `checkin` \| `tadabbur` \| `free` |
| `context_ref` | text nullable | mirrors `JournalEntry.context.ref` |
| `created_at` | bigint | epoch ms, from the client (preserves original order) |
| `deleted_at` | bigint nullable | soft delete so deletions propagate across devices |
| `updated_at` | timestamptz | server default, for pull-since queries |

### `progress` (one row per user)

| column | type | notes |
| --- | --- | --- |
| `user_id` | uuid PK | |
| `visits` | jsonb | string[] of YYYY-MM-DD, capped at 366 after merge |
| `session_progress` | jsonb | map `sessionId → { step, completedAt? }` |
| `surah_tadabbur` | jsonb | map `surah → { ayah, updatedAt }` |
| `last_read` | jsonb nullable | `{ surah, ayah, at }` |
| `updated_at` | timestamptz | |

Jsonb maps (not normalized rows) because merge logic lives in the client sync
layer; the server schema stays stable as progress types evolve.

### `push_subscriptions`

| column | type | notes |
| --- | --- | --- |
| `endpoint` | text PK | from `PushSubscription.endpoint` |
| `user_id` | uuid | multiple rows per user = multiple devices |
| `keys` | jsonb | `{ p256dh, auth }` |
| `reminder_time` | text | user-chosen local time, `HH:MM` |
| `timezone` | text | IANA zone from `Intl.DateTimeFormat` |
| `created_at` | timestamptz | |

## Auth

- Methods: Google OAuth + email/password, via InsForge auth.
- New `src/lib/auth.ts` wraps the SDK; an `AccountContext` provider exposes
  `user | null` app-wide.
- Sign-in UI on a new **Account** page (`src/pages/Account.tsx`), linked from
  Home and Stats. Nothing is gated on auth anywhere.
- On first sign-in with existing local data: immediate upload, confirmed in
  the UI ("your journal is now backed up").

## Sync engine (`src/lib/sync.ts`)

- `journal.ts` / `progress.ts` keep their exact current APIs against
  localStorage; writes additionally set a dirty flag.
- A sync pass runs: on sign-in, on `visibilitychange`/`online`, and debounced
  after local writes.
- Pass = pull remote → merge into local (rules above) → push local diff.
- Sync status ("backed up ✓" / "offline — will sync") shown on Journal and
  Account pages.
- Sign-out leaves local data intact with a visible "no longer backing up"
  state.

## Push pipeline

- **Subscribe (client):** Account page reminder toggle + time picker →
  service worker `pushManager.subscribe` with the VAPID public key → upsert
  into `push_subscriptions` with time + timezone. Requires sign-in (the
  subscription row needs an owner).
- **Send (server):** one edge function `send-reminders`, run by an InsForge
  schedule every 15 minutes. Selects subscriptions whose local
  `reminder_time` falls in the current 15-minute bucket for their `timezone`,
  builds the verse-of-the-day payload (rotation logic ported from
  `src/lib/dailyVerse.ts`), sends via Web Push (VAPID keys in InsForge
  secrets). HTTP 404/410 from a push service prunes that subscription row.
- **Receive (client):** service-worker `push` handler shows the notification;
  `notificationclick` opens `/checkin`. Implemented as custom SW additions
  through `vite-plugin-pwa`.
- **iOS:** when `Notification` is unavailable (Safari tab), the Account page
  explains install-to-home-screen first; the toggle stays disabled until then.

## UI touchpoints

- New: `src/pages/Account.tsx` — sign in/up/out, sync status, reminder
  toggle + time picker, journal export (existing export moved/linked here),
  delete account.
- Journal page: logged-out backup nudge becomes "sign in to back up";
  logged-in shows sync status.
- Stats page: account row.
- App shell: `/account` route + nav item.
- `src/lib/analytics.ts`: new events — sign-up, sign-in, sync success/failure,
  reminder enabled/disabled.

## Error handling & edges

- Offline: all features work locally; sync retries on reconnect.
- Merge after long offline: commutative rules make ordering irrelevant.
- Data deletion: a "Delete my data" action removes all the user's rows
  (journal, progress, push subscriptions) via RLS-scoped deletes and signs
  out; local data is untouched and the user is told so. (The InsForge SDK
  exposes no self-serve account-record deletion; removing the auth record
  itself is an admin/dashboard operation.)
- Dead push endpoints: pruned on 404/410 during send.
- localStorage quota/corruption: existing try/catch behavior unchanged; sync
  additionally means the cloud copy survives local loss.

## Testing

- **TDD (unit):** merge functions (journal union + soft delete; progress
  per-key max/union) and the reminder timezone-bucket selection. These are
  the only intricate logic; both are pure functions.
- **Integration:** Playwright — sign-in → write entry → sync → verify
  round-trip against a dev InsForge project.
- **Manual device matrix for push:** Android Chrome, desktop Chrome/Edge,
  iOS installed PWA.

## Prerequisites / setup

- InsForge project created and configured via the InsForge CLI: tables +
  RLS policies (migrations), Google OAuth credentials, VAPID key pair in
  secrets, `send-reminders` function + 15-minute schedule.
- Google OAuth client (Cloud Console) — needs the production origin
  (mindfulverse.vercel.app) and localhost for dev.
