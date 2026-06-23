
-- Orders: restrict org-wide view to admins
DROP POLICY IF EXISTS "Org members view org orders" ON public.orders;
CREATE POLICY "Org admins view org orders" ON public.orders
  FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.has_role(auth.uid(), organization_id, 'admin'::app_role));

-- Payment methods: restrict to admins
DROP POLICY IF EXISTS "Org members view payment methods" ON public.payment_methods;
CREATE POLICY "Org admins view payment methods" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), organization_id, 'admin'::app_role));

-- Pending invitations: require non-empty JWT email
DROP POLICY IF EXISTS "Admins or invitee view invitations" ON public.pending_invitations;
CREATE POLICY "Admins or invitee view invitations" ON public.pending_invitations
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), organization_id, 'admin'::app_role)
    OR (
      COALESCE((auth.jwt() ->> 'email'), '') <> ''
      AND lower(email) = lower((auth.jwt() ->> 'email'))
    )
  );

-- Approval chain steps: scope admin-manage policy to authenticated
DROP POLICY IF EXISTS "Admins manage steps" ON public.approval_chain_steps;
CREATE POLICY "Admins manage steps" ON public.approval_chain_steps
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.approval_chains c
    WHERE c.id = approval_chain_steps.chain_id
      AND public.has_role(auth.uid(), c.organization_id, 'admin'::app_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.approval_chains c
    WHERE c.id = approval_chain_steps.chain_id
      AND public.has_role(auth.uid(), c.organization_id, 'admin'::app_role)
  ));

-- Admins delete/create invitations: scope to authenticated
DROP POLICY IF EXISTS "Admins delete invitations" ON public.pending_invitations;
CREATE POLICY "Admins delete invitations" ON public.pending_invitations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), organization_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins create invitations" ON public.pending_invitations;
CREATE POLICY "Admins create invitations" ON public.pending_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_member(auth.uid(), organization_id)
    AND public.has_role(auth.uid(), organization_id, 'admin'::app_role)
    AND auth.uid() = invited_by
  );
