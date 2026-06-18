DROP POLICY IF EXISTS "Authed view active announcements" ON public.announcements;

CREATE POLICY "Authed view active announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR (
      is_active = true
      AND (
        audience = 'all'
        OR coalesce(array_length(target_org_ids, 1), 0) = 0
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.organization_id = ANY (announcements.target_org_ids)
        )
      )
    )
  );