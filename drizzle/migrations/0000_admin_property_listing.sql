ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS created_by_role text NOT NULL DEFAULT 'seller';
UPDATE public.properties SET created_by = seller_id WHERE created_by IS NULL;

CREATE OR REPLACE FUNCTION public.properties_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(auth.uid(), NEW.created_by, NEW.seller_id);
    NEW.created_by_role := CASE WHEN auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin') THEN 'admin'
                                WHEN auth.uid() IS NULL THEN coalesce(NEW.created_by_role,'seller') ELSE 'seller' END;
  ELSE
    NEW.created_by := OLD.created_by; NEW.created_by_role := OLD.created_by_role;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS properties_source ON public.properties;
CREATE TRIGGER properties_source BEFORE INSERT OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.properties_source();

CREATE OR REPLACE FUNCTION public.properties_workflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_admin boolean := auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin');
BEGIN
  IF NEW.status NOT IN ('draft','pending','under_review','approved','changes_required','rejected','published','suspended','unpublished','sold') THEN
    RAISE EXCEPTION 'Invalid property status %', NEW.status;
  END IF;
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF TG_OP = 'INSERT' THEN
      IF NOT is_admin THEN RAISE EXCEPTION 'A property must be approved before it is published'; END IF;
    ELSIF OLD.status NOT IN ('approved','unpublished','suspended') AND NOT (is_admin AND OLD.created_by_role = 'admin') THEN
      RAISE EXCEPTION 'A property must be approved before it is published';
    END IF;
    IF auth.uid() IS NOT NULL AND NOT is_admin THEN
      IF OLD.seller_id IS DISTINCT FROM auth.uid() OR OLD.status = 'suspended' THEN RAISE EXCEPTION 'Only the owner can publish an approved property'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status='active') THEN RAISE EXCEPTION 'Your account must be active to publish'; END IF;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IN ('rejected','changes_required') AND NEW.status IS DISTINCT FROM OLD.status
     AND coalesce(trim(NEW.admin_note),'') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;
  RETURN NEW;
END $$;

CREATE POLICY "admin insert" ON public.properties FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by_role = 'admin');