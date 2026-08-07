
CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY permissions_select ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_select ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
GRANT SELECT ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY overrides_select_self ON public.user_permission_overrides
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER role_permissions_touch BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER overrides_touch BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.permissions (key, label, category, sort_order) VALUES
  ('view_staff_panel','View staff panel','general',10),
  ('view_reports','View reports','moderation',20),
  ('resolve_reports','Resolve reports','moderation',30),
  ('view_chats','View chat transcripts','moderation',40),
  ('delete_message','Delete any message','moderation',50),
  ('warn_user','Warn a user','moderation',60),
  ('restrict_user','Restrict an account','moderation',70),
  ('suspend_user','Suspend an account','moderation',80),
  ('manage_group_members','Add or remove group members','groups',90),
  ('manage_group_settings','Edit group settings','groups',100),
  ('delete_group','Delete a group','groups',110),
  ('send_announcement','Broadcast announcements','system',120),
  ('review_staff_applications','Review staff applications','staff',130),
  ('assign_roles','Assign staff ranks','staff',140),
  ('manage_permissions','Customise permissions','staff',150),
  ('view_activity_logs','View activity logs','system',160);

INSERT INTO public.role_permissions (role, permission)
SELECT 'viewer'::app_role, k FROM unnest(ARRAY['view_staff_panel','view_reports']) k
UNION ALL
SELECT 'helper'::app_role, k FROM unnest(ARRAY['view_staff_panel','view_reports','view_chats','warn_user','delete_message']) k
UNION ALL
SELECT 'admin'::app_role, k FROM unnest(ARRAY['view_staff_panel','view_reports','resolve_reports','view_chats','warn_user','delete_message','restrict_user','manage_group_members','manage_group_settings']) k
UNION ALL
SELECT 'manager'::app_role, k FROM unnest(ARRAY['view_staff_panel','view_reports','resolve_reports','view_chats','warn_user','delete_message','restrict_user','suspend_user','manage_group_members','manage_group_settings','delete_group','send_announcement','review_staff_applications','view_activity_logs']) k
UNION ALL
SELECT 'owner'::app_role, key FROM public.permissions;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_owner(_user_id) THEN true
    ELSE COALESCE(
      (SELECT granted FROM public.user_permission_overrides o
        WHERE o.user_id = _user_id AND o.permission = _permission),
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role = ur.role
        WHERE ur.user_id = _user_id AND rp.permission = _permission
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.effective_permissions(_user_id uuid)
RETURNS TABLE(permission text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.key FROM public.permissions p
  WHERE public.has_permission(_user_id, p.key);
$$;
