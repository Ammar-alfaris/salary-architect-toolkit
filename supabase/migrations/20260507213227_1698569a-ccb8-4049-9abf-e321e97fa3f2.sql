-- Harden ticket_number generation against race / duplicates
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  next_n int;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    -- Advisory lock per year to serialize numbering
    PERFORM pg_advisory_xact_lock(hashtext('support_ticket_seq_' || yr));
    SELECT COALESCE(MAX((regexp_replace(ticket_number, '^TKT-\d{4}-', ''))::int), 0) + 1
      INTO next_n
      FROM public.support_tickets
      WHERE ticket_number LIKE 'TKT-' || yr || '-%';
    NEW.ticket_number := 'TKT-' || yr || '-' || lpad(next_n::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Email campaigns log (already exists per schema, ensure indexes)
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON public.email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);