
-- 1) Pending invitations table
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'analyst',
  invited_by UUID,
  invited_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (organization_id, email)
);

ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view invitations"
ON public.pending_invitations FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins create invitations"
ON public.pending_invitations FOR INSERT
WITH CHECK (
  public.is_org_member(auth.uid(), organization_id)
  AND public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  AND auth.uid() = invited_by
);

CREATE POLICY "Admins delete invitations"
ON public.pending_invitations FOR DELETE
USING (public.has_role(auth.uid(), organization_id, 'admin'::app_role));

-- 2) Allow admins to manage user_roles inside their organization
CREATE POLICY "Admins update org roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins delete org roles"
ON public.user_roles FOR DELETE
USING (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  AND user_id <> auth.uid()
);

CREATE POLICY "Admins add org roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), organization_id, 'admin'::app_role)
);

-- 3) Update handle_new_user to honor pending invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  invite RECORD;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  -- Look for a pending invitation matching this email
  SELECT * INTO invite
  FROM public.pending_invitations
  WHERE lower(email) = lower(NEW.email)
    AND accepted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF invite.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (NEW.id, invite.organization_id, invite.role);

    UPDATE public.pending_invitations
    SET accepted_at = now()
    WHERE id = invite.id;
  ELSE
    INSERT INTO public.organizations (name, default_currency, locale, created_by)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization'), 'USD', 'en', NEW.id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (NEW.id, new_org_id, 'admin');
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) Helper view for team members listing (RLS still applies on user_roles + profiles)
-- Skipping a SECURITY DEFINER function to keep things simple; client-side join used instead.
