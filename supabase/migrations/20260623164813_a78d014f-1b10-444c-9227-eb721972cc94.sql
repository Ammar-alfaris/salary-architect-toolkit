
CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.admin_list_cron_jobs()
RETURNS TABLE (jobid bigint, jobname text, schedule text, active boolean, command text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT j.jobid, j.jobname, j.schedule, j.active, j.command
  FROM cron.job j
  WHERE public.has_platform_role(auth.uid())
  ORDER BY j.jobname;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_cron_runs(_limit int DEFAULT 50)
RETURNS TABLE (jobid bigint, jobname text, runid bigint, status text, return_message text, start_time timestamptz, end_time timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT r.jobid, j.jobname, r.runid, r.status, r.return_message, r.start_time, r.end_time
  FROM cron.job_run_details r
  LEFT JOIN cron.job j ON j.jobid = r.jobid
  WHERE public.has_platform_role(auth.uid())
  ORDER BY r.start_time DESC
  LIMIT GREATEST(LEAST(coalesce(_limit, 50), 500), 1);
$$;

REVOKE ALL ON FUNCTION public.has_platform_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_cron_jobs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_cron_runs(int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_platform_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_cron_runs(int) TO authenticated;
