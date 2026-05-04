
-- Chains
CREATE TABLE public.approval_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  applies_to text[] NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view chains" ON public.approval_chains FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins manage chains" ON public.approval_chains FOR ALL USING (has_role(auth.uid(), organization_id, 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), organization_id, 'admin'::app_role));

-- Steps
CREATE TABLE public.approval_chain_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid NOT NULL REFERENCES public.approval_chains(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  name text,
  approver_user_id uuid,
  approver_email text,
  approver_label text,
  approver_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_chain_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view steps" ON public.approval_chain_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.approval_chains c WHERE c.id = chain_id AND is_org_member(auth.uid(), c.organization_id))
);
CREATE POLICY "Admins manage steps" ON public.approval_chain_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM public.approval_chains c WHERE c.id = chain_id AND has_role(auth.uid(), c.organization_id, 'admin'::app_role))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.approval_chains c WHERE c.id = chain_id AND has_role(auth.uid(), c.organization_id, 'admin'::app_role))
);

-- Decisions
CREATE TABLE public.approval_step_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  decided_by uuid,
  decided_by_email text,
  decision text NOT NULL,
  note text,
  edits jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_step_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view decisions" ON public.approval_step_decisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.approval_requests r WHERE r.id = request_id AND is_org_member(auth.uid(), r.organization_id))
);
CREATE POLICY "Members insert decisions" ON public.approval_step_decisions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.approval_requests r WHERE r.id = request_id AND is_org_member(auth.uid(), r.organization_id))
);

-- Extend approval_requests
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS chain_id uuid REFERENCES public.approval_chains(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_step int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposed_payload jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS final_payload jsonb,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS applied_by uuid;
