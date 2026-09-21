ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint;

CREATE POLICY "chat_attachments_members_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_members cm
    WHERE cm.chat_id = split_part(name, '/', 1)::uuid
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "chat_attachments_members_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_members cm
    WHERE cm.chat_id = split_part(name, '/', 1)::uuid
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "chat_attachments_members_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND owner_id = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND owner_id = auth.uid()::text
);

CREATE POLICY "chat_attachments_members_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND owner_id = auth.uid()::text
);