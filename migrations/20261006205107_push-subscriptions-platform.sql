-- RN Phase 3: one push_subscriptions table for both notification stacks.
--   platform = 'web'  → endpoint is a Web Push URL, keys holds {p256dh, auth}
--   platform = 'expo' → endpoint is an Expo push token, keys is NULL
-- Additive: every existing row becomes platform = 'web' via the default and
-- keeps satisfying every constraint below. RLS policies are row-level on
-- user_id and are unchanged, so they already cover native rows.

ALTER TABLE public.push_subscriptions
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'web';

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_platform_check
  CHECK (platform IN ('web', 'expo'));

-- Expo rows carry no Web Push keys; web rows still must.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN keys DROP NOT NULL;

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_web_keys_check
  CHECK (platform <> 'web' OR keys IS NOT NULL);

-- Catch a client writing the wrong thing into endpoint for a native row.
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_expo_token_check
  CHECK (platform <> 'expo' OR endpoint ~ '^Expo(nent)?PushToken\[.+\]$');
