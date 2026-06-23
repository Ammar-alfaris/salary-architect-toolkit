
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_renewal_notice_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_scan
  ON public.subscriptions (auto_renew, renewal_at)
  WHERE status = 'active';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Replace any previous version of the job.
DO $$
DECLARE
  job_id bigint;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'lifecycle-notices-daily';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'lifecycle-notices-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://totalreward.app/api/public/cron/lifecycle-notices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94c2d0bXZkcmRoYWNwc29zd2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjA0MDMsImV4cCI6MjA5Mjk5NjQwM30.qoziKOGs8L2w_9vlGM3zyVCyje2KbjikZrvBb7zq8No'
    ),
    body := '{}'::jsonb
  );
  $$
);
