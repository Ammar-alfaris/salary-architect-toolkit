
-- 1) approval_step_decisions: restrict INSERT to admin/manager of the org
DROP POLICY IF EXISTS "Members insert decisions" ON public.approval_step_decisions;
CREATE POLICY "Admins or managers insert decisions"
ON public.approval_step_decisions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.approval_requests r
    WHERE r.id = request_id
      AND public.is_org_member(auth.uid(), r.organization_id)
      AND (
        public.has_role(auth.uid(), r.organization_id, 'admin'::app_role)
        OR public.has_role(auth.uid(), r.organization_id, 'manager'::app_role)
      )
  )
);

-- Helper: split ALL policies into SELECT (members) + write (admin/manager/analyst)

-- 2) salary_structures
DROP POLICY IF EXISTS "Members rw structures" ON public.salary_structures;
CREATE POLICY "Members view structures" ON public.salary_structures
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors manage structures" ON public.salary_structures
FOR ALL TO authenticated
USING (
  public.is_org_member(auth.uid(), organization_id) AND (
    public.has_role(auth.uid(), organization_id, 'admin'::app_role)
    OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
    OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
  )
)
WITH CHECK (
  public.is_org_member(auth.uid(), organization_id) AND (
    public.has_role(auth.uid(), organization_id, 'admin'::app_role)
    OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
    OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
  )
);

-- 3) salary_grades (scoped via parent structure)
DROP POLICY IF EXISTS "Members rw grades" ON public.salary_grades;
CREATE POLICY "Members view grades" ON public.salary_grades
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.salary_structures s
  WHERE s.id = salary_grades.salary_structure_id
    AND public.is_org_member(auth.uid(), s.organization_id)
));
CREATE POLICY "Editors manage grades" ON public.salary_grades
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.salary_structures s
  WHERE s.id = salary_grades.salary_structure_id
    AND (
      public.has_role(auth.uid(), s.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), s.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), s.organization_id, 'analyst'::app_role)
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.salary_structures s
  WHERE s.id = salary_grades.salary_structure_id
    AND (
      public.has_role(auth.uid(), s.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), s.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), s.organization_id, 'analyst'::app_role)
    )
));

-- 4) employees
DROP POLICY IF EXISTS "Members rw employees" ON public.employees;
CREATE POLICY "Members view employees" ON public.employees
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors manage employees" ON public.employees
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
);

-- 5) bonus_cycles
DROP POLICY IF EXISTS "Members rw bonus_cycles" ON public.bonus_cycles;
CREATE POLICY "Members view bonus_cycles" ON public.bonus_cycles
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors manage bonus_cycles" ON public.bonus_cycles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
);

-- 6) bonus_results
DROP POLICY IF EXISTS "Members rw bonus_results" ON public.bonus_results;
CREATE POLICY "Members view bonus_results" ON public.bonus_results
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bonus_cycles c
  WHERE c.id = bonus_results.bonus_cycle_id
    AND public.is_org_member(auth.uid(), c.organization_id)
));
CREATE POLICY "Editors manage bonus_results" ON public.bonus_results
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bonus_cycles c
  WHERE c.id = bonus_results.bonus_cycle_id
    AND (
      public.has_role(auth.uid(), c.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'analyst'::app_role)
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bonus_cycles c
  WHERE c.id = bonus_results.bonus_cycle_id
    AND (
      public.has_role(auth.uid(), c.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'analyst'::app_role)
    )
));

-- 7) merit_cycles
DROP POLICY IF EXISTS "Members rw merit_cycles" ON public.merit_cycles;
CREATE POLICY "Members view merit_cycles" ON public.merit_cycles
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors manage merit_cycles" ON public.merit_cycles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
);

-- 8) merit_results
DROP POLICY IF EXISTS "Members rw merit_results" ON public.merit_results;
CREATE POLICY "Members view merit_results" ON public.merit_results
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.merit_cycles c
  WHERE c.id = merit_results.merit_cycle_id
    AND public.is_org_member(auth.uid(), c.organization_id)
));
CREATE POLICY "Editors manage merit_results" ON public.merit_results
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.merit_cycles c
  WHERE c.id = merit_results.merit_cycle_id
    AND (
      public.has_role(auth.uid(), c.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'analyst'::app_role)
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.merit_cycles c
  WHERE c.id = merit_results.merit_cycle_id
    AND (
      public.has_role(auth.uid(), c.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'analyst'::app_role)
    )
));

-- 9) employee_allowances
DROP POLICY IF EXISTS "Members rw employee_allowances" ON public.employee_allowances;
CREATE POLICY "Members view employee_allowances" ON public.employee_allowances
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_allowances.employee_id
    AND public.is_org_member(auth.uid(), e.organization_id)
));
CREATE POLICY "Editors manage employee_allowances" ON public.employee_allowances
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_allowances.employee_id
    AND (
      public.has_role(auth.uid(), e.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), e.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), e.organization_id, 'analyst'::app_role)
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = employee_allowances.employee_id
    AND (
      public.has_role(auth.uid(), e.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), e.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), e.organization_id, 'analyst'::app_role)
    )
));

-- 10) compensation_snapshots
DROP POLICY IF EXISTS "Members rw snapshots" ON public.compensation_snapshots;
CREATE POLICY "Members view snapshots" ON public.compensation_snapshots
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = compensation_snapshots.employee_id
    AND public.is_org_member(auth.uid(), e.organization_id)
));
CREATE POLICY "Editors manage snapshots" ON public.compensation_snapshots
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = compensation_snapshots.employee_id
    AND (
      public.has_role(auth.uid(), e.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), e.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), e.organization_id, 'analyst'::app_role)
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = compensation_snapshots.employee_id
    AND (
      public.has_role(auth.uid(), e.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), e.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), e.organization_id, 'analyst'::app_role)
    )
));

-- 11) allowance_policies
DROP POLICY IF EXISTS "Members rw allowance_policies" ON public.allowance_policies;
CREATE POLICY "Members view allowance_policies" ON public.allowance_policies
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Editors manage allowance_policies" ON public.allowance_policies
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'manager'::app_role)
  OR public.has_role(auth.uid(), organization_id, 'analyst'::app_role)
);
