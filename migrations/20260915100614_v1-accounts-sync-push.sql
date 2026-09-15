CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  context_kind TEXT,
  context_ref TEXT,
  created_at BIGINT NOT NULL,
  deleted_at BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX journal_entries_user_updated ON journal_entries (user_id, updated_at);

CREATE TABLE progress (
  user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  visits JSONB NOT NULL DEFAULT '[]',
  session_progress JSONB NOT NULL DEFAULT '{}',
  surah_tadabbur JSONB NOT NULL DEFAULT '{}',
  last_read JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  keys JSONB NOT NULL,
  reminder_time TEXT NOT NULL,      -- 'HH:MM' local
  timezone TEXT NOT NULL,           -- IANA zone
  last_sent_date TEXT,              -- 'YYYY-MM-DD' in the sub's local zone
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX push_subscriptions_user ON push_subscriptions (user_id);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_journal_select" ON journal_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_journal_insert" ON journal_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_journal_update" ON journal_entries FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_journal_delete" ON journal_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own_progress_select" ON progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_progress_insert" ON progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_progress_update" ON progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_progress_delete" ON progress FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own_push_select" ON push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_push_insert" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_push_update" ON push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_push_delete" ON push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries, progress, push_subscriptions TO authenticated;

CREATE TRIGGER journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER progress_updated_at BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
