create or replace function public.share_org_with_user(_viewer_id uuid, _target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles viewer_roles
    join public.user_roles target_roles
      on target_roles.organization_id = viewer_roles.organization_id
    where viewer_roles.user_id = _viewer_id
      and target_roles.user_id = _target_user_id
  );
$$;

drop policy if exists "Org members view org roles" on public.user_roles;
create policy "Org members view org roles"
on public.user_roles
for select
to authenticated
using (public.is_org_member(auth.uid(), organization_id));

drop policy if exists "Org members view teammate profiles" on public.profiles;
create policy "Org members view teammate profiles"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_platform_admin(auth.uid())
  or public.share_org_with_user(auth.uid(), id)
);