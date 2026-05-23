-- Salary history: immutable audit trail of base salary changes
CREATE TYPE public.salary_change_reason AS ENUM (
  'manual_edit', 'merit_cycle', 'bonus_adjustment', 'promotion', 'market_adjustment', 'correction', 'approval_applied', 'other'
);

CREATE TABLE public.salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_salary NUMERIC(14,2),
  new_salary NUMERIC(14,2) NOT NULL,
  change_amount NUMERIC(14,2) GENERATED ALWAYS AS (new_salary - COALESCE(previous_salary, 0)) STORED,
  change_percent NUMERIC(7,2),
  currency TEXT,
  effective_date DATE,
  reason public.salary_change_reason NOT NULL DEFAULT 'manual_edit',
  note TEXT,
  reference_type TEXT,           -- e.g. 'merit_cycle', 'approval_request'
  reference_id UUID,             -- pointer to source record
  changed_by UUID,
  changed_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_salary_history_employee ON public.salary_history(employee_id, created_at DESC);
CREATE INDEX idx_salary_history_org ON public.salary_history(organization_id, created_at DESC);
CREATE INDEX idx_salary_history_ref ON public.salary_history(reference_type, reference_id);

ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view salary history"
  ON public.salary_history FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins and managers can insert salary history"
  ON public.salary_history FOR INSERT
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
    )
  );

-- No UPDATE or DELETE policies = immutable audit trail.