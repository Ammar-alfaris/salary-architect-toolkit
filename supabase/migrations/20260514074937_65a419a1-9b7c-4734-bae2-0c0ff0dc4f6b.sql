
-- 1. merit_matrix_rules: split read vs write
DROP POLICY IF EXISTS "Members rw merit_rules" ON public.merit_matrix_rules;

CREATE POLICY "Members view merit_rules"
ON public.merit_matrix_rules
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.merit_cycles c
  WHERE c.id = merit_matrix_rules.merit_cycle_id
    AND public.is_org_member(auth.uid(), c.organization_id)
));

CREATE POLICY "Editors manage merit_rules"
ON public.merit_matrix_rules
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.merit_cycles c
  WHERE c.id = merit_matrix_rules.merit_cycle_id
    AND (public.has_role(auth.uid(), c.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'analyst'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.merit_cycles c
  WHERE c.id = merit_matrix_rules.merit_cycle_id
    AND (public.has_role(auth.uid(), c.organization_id, 'admin'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'manager'::app_role)
      OR public.has_role(auth.uid(), c.organization_id, 'analyst'::app_role))
));

-- 2. support_tickets: require requester_email to match JWT email
DROP POLICY IF EXISTS "Users insert own tickets" ON public.support_tickets;
CREATE POLICY "Users insert own tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND COALESCE(auth.jwt() ->> 'email', '') <> ''
  AND lower(requester_email) = lower(auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
CREATE POLICY "Users view own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  AND COALESCE(auth.jwt() ->> 'email', '') <> ''
  AND lower(requester_email) = lower(auth.jwt() ->> 'email')
);

-- 3. ticket_messages: hide internal agent notes from end users
DROP POLICY IF EXISTS "Users view own ticket messages" ON public.ticket_messages;
CREATE POLICY "Users view own ticket messages"
ON public.ticket_messages
FOR SELECT
TO authenticated
USING (
  is_internal = false
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND t.created_by = auth.uid()
      AND COALESCE(auth.jwt() ->> 'email', '') <> ''
      AND lower(t.requester_email) = lower(auth.jwt() ->> 'email')
  )
);
