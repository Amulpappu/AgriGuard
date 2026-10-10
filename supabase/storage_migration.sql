-- AgriGuard: Storage Bucket & Row Level Security for Scan Images
-- ============================================================================
-- DRAFT — review before applying. Run in the Supabase SQL editor.
-- Bucket: scan-images (public read, authenticated user write under their user_id)
-- ============================================================================

begin;

-- 1. Create public bucket 'scan-images' if not already present
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scan-images',
  'scan-images',
  true,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage RLS Policies
-- Allow public read access for all scan images
drop policy if exists "scan_images_public_read" on storage.objects;
create policy "scan_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'scan-images');

-- Allow authenticated users to upload images into their own folder: <user_id>/*
drop policy if exists "scan_images_user_insert" on storage.objects;
create policy "scan_images_user_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'scan-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own scan images
drop policy if exists "scan_images_user_update" on storage.objects;
create policy "scan_images_user_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'scan-images' and
  (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'scan-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images; admin can delete any scan image
drop policy if exists "scan_images_user_or_admin_delete" on storage.objects;
create policy "scan_images_user_or_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'scan-images' and
  (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'email', '') = 'lohithgamer12@gmail.com'
  )
);

commit;
