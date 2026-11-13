-- Private bucket for slip images sent by MacroDroid / iOS Shortcuts. Files live under <user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vault-slips', 'vault-slips', false, 8000000, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "vault slips: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'vault-slips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vault slips: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'vault-slips' and (storage.foldername(name))[1] = auth.uid()::text);
