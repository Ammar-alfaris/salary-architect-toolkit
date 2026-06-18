
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending','paid','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'SAR',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.order_status NOT NULL DEFAULT 'pending',
  paylink_transaction_no TEXT,
  paylink_invoice_id TEXT,
  paylink_payment_url TEXT,
  paid_amount NUMERIC(12,2),
  paid_at TIMESTAMPTZ,
  raw_create_response JSONB,
  raw_verify_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_id_idx ON public.orders(user_id);
CREATE INDEX orders_paylink_tx_idx ON public.orders(paylink_transaction_no);

GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users create own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policies for authenticated -> only service_role can mutate status.

CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
