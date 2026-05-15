
-- Extend employees with richer profile fields
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS cost_center text,
  ADD COLUMN IF NOT EXISTS business_unit text,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS salary_effective_date date;

CREATE INDEX IF NOT EXISTS idx_employees_org_code ON public.employees(organization_id, employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees(manager_id);

-- Add food allowance amount to standard allowances row
ALTER TABLE public.employee_allowances
  ADD COLUMN IF NOT EXISTS food_amount numeric(14,2) NOT NULL DEFAULT 0;

-- Custom allowances per employee (free-form name/amount pairs)
CREATE TABLE IF NOT EXISTS public.employee_custom_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  annual_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emp_custom_allow_emp ON public.employee_custom_allowances(employee_id);
ALTER TABLE public.employee_custom_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view employee_custom_allowances"
  ON public.employee_custom_allowances FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e
    WHERE e.id = employee_custom_allowances.employee_id
      AND public.is_org_member(auth.uid(), e.organization_id)));

CREATE POLICY "Editors manage employee_custom_allowances"
  ON public.employee_custom_allowances FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e
    WHERE e.id = employee_custom_allowances.employee_id
      AND (public.has_role(auth.uid(), e.organization_id, 'admin'::app_role)
        OR public.has_role(auth.uid(), e.organization_id, 'manager'::app_role)
        OR public.has_role(auth.uid(), e.organization_id, 'analyst'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e
    WHERE e.id = employee_custom_allowances.employee_id
      AND (public.has_role(auth.uid(), e.organization_id, 'admin'::app_role)
        OR public.has_role(auth.uid(), e.organization_id, 'manager'::app_role)
        OR public.has_role(auth.uid(), e.organization_id, 'analyst'::app_role))));

-- Org-level custom field definitions
CREATE TABLE IF NOT EXISTS public.org_custom_field_defs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);
ALTER TABLE public.org_custom_field_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org_custom_field_defs"
  ON public.org_custom_field_defs FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins manage org_custom_field_defs"
  ON public.org_custom_field_defs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), organization_id, 'manager'::app_role));

-- Per-employee custom field values
CREATE TABLE IF NOT EXISTS public.employee_custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  field_def_id uuid NOT NULL REFERENCES public.org_custom_field_defs(id) ON DELETE CASCADE,
  value_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, field_def_id)
);
CREATE INDEX IF NOT EXISTS idx_emp_cfv_emp ON public.employee_custom_field_values(employee_id);
ALTER TABLE public.employee_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view employee_custom_field_values"
  ON public.employee_custom_field_values FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e
    WHERE e.id = employee_custom_field_values.employee_id
      AND public.is_org_member(auth.uid(), e.organization_id)));

CREATE POLICY "Editors manage employee_custom_field_values"
  ON public.employee_custom_field_values FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e
    WHERE e.id = employee_custom_field_values.employee_id
      AND (public.has_role(auth.uid(), e.organization_id, 'admin'::app_role)
        OR public.has_role(auth.uid(), e.organization_id, 'manager'::app_role)
        OR public.has_role(auth.uid(), e.organization_id, 'analyst'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e
    WHERE e.id = employee_custom_field_values.employee_id
      AND (public.has_role(auth.uid(), e.organization_id, 'admin'::app_role)
        OR public.has_role(auth.uid(), e.organization_id, 'manager'::app_role)
        OR public.has_role(auth.uid(), e.organization_id, 'analyst'::app_role))));
