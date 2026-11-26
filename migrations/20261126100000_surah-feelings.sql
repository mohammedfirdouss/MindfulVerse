-- Anonymous feelings cloud: after reflecting on a surah, a reader may opt in to
-- share only the feeling words they tapped. One row per install, surah and
-- word; no user id, no text. Clients may only insert; the cloud is read through
-- surah_feeling_cloud(), which stays empty until 10 distinct installs shared.

CREATE TABLE public.surah_feelings (
  install_id TEXT NOT NULL CHECK (char_length(install_id) BETWEEN 1 AND 64),
  surah SMALLINT NOT NULL CHECK (surah BETWEEN 1 AND 114),
  feeling TEXT NOT NULL CHECK (feeling IN (
    'Peaceful', 'Hopeful', 'Grateful', 'Moved', 'Reassured', 'Humbled',
    'Convicted', 'Uneasy', 'Afraid', 'Confused', 'Curious', 'Longing'
  )),
  day DATE NOT NULL DEFAULT current_date,
  PRIMARY KEY (install_id, surah, feeling)
);
CREATE INDEX surah_feelings_surah ON public.surah_feelings (surah);

ALTER TABLE public.surah_feelings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.surah_feelings FROM anon, authenticated, PUBLIC;
GRANT INSERT ON public.surah_feelings TO anon, authenticated;

CREATE POLICY surah_feelings_insert ON public.surah_feelings
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Readers per feeling for one surah, only once 10 distinct installs shared.
CREATE OR REPLACE FUNCTION public.surah_feeling_cloud(p_surah SMALLINT)
RETURNS TABLE (feeling TEXT, readers INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.feeling, count(DISTINCT f.install_id)::INT AS readers
  FROM public.surah_feelings f
  WHERE f.surah = p_surah
    AND (
      SELECT count(DISTINCT t.install_id)
      FROM public.surah_feelings t
      WHERE t.surah = p_surah
    ) >= 10
  GROUP BY f.feeling
  ORDER BY readers DESC, f.feeling;
$$;
REVOKE ALL ON FUNCTION public.surah_feeling_cloud(SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.surah_feeling_cloud(SMALLINT) TO anon, authenticated;
