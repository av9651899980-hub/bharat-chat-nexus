CREATE POLICY "profile_photos_authenticated_read" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_owner_upload" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

CREATE POLICY "profile_photos_owner_update" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

CREATE POLICY "profile_photos_owner_delete" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);