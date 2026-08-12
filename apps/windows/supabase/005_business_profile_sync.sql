-- Cloud 3.4: shared business profile + logo
alter table public.businesses add column if not exists owner_name text;
alter table public.businesses add column if not exists business_number text;
alter table public.businesses add column if not exists tax_status text;
alter table public.businesses add column if not exists phone text;
alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists address text;
alter table public.businesses add column if not exists slogan text;
alter table public.businesses add column if not exists brand_color text default '#4F46E5';
alter table public.businesses add column if not exists logo_storage_key text;
alter table public.businesses add column if not exists updated_at timestamptz default now();

insert into storage.buckets (id,name,public)
values ('business-assets','business-assets',false)
on conflict (id) do update set public=false;

-- Business members may read/write only their own business branding folder.
drop policy if exists "business assets read" on storage.objects;
create policy "business assets read" on storage.objects for select to authenticated
using (bucket_id='business-assets' and public.user_has_business_access(((storage.foldername(name))[1])::uuid));
drop policy if exists "business assets insert" on storage.objects;
create policy "business assets insert" on storage.objects for insert to authenticated
with check (bucket_id='business-assets' and public.user_has_business_access(((storage.foldername(name))[1])::uuid));
drop policy if exists "business assets update" on storage.objects;
create policy "business assets update" on storage.objects for update to authenticated
using (bucket_id='business-assets' and public.user_has_business_access(((storage.foldername(name))[1])::uuid))
with check (bucket_id='business-assets' and public.user_has_business_access(((storage.foldername(name))[1])::uuid));

-- Ensure authenticated business members can update their own business profile.
drop policy if exists "business profile update" on public.businesses;
create policy "business profile update" on public.businesses for update to authenticated
using (public.user_has_business_access(id))
with check (public.user_has_business_access(id));
