-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE public.progression_type AS ENUM ('fixed', 'custom');
CREATE TYPE public.spread_type AS ENUM ('fixed', 'variable');
CREATE TYPE public.employment_status AS ENUM ('active', 'on_leave', 'terminated');
CREATE TYPE public.cycle_status AS ENUM ('draft', 'in_review', 'approved', 'closed');

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'light',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============== ORGANIZATIONS ==============
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  locale TEXT NOT NULL DEFAULT 'en',
  fiscal_year_start TEXT NOT NULL DEFAULT '01-01',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============== USER ROLES (per organization) ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helper to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  );
$$;

CREATE POLICY "View own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members view orgs" ON public.organizations FOR SELECT USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Users create orgs" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins update orgs" ON public.organizations FOR UPDATE USING (public.has_role(auth.uid(), id, 'admin'));
CREATE POLICY "Admins delete orgs" ON public.organizations FOR DELETE USING (public.has_role(auth.uid(), id, 'admin'));

-- ============== SALARY STRUCTURES ==============
CREATE TABLE public.salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  country TEXT,
  grade_count INT NOT NULL DEFAULT 10,
  starting_midpoint NUMERIC(14,2) NOT NULL DEFAULT 30000,
  progression_type public.progression_type NOT NULL DEFAULT 'fixed',
  default_progression_percent NUMERIC(6,3) NOT NULL DEFAULT 12,
  spread_type public.spread_type NOT NULL DEFAULT 'fixed',
  default_spread_percent NUMERIC(6,3) NOT NULL DEFAULT 40,
  rounding_rule INT NOT NULL DEFAULT 100,
  notes TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw structures" ON public.salary_structures FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE public.salary_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE CASCADE,
  grade_code TEXT NOT NULL,
  grade_name TEXT,
  sequence INT NOT NULL,
  midpoint NUMERIC(14,2) NOT NULL,
  minimum NUMERIC(14,2) NOT NULL,
  maximum NUMERIC(14,2) NOT NULL,
  spread_percent NUMERIC(6,3) NOT NULL,
  progression_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw grades" ON public.salary_grades FOR ALL
  USING (EXISTS (SELECT 1 FROM public.salary_structures s WHERE s.id = salary_structure_id AND public.is_org_member(auth.uid(), s.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.salary_structures s WHERE s.id = salary_structure_id AND public.is_org_member(auth.uid(), s.organization_id)));

-- ============== EMPLOYEES ==============
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT,
  department TEXT,
  job_title TEXT,
  location TEXT,
  hire_date DATE,
  employment_status public.employment_status NOT NULL DEFAULT 'active',
  grade_id UUID REFERENCES public.salary_grades(id) ON DELETE SET NULL,
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  salary_structure_id UUID REFERENCES public.salary_structures(id) ON DELETE SET NULL,
  target_bonus_percent NUMERIC(6,3) NOT NULL DEFAULT 10,
  performance_rating TEXT,
  manager_name TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw employees" ON public.employees FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- ============== BONUS ==============
CREATE TABLE public.bonus_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INT NOT NULL,
  default_target_bonus_percent NUMERIC(6,3) NOT NULL DEFAULT 10,
  business_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1,
  status public.cycle_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bonus_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw bonus_cycles" ON public.bonus_cycles FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE public.bonus_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_cycle_id UUID NOT NULL REFERENCES public.bonus_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(14,2) NOT NULL,
  target_bonus_percent NUMERIC(6,3) NOT NULL,
  performance_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1,
  business_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1,
  individual_modifier NUMERIC(6,3) NOT NULL DEFAULT 1,
  proration_factor NUMERIC(6,3) NOT NULL DEFAULT 1,
  calculated_bonus NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bonus_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw bonus_results" ON public.bonus_results FOR ALL
  USING (EXISTS (SELECT 1 FROM public.bonus_cycles c WHERE c.id = bonus_cycle_id AND public.is_org_member(auth.uid(), c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bonus_cycles c WHERE c.id = bonus_cycle_id AND public.is_org_member(auth.uid(), c.organization_id)));

-- ============== MERIT ==============
CREATE TABLE public.merit_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_budget_percent NUMERIC(6,3) NOT NULL DEFAULT 4,
  status public.cycle_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merit_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw merit_cycles" ON public.merit_cycles FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE public.merit_matrix_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merit_cycle_id UUID NOT NULL REFERENCES public.merit_cycles(id) ON DELETE CASCADE,
  performance_rating TEXT NOT NULL,
  compa_ratio_band TEXT NOT NULL,
  recommended_increase_percent NUMERIC(6,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merit_matrix_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw merit_rules" ON public.merit_matrix_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.merit_cycles c WHERE c.id = merit_cycle_id AND public.is_org_member(auth.uid(), c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.merit_cycles c WHERE c.id = merit_cycle_id AND public.is_org_member(auth.uid(), c.organization_id)));

CREATE TABLE public.merit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merit_cycle_id UUID NOT NULL REFERENCES public.merit_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  current_salary NUMERIC(14,2) NOT NULL,
  recommended_increase_percent NUMERIC(6,3) NOT NULL,
  increase_amount NUMERIC(14,2) NOT NULL,
  new_salary NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merit_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw merit_results" ON public.merit_results FOR ALL
  USING (EXISTS (SELECT 1 FROM public.merit_cycles c WHERE c.id = merit_cycle_id AND public.is_org_member(auth.uid(), c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.merit_cycles c WHERE c.id = merit_cycle_id AND public.is_org_member(auth.uid(), c.organization_id)));

-- ============== ALLOWANCES ==============
CREATE TABLE public.allowance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT,
  housing_percent NUMERIC(6,3) NOT NULL DEFAULT 25,
  transport_percent NUMERIC(6,3) NOT NULL DEFAULT 10,
  mobile_amount NUMERIC(14,2) NOT NULL DEFAULT 50,
  education_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  shift_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  hardship_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  custom_rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.allowance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw allowance_policies" ON public.allowance_policies FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE public.employee_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  allowance_policy_id UUID REFERENCES public.allowance_policies(id) ON DELETE SET NULL,
  housing_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  transport_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  mobile_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  education_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  shift_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  hardship_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  custom_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_allowance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_allowances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw employee_allowances" ON public.employee_allowances FOR ALL
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.is_org_member(auth.uid(), e.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.is_org_member(auth.uid(), e.organization_id)));

-- ============== SNAPSHOTS ==============
CREATE TABLE public.compensation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(14,2) NOT NULL,
  compa_ratio NUMERIC(6,3),
  range_penetration NUMERIC(6,3),
  annual_bonus_estimate NUMERIC(14,2),
  annual_allowances NUMERIC(14,2),
  total_cash_compensation NUMERIC(14,2),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compensation_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members rw snapshots" ON public.compensation_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.is_org_member(auth.uid(), e.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND public.is_org_member(auth.uid(), e.organization_id)));

-- ============== AUTO-PROVISIONING ON SIGNUP ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  INSERT INTO public.organizations (name, default_currency, locale, created_by)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization'), 'USD', 'en', NEW.id)
  RETURNING id INTO new_org_id;

  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();