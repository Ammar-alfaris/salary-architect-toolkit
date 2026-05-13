
ALTER TABLE public.bonus_cycles
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by_email text,
  ADD COLUMN IF NOT EXISTS final_payload jsonb,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

ALTER TABLE public.merit_cycles
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by_email text,
  ADD COLUMN IF NOT EXISTS final_payload jsonb,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;
