CREATE POLICY "Platform admins view all profiles"
ON public.profiles FOR SELECT
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins view all user roles"
ON public.user_roles FOR SELECT
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins view all organizations"
ON public.organizations FOR SELECT
USING (public.is_platform_admin(auth.uid()));