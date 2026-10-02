CREATE OR REPLACE FUNCTION public.admin_delete_user(_target uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _role text; _mobile text; _props uuid[];
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only the Master Admin can permanently delete users'; END IF;
  IF _target = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own account'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target) THEN RAISE EXCEPTION 'User not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _target AND role = 'admin') THEN RAISE EXCEPTION 'Master Admin accounts cannot be deleted'; END IF;
  SELECT role::text INTO _role FROM public.user_roles WHERE user_id = _target LIMIT 1;
  SELECT mobile INTO _mobile FROM public.profiles WHERE id = _target;
  INSERT INTO public.audit_logs(actor_id, target_user_id, action, details)
  VALUES (auth.uid(), _target, 'PERMANENT_USER_DELETION', jsonb_build_object('deletion_type','PERMANENT','role',_role,'reason',_reason,'deleted_at',now()));
  SELECT coalesce(array_agg(id), '{}') INTO _props FROM public.properties WHERE seller_id = _target;
  DELETE FROM public.interests WHERE property_id = ANY(_props);
  DELETE FROM public.saved_properties WHERE property_id = ANY(_props) OR user_id = _target;
  DELETE FROM public.properties WHERE id = ANY(_props);
  DELETE FROM public.kyc_documents WHERE user_id = _target;
  DELETE FROM public.staff_members WHERE user_id = _target;
  IF _mobile IS NOT NULL THEN DELETE FROM public.otp_verifications WHERE mobile = _mobile; END IF;
  UPDATE public.transactions SET payer_name = NULL, payer_email = NULL WHERE user_id = _target;
  DELETE FROM auth.users WHERE id = _target; -- cascades profile, roles, KYC, notifications, interests, tickets, sessions
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text) TO authenticated;