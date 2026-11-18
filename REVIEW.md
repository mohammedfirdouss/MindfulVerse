# Review rules

The verify skill and verifier agent read this from the base branch. Check only the items whose trigger matches the diff.
Add an item only when the same kind of bug has happened at least twice and can be seen in a diff. Remove items that never trigger or keep false-flagging.

## Focus for this codebase
- Users' journal entries and check-ins must never be lost (offline-first, sync to InsForge).
- Quran text, Arabic display and translator/author credits must be exact.
- Web and mobile share `packages/core`: a core change affects both apps.

## Checklist
| Trigger (visible in diff) | Check | Source |
|---|---|---|
| `packages/core/sync*`, journal, account merge, delete logic | Deletes survive sync; signed-out users make no sync requests; merging a guest into an account uploads everything once | ca38642, 485873c |
| localStorage / MMKV keys or stored shapes | Data saved by the previous version still loads (missing new fields); storage errors at startup don't crash | ca38642 |
| `migrations/*.sql` | RLS on every new table using `(select auth.uid())`; migration is additive; app still works before it's applied | 20261113100000 |
| Dates, reminders, daily verse | Correct across timezones and DST clock changes; no duplicate or missed reminders | 485873c, 75867ca |
| Arabic text or verse rendering | `dir="rtl"` and `lang="ar"` set; shaping correct on screen | 4799ef5 |
| Commentary / translation / word-by-word data | Credit shown for the source; numbered verses and brackets formatted | eddd252, eadd415 |
| Sheets, dialogs, forms, navigation | Focus trap, keyboard reachable, errors announced, reduced motion respected | adfabe4, 25a2a36, 5d1bc7f |
| Stats / counts / active days | No double counting (same event synced twice, day boundary) | e5eb7e8 |
| `functions/*` | Input validated, auth checked, unit test added next to it | 485873c |
