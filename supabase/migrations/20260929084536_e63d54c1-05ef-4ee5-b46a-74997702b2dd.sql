CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  NEW.updated_at = now();
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin')
     AND coalesce(current_setting('eliteoz.trusted_sync', true), '') <> 'on' THEN
    NEW.status = OLD.status; NEW.verification_status = OLD.verification_status; NEW.account_type = OLD.account_type;
    NEW.activated_at = OLD.activated_at; NEW.verification_due_at = OLD.verification_due_at; NEW.created_by_admin = OLD.created_by_admin; NEW.email = OLD.email;
    IF coalesce(OLD.company_name,'') <> '' THEN NEW.company_name = OLD.company_name; END IF;
    IF coalesce(OLD.business_type,'') <> '' THEN NEW.business_type = OLD.business_type; END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.kyc_sync_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('eliteoz.trusted_sync', 'on', true);
  UPDATE public.profiles SET verification_status = CASE NEW.status
      WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected'
      WHEN 'changes_required' THEN 'changes_required' ELSE 'submitted' END,
    status = CASE WHEN NEW.status='approved' AND status='suspended' THEN 'active' ELSE status END
  WHERE id = NEW.user_id;
  PERFORM set_config('eliteoz.trusted_sync', '', true);
  RETURN NEW;
END $$;