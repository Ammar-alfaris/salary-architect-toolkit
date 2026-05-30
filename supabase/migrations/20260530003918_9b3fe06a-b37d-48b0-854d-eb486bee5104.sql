UPDATE public.plans SET paddle_monthly_price_id = 'starter_monthly', paddle_annual_price_id = 'starter_annual' WHERE lower(name) = 'starter';
UPDATE public.plans SET paddle_monthly_price_id = 'growth_monthly', paddle_annual_price_id = 'growth_annual' WHERE lower(name) = 'growth';
UPDATE public.plans SET paddle_monthly_price_id = 'professional_monthly', paddle_annual_price_id = 'professional_annual' WHERE lower(name) = 'professional';
UPDATE public.plans SET paddle_monthly_price_id = 'enterprise_monthly', paddle_annual_price_id = 'enterprise_annual' WHERE lower(name) = 'enterprise';