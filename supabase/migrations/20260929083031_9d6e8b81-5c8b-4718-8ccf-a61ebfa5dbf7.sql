-- Platform settings (configurable verification deadline)
CREATE TABLE public.platform_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  verification_days integer NOT NULL DEFAULT 7 CHECK (verification_days BETWEEN 1 AND 90),
  reminder_days_before integer NOT NULL DEFAULT 2 CHECK (reminder_days_before BETWEEN 0 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin write" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.platform_settings(id) VALUES (1) ON CONFLICT DO NOTHING;

-- Audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  target_user_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX audit_logs_target_idx ON public.audit_logs(target_user_id, created_at DESC);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Validate profile status values + deadline from settings on insert
CREATE OR REPLACE FUNCTION public.profiles_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active','suspended','blocked') THEN
    RAISE EXCEPTION 'Invalid account status %', NEW.status;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verification_due_at = NEW.activated_at + make_interval(days => (SELECT verification_days FROM public.platform_settings WHERE id=1));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_validate BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_validate();

-- Audit account changes
CREATE OR REPLACE FUNCTION public.profiles_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.company_name IS DISTINCT FROM OLD.company_name OR NEW.business_type IS DISTINCT FROM OLD.business_type THEN
    INSERT INTO public.audit_logs(actor_id, target_user_id, action, details) VALUES (
      auth.uid(), NEW.id, 'profile_updated',
      jsonb_build_object('status', jsonb_build_array(OLD.status, NEW.status),
        'verification_status', jsonb_build_array(OLD.verification_status, NEW.verification_status),
        'company_name', jsonb_build_array(OLD.company_name, NEW.company_name)));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_audit AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_audit();

CREATE OR REPLACE FUNCTION public.roles_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(actor_id, target_user_id, action, details)
  VALUES (auth.uid(), COALESCE(NEW.user_id, OLD.user_id), 'role_' || lower(TG_OP), jsonb_build_object('role', COALESCE(NEW.role, OLD.role)));
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER roles_audit AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.roles_audit();

-- Active-account helper
CREATE OR REPLACE FUNCTION public.is_account_active(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR EXISTS (SELECT 1 FROM public.profiles WHERE id=_uid AND status='active')
$$;

-- Suspended/blocked accounts cannot send interests or create listings
CREATE POLICY "active accounts only" ON public.interests AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_account_active(auth.uid()));
CREATE POLICY "active accounts only" ON public.properties AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_account_active(auth.uid()));

-- Server-side deadline enforcement
CREATE OR REPLACE FUNCTION public.enforce_verification_deadlines()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; remind integer;
BEGIN
  SELECT reminder_days_before INTO remind FROM public.platform_settings WHERE id=1;
  FOR r IN SELECT p.id FROM public.profiles p
    WHERE p.status='active' AND p.verification_status NOT IN ('submitted','approved')
      AND p.reminder_sent_at IS NULL AND p.verification_due_at > now()
      AND p.verification_due_at <= now() + make_interval(days => remind)
      AND NOT public.has_role(p.id,'admin')
  LOOP
    UPDATE public.profiles SET reminder_sent_at = now() WHERE id=r.id;
    INSERT INTO public.notifications(user_id,title,body) VALUES (r.id,'Verification deadline approaching','Please complete your verification soon, otherwise your account will be suspended.');
  END LOOP;
  FOR r IN SELECT p.id FROM public.profiles p
    WHERE p.status='active' AND p.verification_status NOT IN ('submitted','approved')
      AND p.verification_due_at < now() AND NOT public.has_role(p.id,'admin')
  LOOP
    UPDATE public.profiles SET status='suspended' WHERE id=r.id;
    INSERT INTO public.notifications(user_id,title,body) VALUES (r.id,'Account suspended','Verification was not completed in time. Submit your verification to request reactivation.');
    INSERT INTO public.audit_logs(actor_id,target_user_id,action,details) VALUES (NULL,r.id,'auto_suspended','{"reason":"verification_deadline"}');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_verification_deadlines() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_validate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.roles_audit() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('eliteoz-verification-deadlines', '0 * * * *', 'SELECT public.enforce_verification_deadlines()');
SELECT public.enforce_verification_deadlines();