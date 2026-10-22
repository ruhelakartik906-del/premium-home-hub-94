CREATE OR REPLACE FUNCTION public.initialize_first_admin(_user_id uuid, _full_name text, _email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('eliteoz:first-admin', 0));
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.profiles (id, full_name, email, account_type, verification_status, created_by_admin)
  VALUES (_user_id, _full_name, lower(trim(_email)), 'admin', 'approved', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, account_type = 'admin', verification_status = 'approved', created_by_admin = true;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.initialize_first_admin(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_first_admin(uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.initialize_first_admin(uuid, text, text) IS 'Service-only serialized one-time administrator initialization; profile and role commit atomically.';