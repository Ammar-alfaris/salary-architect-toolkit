
-- 1) Extend orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS invoice_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS vat_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paylink_card_token text,
  ADD COLUMN IF NOT EXISTS paylink_card_brand text,
  ADD COLUMN IF NOT EXISTS paylink_card_last4 text;

CREATE INDEX IF NOT EXISTS orders_org_idx ON public.orders(organization_id);
CREATE INDEX IF NOT EXISTS orders_invoice_idx ON public.orders(invoice_number);

-- Extra RLS: allow org members to view their org's orders
DROP POLICY IF EXISTS "Org members view org orders" ON public.orders;
CREATE POLICY "Org members view org orders" ON public.orders
  FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

-- 2) Saved payment methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'paylink',
  card_token text,
  brand text,
  last4 text,
  exp_month int,
  exp_year int,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view payment methods" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE TRIGGER payment_methods_touch_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS payment_methods_org_idx ON public.payment_methods(organization_id);

-- 3) Invoice number generator
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  next_n int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('invoice_seq_' || yr));
  SELECT COALESCE(MAX((regexp_replace(invoice_number, '^INV-\d{4}-', ''))::int), 0) + 1
    INTO next_n
    FROM public.orders
    WHERE invoice_number LIKE 'INV-' || yr || '-%';
  RETURN 'INV-' || yr || '-' || lpad(next_n::text, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO service_role;
