-- Public daily-verse API: self-serve keys issued by domain verification.
--   api_keys              one live key per domain (sha256 hash only, never the key)
--   api_key_verifications pending proof tokens, deleted once a key is issued
--   api_usage             per-bucket daily counters (verse requests, verify attempts)
-- No policies: RLS is on and every grant is revoked, so only the service role
-- (edge functions) can touch these tables and functions.

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  site_name TEXT NOT NULL,
  contact_email TEXT,
  terms_version TEXT NOT NULL,
  accepted_terms_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- At most one live key per domain; revoked keys are kept for history.
CREATE UNIQUE INDEX api_keys_live_domain_idx
  ON public.api_keys (domain) WHERE revoked_at IS NULL;

CREATE TABLE public.api_key_verifications (
  domain TEXT NOT NULL,
  token TEXT NOT NULL,
  site_name TEXT NOT NULL,
  contact_email TEXT,
  terms_version TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (domain, token)
);

CREATE TABLE public.api_usage (
  bucket TEXT NOT NULL,
  day DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, day)
);

-- Atomic: revoke the domain's live key, insert the new one, drop pending proofs.
CREATE FUNCTION public.issue_api_key(
  p_domain TEXT,
  p_key_hash TEXT,
  p_site_name TEXT,
  p_contact_email TEXT,
  p_terms_version TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.api_keys
    SET revoked_at = now()
    WHERE domain = p_domain AND revoked_at IS NULL;

  INSERT INTO public.api_keys
    (key_hash, domain, site_name, contact_email, terms_version)
  VALUES
    (p_key_hash, p_domain, p_site_name, p_contact_email, p_terms_version);

  DELETE FROM public.api_key_verifications WHERE domain = p_domain;
END;
$$;

-- Increments and returns the new count; callers compare it to their limit.
CREATE FUNCTION public.api_hit(p_bucket TEXT, p_day DATE) RETURNS INT
LANGUAGE sql
AS $$
  INSERT INTO public.api_usage (bucket, day, count)
  VALUES (p_bucket, p_day, 1)
  ON CONFLICT (bucket, day)
  DO UPDATE SET count = public.api_usage.count + 1
  RETURNING count;
$$;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.api_keys FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.api_key_verifications FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.api_usage FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.issue_api_key(TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.api_hit(TEXT, DATE)
  FROM anon, authenticated, PUBLIC;
