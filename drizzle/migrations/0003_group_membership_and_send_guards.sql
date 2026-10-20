CREATE OR REPLACE FUNCTION public.guard_chat_membership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.chats; actor uuid := auth.uid();
BEGIN
 IF TG_OP = 'DELETE' THEN SELECT * INTO c FROM public.chats WHERE id = OLD.chat_id; ELSE SELECT * INTO c FROM public.chats WHERE id = NEW.chat_id; END IF;
 IF TG_OP = 'INSERT' AND actor IS NOT NULL AND NOT public.is_owner(actor) AND NOT public.is_chat_admin(NEW.chat_id, actor) THEN
   IF c.created_by IS DISTINCT FROM actor OR NEW.user_id IS DISTINCT FROM actor OR NOT NEW.is_admin THEN RAISE EXCEPTION 'Only the conversation creator can initialize membership'; END IF;
 END IF;
 IF TG_OP = 'UPDATE' AND (NEW.chat_id IS DISTINCT FROM OLD.chat_id OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN RAISE EXCEPTION 'Membership identity cannot be changed'; END IF;
 IF c.is_group AND TG_OP IN ('UPDATE','DELETE') AND OLD.user_id = c.created_by THEN
   IF TG_OP = 'DELETE' THEN
     IF EXISTS (SELECT 1 FROM public.chats WHERE id = OLD.chat_id) THEN RAISE EXCEPTION 'The group owner cannot be removed'; END IF;
   ELSIF NOT NEW.is_admin THEN RAISE EXCEPTION 'The group owner cannot be demoted'; END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER guard_chat_membership BEFORE INSERT OR UPDATE OR DELETE ON public.chat_members FOR EACH ROW EXECUTE FUNCTION public.guard_chat_membership();
CREATE OR REPLACE FUNCTION public.guard_message_send() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.chats;
BEGIN
 IF TG_OP = 'UPDATE' AND (NEW.chat_id IS DISTINCT FROM OLD.chat_id OR NEW.sender_id IS DISTINCT FROM OLD.sender_id) THEN RAISE EXCEPTION 'Message identity cannot be changed'; END IF;
 IF TG_OP = 'INSERT' THEN
 SELECT * INTO c FROM public.chats WHERE id = NEW.chat_id;
 IF NOT public.is_chat_member(NEW.chat_id, NEW.sender_id) THEN RAISE EXCEPTION 'Only members can send messages'; END IF;
 IF c.is_group AND c.only_admins_send AND NOT public.is_chat_admin(NEW.chat_id, NEW.sender_id) THEN RAISE EXCEPTION 'Only group admins can send messages'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_message_send BEFORE INSERT OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_message_send();
CREATE OR REPLACE FUNCTION public.create_group_atomic(_name text, _members uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid := auth.uid(); group_id uuid; member_id uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in to create a group'; END IF;
 IF length(trim(_name)) < 1 OR length(trim(_name)) > 60 THEN RAISE EXCEPTION 'Group name must contain 1 to 60 characters'; END IF;
 IF NOT EXISTS (SELECT 1 FROM unnest(_members) m WHERE m <> actor) THEN RAISE EXCEPTION 'Select at least one other member'; END IF;
 INSERT INTO public.chats(is_group, name, created_by) VALUES(true, trim(_name), actor) RETURNING id INTO group_id;
 INSERT INTO public.chat_members(chat_id,user_id,is_admin) VALUES(group_id,actor,true);
 FOR member_id IN SELECT DISTINCT m FROM unnest(_members) m WHERE m <> actor LOOP
 INSERT INTO public.chat_members(chat_id,user_id,is_admin) VALUES(group_id,member_id,false);
 END LOOP;
 RETURN group_id;
END $$;
REVOKE ALL ON FUNCTION public.create_group_atomic(text,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_atomic(text,uuid[]) TO authenticated;
