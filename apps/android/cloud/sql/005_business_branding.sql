-- MK Receipt Pro Foundation 8
-- Business profile + private business logo storage.
-- Before running: create a PRIVATE Storage bucket named business-branding.

alter table public.businesses
  add column if not exists logo_storage_key text;

-- The existing businesses_update_admin policy controls profile updates.
-- Storage path convention: business-branding/{business_id}/logo

drop policy if exists mk_business_branding_select on storage.objects;
create policy mk_business_branding_select
on storage.objects for select to authenticated
using (
  bucket_id='business-branding'
  and array_length(storage.foldername(name),1)>=1
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists mk_business_branding_insert on storage.objects;
create policy mk_business_branding_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='business-branding'
  and array_length(storage.foldername(name),1)>=1
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists mk_business_branding_update on storage.objects;
create policy mk_business_branding_update
on storage.objects for update to authenticated
using (
  bucket_id='business-branding'
  and array_length(storage.foldername(name),1)>=1
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id='business-branding'
  and array_length(storage.foldername(name),1)>=1
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists mk_business_branding_delete on storage.objects;
create policy mk_business_branding_delete
on storage.objects for delete to authenticated
using (
  bucket_id='business-branding'
  and array_length(storage.foldername(name),1)>=1
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);
