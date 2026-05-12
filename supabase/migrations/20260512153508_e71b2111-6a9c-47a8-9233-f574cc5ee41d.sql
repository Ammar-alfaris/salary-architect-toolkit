
-- Critical: drop privilege escalation policy
DROP POLICY IF EXISTS "Insert own roles" ON public.user_roles;

-- Restrict pending_invitations SELECT to admins or the invited email
DROP POLICY IF EXISTS "Members view invitations" ON public.pending_invitations;
CREATE POLICY "Admins or invitee view invitations"
ON public.pending_invitations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), organization_id, 'admin'::app_role)
  OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

-- Restrict approval_chain_steps SELECT to admins/managers (hide approver emails from analysts/viewers)
DROP POLICY IF EXISTS "Members view steps" ON public.approval_chain_steps;
CREATE POLICY "Admins/managers view steps"
ON public.approval_chain_steps
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.approval_chains c
    WHERE c.id = approval_chain_steps.chain_id
      AND (
        has_role(auth.uid(), c.organization_id, 'admin'::app_role)
        OR has_role(auth.uid(), c.organization_id, 'manager'::app_role)
      )
  )
);

-- Require authentication to read announcements
DROP POLICY IF EXISTS "All authed view active announcements" ON public.announcements;
CREATE POLICY "Authed view active announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (is_active = true OR is_platform_admin(auth.uid()));

-- Set search_path on functions missing it
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- Revoke EXECUTE on internal SECURITY DEFINER queue helpers from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
