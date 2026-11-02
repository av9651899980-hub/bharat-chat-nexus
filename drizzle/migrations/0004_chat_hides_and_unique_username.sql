-- Case-insensitive username uniqueness: no two accounts may share a handle regardless of case.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));

-- User-side soft hide for conversations. Data stays 100% intact; this only removes
-- the conversation card from the user's own screen (JARVIS Omniverse is unaffected).
CREATE TABLE public.chat_hides (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_id)
);

GRANT SELECT, INSERT, DELETE ON public.chat_hides TO authenticated;
GRANT ALL ON public.chat_hides TO service_role;

ALTER TABLE public.chat_hides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_hides_select" ON public.chat_hides FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "chat_hides_insert" ON public.chat_hides FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_hides_delete" ON public.chat_hides FOR DELETE TO authenticated
  USING (user_id = auth.uid());