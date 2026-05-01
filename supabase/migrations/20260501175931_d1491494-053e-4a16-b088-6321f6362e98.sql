-- 1) Add job_family to employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS job_family text;

CREATE INDEX IF NOT EXISTS idx_employees_job_family ON public.employees(job_family);

-- 2) Add approval_settings to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS approval_settings jsonb NOT NULL DEFAULT jsonb_build_object(
    'lock_on_approval', true,
    'allow_admin_unlock', true,
    'require_two_step', false
  );

-- 3) equity_review_flags
CREATE TABLE IF NOT EXISTS public.equity_review_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  job_family text,
  grade_id uuid,
  flag_type text NOT NULL, -- 'pay_gap' | 'outlier_high' | 'outlier_low' | 'compression' | 'inversion'
  variance_percent numeric NOT NULL DEFAULT 0,
  peer_median numeric,
  status text NOT NULL DEFAULT 'open', -- 'open' | 'acknowledged' | 'resolved' | 'dismissed'
  notes text,
  created_by uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equity_flags_org ON public.equity_review_flags(organization_id);
CREATE INDEX IF NOT EXISTS idx_equity_flags_emp ON public.equity_review_flags(employee_id);
CREATE INDEX IF NOT EXISTS idx_equity_flags_status ON public.equity_review_flags(status);

ALTER TABLE public.equity_review_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view equity flags"
  ON public.equity_review_flags FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Analysts insert equity flags"
  ON public.equity_review_flags FOR INSERT
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'admin'::app_role)
    )
  );

CREATE POLICY "Analysts update equity flags"
  ON public.equity_review_flags FOR UPDATE
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
    )
  );

CREATE POLICY "Admins delete equity flags"
  ON public.equity_review_flags FOR DELETE
  USING (public.has_role(auth.uid(), organization_id, 'admin'::app_role));

-- 4) approval_requests
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  entity_type text NOT NULL, -- 'merit_cycle' | 'bonus_cycle' | 'salary_structure'
  entity_id uuid NOT NULL,
  entity_label text,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  requested_by uuid NOT NULL,
  requested_by_email text,
  reviewed_by uuid,
  reviewed_by_email text,
  reviewed_at timestamptz,
  reason text,
  decision_note text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_org ON public.approval_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON public.approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view approval requests"
  ON public.approval_requests FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Analysts create approval requests"
  ON public.approval_requests FOR INSERT
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND auth.uid() = requested_by
    AND (
      public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
    )
  );

CREATE POLICY "Approvers update approval requests"
  ON public.approval_requests FOR UPDATE
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
    )
  );

CREATE POLICY "Admins delete approval requests"
  ON public.approval_requests FOR DELETE
  USING (public.has_role(auth.uid(), organization_id, 'admin'::app_role));

-- 5) version_history
CREATE TABLE IF NOT EXISTS public.version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  entity_type text NOT NULL, -- 'salary_structure' | 'merit_cycle' | 'bonus_cycle'
  entity_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  label text,
  snapshot jsonb NOT NULL,
  change_summary text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_version_history_org ON public.version_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_version_history_entity ON public.version_history(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_version_history_entity_ver
  ON public.version_history(entity_type, entity_id, version_number);

ALTER TABLE public.version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view version history"
  ON public.version_history FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Analysts insert version history"
  ON public.version_history FOR INSERT
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
    )
  );

CREATE POLICY "Admins delete version history"
  ON public.version_history FOR DELETE
  USING (public.has_role(auth.uid(), organization_id, 'admin'::app_role));