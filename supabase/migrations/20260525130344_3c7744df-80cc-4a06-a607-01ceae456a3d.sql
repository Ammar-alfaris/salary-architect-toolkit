-- Performance: indexes for common filter/sort patterns
CREATE INDEX IF NOT EXISTS idx_employees_org_status
  ON public.employees(organization_id, employment_status) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_employees_org_department
  ON public.employees(organization_id, department);
CREATE INDEX IF NOT EXISTS idx_employees_org_grade
  ON public.employees(organization_id, grade_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_location
  ON public.employees(organization_id, location);

CREATE INDEX IF NOT EXISTS idx_employee_allowances_employee
  ON public.employee_allowances(employee_id);
CREATE INDEX IF NOT EXISTS idx_merit_results_employee
  ON public.merit_results(employee_id);
CREATE INDEX IF NOT EXISTS idx_merit_results_cycle
  ON public.merit_results(merit_cycle_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_org_created
  ON public.approval_requests(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester
  ON public.approval_requests(requested_by);
