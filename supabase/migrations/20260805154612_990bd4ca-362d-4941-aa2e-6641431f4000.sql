CREATE POLICY "notifications_insert_chat_peers" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_members a
  JOIN public.chat_members b ON a.chat_id = b.chat_id
  WHERE a.user_id = auth.uid() AND b.user_id = notifications.user_id
));
GRANT INSERT ON public.notifications TO authenticated;