-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_label TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
  public.is_org_member(auth.uid(), organization_id)
  AND auth.uid() = actor_id
);

-- Helper to get the user's effective role in an org
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _org_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id AND organization_id = _org_id
  ORDER BY CASE role::text
    WHEN 'admin' THEN 1
    WHEN 'analyst' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'viewer' THEN 4
    ELSE 5
  END
  LIMIT 1;
$$;