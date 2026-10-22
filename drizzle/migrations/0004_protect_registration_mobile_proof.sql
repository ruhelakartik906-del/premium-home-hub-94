CREATE OR REPLACE FUNCTION public.profiles_mobile_proof_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
  NEW.mobile_verified := OLD.mobile_verified;
  IF NEW.mobile IS DISTINCT FROM OLD.mobile THEN NEW.mobile_verified := false; END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.status='pending_payment' AND NEW.status='active' AND NOT NEW.created_by_admin AND NOT NEW.mobile_verified AND NOT public.has_role(NEW.id,'admin') THEN
  RAISE EXCEPTION 'Mobile verification is required before activation';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_profiles_mobile_proof_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_mobile_proof_guard();
REVOKE ALL ON FUNCTION public.profiles_mobile_proof_guard() FROM PUBLIC,anon,authenticated;