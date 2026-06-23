
-- Dunning state on subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS dunning_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dunning_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_recovered_at timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dunning_last_error text,
  ADD COLUMN IF NOT EXISTS dunning_last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_dunning_due
  ON public.subscriptions (dunning_status, dunning_next_retry_at)
  WHERE dunning_status = 'past_due';

CREATE INDEX IF NOT EXISTS idx_subscriptions_due_renewal
  ON public.subscriptions (auto_renew, renewal_at)
  WHERE status = 'active' AND auto_renew = true AND cancel_at_period_end = false;

-- Audit log expansion: IP + user-agent (loosen types since action/entity are already text)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Allow service_role to insert system-generated audit entries (dunning, payments, security)
-- without needing actor_id = auth.uid()
DROP POLICY IF EXISTS "Service role inserts system audit logs" ON public.audit_logs;
CREATE POLICY "Service role inserts system audit logs"
  ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
