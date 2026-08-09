CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  target_type text,
  target_id uuid,
  target_label text,
  result text not null default 'success',
  detail text,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_select ON public.activity_logs;
CREATE POLICY activity_logs_select ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'view_activity_logs'));

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at DESC);

INSERT INTO public.permissions (key, label, category, sort_order)
VALUES ('view_analytics', 'View analytics', 'system', 170)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission)
VALUES ('admin', 'view_analytics'), ('manager', 'view_analytics')
ON CONFLICT (role, permission) DO NOTHING;