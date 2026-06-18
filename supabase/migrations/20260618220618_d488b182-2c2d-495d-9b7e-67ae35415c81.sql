
-- Trial lifecycle support on subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS restricted_at timestamptz,
  ADD COLUMN IF NOT EXISTS dormant_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_trial_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_trial_email_stage text;

-- Helper: compute the *effective* lifecycle status of an org based on time
-- Possible returns: 'none','trial','trial_ending','grace','restricted','dormant','active','canceled'
CREATE OR REPLACE FUNCTION public.org_lifecycle_status(_org uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  now_ts timestamptz := now();
BEGIN
  SELECT * INTO s
  FROM public.subscriptions
  WHERE organization_id = _org
  ORDER BY created_at DESC
  LIMIT 1;

  IF s IS NULL THEN
    RETURN 'none';
  END IF;

  -- Paid / explicit states take precedence
  IF s.status = 'active' THEN RETURN 'active'; END IF;
  IF s.status = 'canceled' THEN RETURN 'canceled'; END IF;

  -- Trial-derived states
  IF s.trial_end_at IS NULL THEN
    RETURN COALESCE(s.status, 'trial');
  END IF;

  IF now_ts < s.trial_end_at - interval '3 days' THEN
    RETURN 'trial';
  ELSIF now_ts < s.trial_end_at THEN
    RETURN 'trial_ending';
  ELSIF now_ts < s.trial_end_at + interval '7 days' THEN
    RETURN 'grace';
  ELSIF now_ts < s.trial_end_at + interval '30 days' THEN
    RETURN 'restricted';
  ELSE
    RETURN 'dormant';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.org_lifecycle_status(uuid) TO authenticated, service_role;

-- Helper: can the org write data?
CREATE OR REPLACE FUNCTION public.org_can_write(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.org_lifecycle_status(_org) IN ('trial','trial_ending','active');
$$;

GRANT EXECUTE ON FUNCTION public.org_can_write(uuid) TO authenticated, service_role;
