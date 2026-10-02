ALTER FUNCTION public.admin_delete_user(uuid, text) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.admin_delete_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_delete_user(uuid, text) TO authenticated;
CREATE FUNCTION public.admin_delete_user(_target uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.admin_delete_user(_target, _reason) $$;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text) TO authenticated;