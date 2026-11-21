-- Surah history rows are keyed by start time. now() is fixed for a whole
-- transaction, so two surah changes in one transaction would collide; the
-- wall clock never repeats.
CREATE OR REPLACE FUNCTION public.circles_track_surah()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.circle_surah_history (circle_code, surah, started_at)
    VALUES (NEW.code, NEW.surah, clock_timestamp());
  ELSIF NEW.surah IS DISTINCT FROM OLD.surah THEN
    UPDATE public.circle_surah_history
      SET ended_at = clock_timestamp()
      WHERE circle_code = NEW.code AND ended_at IS NULL;
    INSERT INTO public.circle_surah_history (circle_code, surah, started_at)
    VALUES (NEW.code, NEW.surah, clock_timestamp());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.circles_track_surah() FROM PUBLIC;
