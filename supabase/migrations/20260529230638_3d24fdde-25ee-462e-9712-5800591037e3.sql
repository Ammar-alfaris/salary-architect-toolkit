
-- Add Paddle integration columns to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS paddle_monthly_price_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_annual_price_id TEXT,
  ADD COLUMN IF NOT EXISTS support_tier TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS onboarding_type TEXT NOT NULL DEFAULT 'self_serve';

ALTER TABLE public.plans
  ADD CONSTRAINT plans_support_tier_chk CHECK (support_tier IN ('email','priority','dedicated')),
  ADD CONSTRAINT plans_onboarding_type_chk CHECK (onboarding_type IN ('self_serve','guided','custom'));

-- Unify features across all plans (same features everywhere; differentiation via users/employees/support/onboarding)
UPDATE public.plans SET features = '{
  "salary_structures": true,
  "matrix": true,
  "bonus": true,
  "merit": true,
  "allowances": true,
  "registry": true,
  "approvals": true,
  "reports": true,
  "analytics": true,
  "ar_support": true,
  "audit_log": true,
  "multi_admin": true
}'::jsonb;

-- Set per-plan differentiation
UPDATE public.plans SET support_tier='email',     onboarding_type='self_serve' WHERE slug='starter';
UPDATE public.plans SET support_tier='email',     onboarding_type='guided'     WHERE slug='growth';
UPDATE public.plans SET support_tier='priority',  onboarding_type='guided',    is_recommended=true WHERE slug='professional';
UPDATE public.plans SET support_tier='dedicated', onboarding_type='custom'     WHERE slug='enterprise';

UPDATE public.plans SET is_recommended=false WHERE slug<>'professional';

-- Add Paddle integration columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_id TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_id ON public.subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);

-- Allow service_role full access for webhook handler
DROP POLICY IF EXISTS "Service role manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.plans TO service_role;
