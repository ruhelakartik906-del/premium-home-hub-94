CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT (_user_id = auth.uid() OR auth.role() = 'service_role' OR current_setting('request.jwt.claims', true) IS NULL OR current_setting('request.jwt.claims', true) = '')
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION private.has_permission(_user_id uuid, _perm text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role') AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR (_perm <> 'permanently_delete_users' AND EXISTS (SELECT 1 FROM public.staff_members s WHERE s.user_id = _user_id AND s.active AND _perm = ANY(s.permissions)))
  ) $$;

CREATE OR REPLACE FUNCTION private.admin_list_members() RETURNS TABLE(id uuid, payment_status text, last_sign_in_at timestamptz, lifecycle text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_permission(auth.uid(), 'view_users') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, lp.status, u.last_sign_in_at,
    public.account_state(p.status, p.verification_status, p.verification_due_at, lp.status)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN LATERAL (SELECT t.status FROM public.transactions t WHERE t.user_id=p.id AND t.purpose='activation' ORDER BY t.created_at DESC LIMIT 1) lp ON true;
END $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role), private.has_permission(uuid, text), private.admin_list_members() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role), private.has_permission(uuid, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.admin_list_members() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT private.has_role(_user_id, _role) $$;
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT private.has_permission(_user_id, _perm) $$;
CREATE OR REPLACE FUNCTION public.admin_list_members() RETURNS TABLE(id uuid, payment_status text, last_sign_in_at timestamptz, lifecycle text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM private.admin_list_members() $$;

CREATE POLICY "No client access" ON public.gateway_secrets AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client access" ON public.otp_verifications AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);