CREATE TABLE public.fx_rates (
  base_currency text NOT NULL DEFAULT 'SAR',
  quote_currency text NOT NULL,
  rate numeric(18,8) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base_currency, quote_currency)
);

GRANT SELECT ON public.fx_rates TO anon, authenticated;
GRANT ALL ON public.fx_rates TO service_role;

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read fx" ON public.fx_rates FOR SELECT USING (true);