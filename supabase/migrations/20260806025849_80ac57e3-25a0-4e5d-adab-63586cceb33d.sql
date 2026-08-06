DROP POLICY IF EXISTS chats_select_members ON public.chats;
CREATE POLICY chats_select_members ON public.chats FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.is_chat_member(id, auth.uid()) OR public.is_owner(auth.uid()));