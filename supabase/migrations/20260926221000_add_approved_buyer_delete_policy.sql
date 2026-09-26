create policy buyers_admin_delete on public.approved_buyers
for delete to authenticated
using ((select private.current_profile_role()) = 'admin');

grant delete on public.approved_buyers to authenticated;
