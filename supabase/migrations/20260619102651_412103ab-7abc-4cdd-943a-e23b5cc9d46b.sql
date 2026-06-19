ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'test'
    CHECK (payment_mode IN ('test','live'));

CREATE OR REPLACE FUNCTION public.get_payment_mode()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT payment_mode FROM public.admin_settings LIMIT 1), 'test');
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_mode() TO anon, authenticated;