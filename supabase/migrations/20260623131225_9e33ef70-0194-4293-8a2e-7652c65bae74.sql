
-- Replace HTTP cron with pure SQL: lifecycle transitions
SELECT cron.unschedule('trial-lifecycle-daily');

SELECT cron.schedule(
  'trial-lifecycle-daily',
  '0 2 * * *',
  $$
  UPDATE public.subscriptions s
  SET
    status = CASE
      WHEN (now() - s.trial_end_at) < interval '-3 days' THEN 'trial'
      WHEN (now() - s.trial_end_at) < interval '0' THEN 'trial_ending'
      WHEN (now() - s.trial_end_at) < interval '7 days' THEN 'grace'
      WHEN (now() - s.trial_end_at) < interval '30 days' THEN 'restricted'
      ELSE 'dormant'
    END,
    grace_end_at = CASE
      WHEN (now() - s.trial_end_at) >= interval '0'
       AND (now() - s.trial_end_at) < interval '7 days'
       AND s.grace_end_at IS NULL
      THEN s.trial_end_at + interval '7 days'
      ELSE s.grace_end_at
    END,
    restricted_at = CASE
      WHEN (now() - s.trial_end_at) >= interval '7 days'
       AND (now() - s.trial_end_at) < interval '30 days'
       AND s.restricted_at IS NULL
      THEN now()
      ELSE s.restricted_at
    END,
    dormant_at = CASE
      WHEN (now() - s.trial_end_at) >= interval '30 days'
       AND s.dormant_at IS NULL
      THEN now()
      ELSE s.dormant_at
    END
  WHERE s.status IN ('trial','trial_ending','grace','restricted','dormant')
    AND s.trial_end_at IS NOT NULL;
  $$
);
