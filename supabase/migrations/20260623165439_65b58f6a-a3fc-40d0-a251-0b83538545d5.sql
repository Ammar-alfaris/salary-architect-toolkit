
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL DEFAULT 'error',
  source text NOT NULL DEFAULT 'client',
  fingerprint text,
  message text NOT NULL,
  stack text,
  url text,
  route text,
  user_agent text,
  ip_address inet,
  user_id uuid,
  organization_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.error_logs TO anon, authenticated;
GRANT SELECT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can report an error (including unauthenticated visitors).
CREATE POLICY "anyone can report errors"
  ON public.error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only platform admins can read them.
CREATE POLICY "platform admins read errors"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (public.has_platform_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_error_logs_occurred ON public.error_logs (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON public.error_logs (fingerprint, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source_level ON public.error_logs (source, level, occurred_at DESC);

-- Aggregation helper: top error groups in a time window.
CREATE OR REPLACE FUNCTION public.admin_error_groups(_since timestamptz DEFAULT (now() - interval '7 days'))
RETURNS TABLE (
  fingerprint text,
  message text,
  source text,
  level text,
  count bigint,
  last_seen timestamptz,
  first_seen timestamptz,
  affected_users bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(fingerprint, md5(message)) AS fingerprint,
    (array_agg(message ORDER BY occurred_at DESC))[1] AS message,
    (array_agg(source ORDER BY occurred_at DESC))[1] AS source,
    (array_agg(level ORDER BY occurred_at DESC))[1] AS level,
    count(*) AS count,
    max(occurred_at) AS last_seen,
    min(occurred_at) AS first_seen,
    count(DISTINCT user_id) AS affected_users
  FROM public.error_logs
  WHERE occurred_at >= _since
    AND public.has_platform_role(auth.uid())
  GROUP BY coalesce(fingerprint, md5(message))
  ORDER BY count DESC
  LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.admin_error_groups(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_error_groups(timestamptz) TO authenticated;
