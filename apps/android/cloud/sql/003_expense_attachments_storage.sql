-- MK Receipt Pro Foundation 6
-- Run AFTER creating a PRIVATE Storage bucket named: expense-attachments
-- Do NOT make the bucket public.

-- Folder convention:
-- expense-attachments/{business_id}/{expense_id}/{file_name}

drop policy if exists mk_expense_attachments_select on storage.objects;
create policy mk_expense_attachments_select
on storage.objects
for select
to authenticated
using (
  bucket_id='expense-attachments'
  and array_length(storage.foldername(name),1) >= 2
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists mk_expense_attachments_insert on storage.objects;
create policy mk_expense_attachments_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id='expense-attachments'
  and array_length(storage.foldername(name),1) >= 2
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);

drop policy if exists mk_expense_attachments_delete on storage.objects;
create policy mk_expense_attachments_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id='expense-attachments'
  and array_length(storage.foldername(name),1) >= 2
  and user_has_business_access(((storage.foldername(name))[1])::uuid)
);
