DO $$
DECLARE
  service_role_secret text;
  stable_dev_url text := 'https://project--2acbe2f2-b7be-4735-8fa4-d80fac74d23c-dev.lovable.app/lovable/email/queue/process';
  existing_job_id bigint;
BEGIN
  SELECT decrypted_secret
    INTO service_role_secret
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key';

  IF service_role_secret IS NULL THEN
    RAISE EXCEPTION 'Missing vault secret: email_queue_service_role_key';
  END IF;

  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'process-email-queue-stable-dev'
  LIMIT 1;

  IF existing_job_id IS NULL THEN
    PERFORM cron.schedule(
      'process-email-queue-stable-dev',
      '5 seconds',
      format($cmd$
        SELECT CASE
          WHEN (SELECT retry_after_until FROM public.email_send_state WHERE id = 1) > now()
            THEN NULL
          WHEN EXISTS (SELECT 1 FROM pgmq.q_auth_emails LIMIT 1)
            OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails LIMIT 1)
            THEN net.http_post(
              url := %L,
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || %L
              ),
              body := '{}'::jsonb
            )
          ELSE NULL
        END;
      $cmd$, stable_dev_url, service_role_secret)
    );
  END IF;
END $$;