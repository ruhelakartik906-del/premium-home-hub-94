-- 1) Hardened role check: callers may only check their own roles (server/cron contexts without a JWT are trusted).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT (_user_id = auth.uid() OR auth.role() = 'service_role' OR current_setting('request.jwt.claims', true) IS NULL OR current_setting('request.jwt.claims', true) = '')
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

-- 2) Account status + transition rules
CREATE OR REPLACE FUNCTION public.profiles_validate()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('active','suspended','blocked','pending_payment','deactivated') THEN
    RAISE EXCEPTION 'Invalid account status %', NEW.status;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verification_due_at = NEW.activated_at + make_interval(days => (SELECT verification_days FROM public.platform_settings WHERE id=1));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'deactivated' THEN RAISE EXCEPTION 'Deactivated accounts cannot be changed'; END IF;
    IF OLD.status = 'pending_payment' AND NEW.status = 'active' AND NOT EXISTS (
        SELECT 1 FROM public.transactions WHERE user_id = NEW.id AND purpose='activation' AND status='success') THEN
      RAISE EXCEPTION 'Account cannot be activated before the activation payment is verified';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- 3) Lifecycle state (derived, single source of truth)
CREATE OR REPLACE FUNCTION public.account_state(_status text, _verification text, _due timestamptz, _last_payment text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT CASE
  WHEN _status = 'deactivated' THEN 'deactivated'
  WHEN _status IN ('suspended','blocked') THEN 'suspended'
  WHEN _status = 'pending_payment' AND _last_payment = 'failed' THEN 'payment_failed'
  WHEN _status = 'pending_payment' THEN 'pending_payment'
  WHEN _verification = 'rejected' THEN 'rejected'
  WHEN _verification = 'changes_required' THEN 'resubmission_required'
  WHEN _verification = 'submitted' THEN 'verification_pending'
  WHEN _verification = 'approved' THEN 'verified'
  WHEN _due < now() THEN 'suspended'
  ELSE 'verification_required' END $$;

CREATE OR REPLACE FUNCTION public.admin_list_members()
 RETURNS TABLE(id uuid, payment_status text, last_sign_in_at timestamptz, lifecycle text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role='admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, lp.status, u.last_sign_in_at,
    public.account_state(p.status, p.verification_status, p.verification_due_at, lp.status)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN LATERAL (SELECT t.status FROM public.transactions t WHERE t.user_id=p.id AND t.purpose='activation' ORDER BY t.created_at DESC LIMIT 1) lp ON true;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_members() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_members() TO authenticated;

-- 4) Sellers may submit listings for review only when active and verified
CREATE OR REPLACE FUNCTION public.property_submit_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND NEW.status = 'pending'
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status='active' AND verification_status='approved') THEN
    RAISE EXCEPTION 'Complete verification before submitting a property for review';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS property_submit_guard ON public.properties;
CREATE TRIGGER property_submit_guard BEFORE INSERT OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.property_submit_guard();