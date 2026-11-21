-- Circles, round two: a weekly portion, an anonymous member count, and the
-- surahs a circle has read together. Nothing here holds or reveals what anyone
-- writes, and no row names a person: members are counted by install id only.

-- ---- The weekly portion ----
-- A circle reads verse..verse_end this week. verse alone keeps its old meaning
-- (a focus verse); verse_end needs verse and can't come before it.
ALTER TABLE public.circles
  ADD COLUMN verse_end INT CHECK (verse_end BETWEEN 1 AND 286);
ALTER TABLE public.circles
  ADD CONSTRAINT circles_portion_order
  CHECK (verse_end IS NULL OR (verse IS NOT NULL AND verse_end >= verse));

-- get_circle gains verse_end. The return type changes, so drop and recreate;
-- older apps ignore the extra column.
DROP FUNCTION IF EXISTS public.get_circle(TEXT);
CREATE FUNCTION public.get_circle(p_code TEXT)
RETURNS TABLE (code TEXT, name TEXT, surah INT, verse INT, verse_end INT, updated_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.name, c.surah, c.verse, c.verse_end, c.updated_at
  FROM public.circles c
  WHERE c.code = p_code
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_circle(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_circle(TEXT) TO anon, authenticated;

-- ---- Members, counted anonymously ----
-- One row per install and circle, with the last local day the app was open in
-- the circle. Never readable by clients: only the count below, shown at 2+.
CREATE TABLE public.circle_members (
  install_id UUID NOT NULL,
  circle_code TEXT NOT NULL REFERENCES public.circles(code) ON DELETE CASCADE,
  last_seen DATE NOT NULL DEFAULT current_date,
  PRIMARY KEY (install_id, circle_code)
);
CREATE INDEX circle_members_code_seen ON public.circle_members (circle_code, last_seen);
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.circle_members FROM anon, authenticated, PUBLIC;

-- Join, or say "still here" (at most once a day from the app).
CREATE OR REPLACE FUNCTION public.circle_touch(p_code TEXT, p_install_id UUID)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.circle_members (install_id, circle_code, last_seen)
  SELECT p_install_id, c.code, current_date
  FROM public.circles c
  WHERE c.code = p_code
  ON CONFLICT (install_id, circle_code)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
$$;
REVOKE ALL ON FUNCTION public.circle_touch(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.circle_touch(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.circle_leave(p_code TEXT, p_install_id UUID)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.circle_members
  WHERE circle_code = p_code AND install_id = p_install_id;
$$;
REVOKE ALL ON FUNCTION public.circle_leave(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.circle_leave(TEXT, UUID) TO anon, authenticated;

-- Members seen in the last 30 days, so phones that left quietly drop out.
CREATE OR REPLACE FUNCTION public.circle_member_count(p_code TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::INTEGER
  FROM public.circle_members m
  WHERE m.circle_code = p_code
    AND m.last_seen >= current_date - 29;
$$;
REVOKE ALL ON FUNCTION public.circle_member_count(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.circle_member_count(TEXT) TO anon, authenticated;

-- ---- Surahs read together ----
-- One row per surah a circle has read, kept by triggers on circles: a new
-- circle opens its first row, and changing the surah closes the open row and
-- opens the next. Clients only read it through circle_history().
CREATE TABLE public.circle_surah_history (
  circle_code TEXT NOT NULL REFERENCES public.circles(code) ON DELETE CASCADE,
  surah INT NOT NULL CHECK (surah BETWEEN 1 AND 114),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  PRIMARY KEY (circle_code, started_at)
);
ALTER TABLE public.circle_surah_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.circle_surah_history FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.circles_track_surah()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.circle_surah_history (circle_code, surah, started_at)
    VALUES (NEW.code, NEW.surah, now());
  ELSIF NEW.surah IS DISTINCT FROM OLD.surah THEN
    UPDATE public.circle_surah_history
      SET ended_at = now()
      WHERE circle_code = NEW.code AND ended_at IS NULL;
    INSERT INTO public.circle_surah_history (circle_code, surah, started_at)
    VALUES (NEW.code, NEW.surah, now());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.circles_track_surah() FROM PUBLIC;

CREATE TRIGGER circles_track_surah_insert AFTER INSERT ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.circles_track_surah();
CREATE TRIGGER circles_track_surah_update AFTER UPDATE OF surah ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.circles_track_surah();

-- Existing circles start their history at the surah they're reading now.
INSERT INTO public.circle_surah_history (circle_code, surah, started_at)
SELECT c.code, c.surah, COALESCE(c.created_at, now())
FROM public.circles c
ON CONFLICT DO NOTHING;

-- The surahs a circle has read, oldest first; the current one has no end.
CREATE OR REPLACE FUNCTION public.circle_history(p_code TEXT)
RETURNS TABLE (surah INT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.surah, h.started_at, h.ended_at
  FROM public.circle_surah_history h
  WHERE h.circle_code = p_code
  ORDER BY h.started_at
  LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.circle_history(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.circle_history(TEXT) TO anon, authenticated;
