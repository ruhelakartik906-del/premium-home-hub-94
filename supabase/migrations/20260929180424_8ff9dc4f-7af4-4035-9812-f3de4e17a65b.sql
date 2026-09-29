CREATE TABLE public.staff_members (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  permissions text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admin reads staff" ON public.staff_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read own record" ON public.staff_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER staff_members_touch BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role') AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (_perm <> 'permanently_delete_users' AND EXISTS (SELECT 1 FROM public.staff_members s WHERE s.user_id = _user_id AND s.active AND _perm = ANY(s.permissions)))
  ) $$;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

-- Never allow removing the last Master Admin role.
CREATE OR REPLACE FUNCTION public.protect_last_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role = 'admin' AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin' AND id <> OLD.id) = 0 THEN
    RAISE EXCEPTION 'The last Master Admin cannot be removed';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER user_roles_protect_last_admin BEFORE DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.protect_last_admin();

CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  source text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received',
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook events" ON public.webhook_events FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_webhooks'));

CREATE POLICY "Permitted staff read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_audit_logs'));