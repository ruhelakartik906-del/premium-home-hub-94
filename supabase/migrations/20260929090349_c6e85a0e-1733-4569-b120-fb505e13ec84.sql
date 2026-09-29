-- Strict listing workflow
CREATE OR REPLACE FUNCTION public.properties_workflow()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('draft','pending','under_review','approved','changes_required','rejected','published','suspended','unpublished','sold') THEN
    RAISE EXCEPTION 'Invalid property status %', NEW.status;
  END IF;
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only the Master Admin can publish a property'; END IF;
    IF TG_OP = 'INSERT' OR OLD.status NOT IN ('approved','unpublished','suspended') THEN
      RAISE EXCEPTION 'A property must be approved before it is published';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IN ('rejected','changes_required') AND NEW.status IS DISTINCT FROM OLD.status
     AND coalesce(trim(NEW.admin_note),'') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.properties_workflow() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS properties_workflow ON public.properties;
CREATE TRIGGER properties_workflow BEFORE INSERT OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.properties_workflow();

-- Public visibility: published only
DROP POLICY IF EXISTS "approved public" ON public.properties;
CREATE POLICY "published public" ON public.properties FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "media read scoped" ON storage.objects;
CREATE POLICY "media read scoped" ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id = 'property-media' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.status = 'published'
      AND (p.cover_url LIKE '%' || objects.name OR EXISTS (SELECT 1 FROM unnest(p.gallery) g(g) WHERE g.g LIKE '%' || objects.name)))));

-- Sellers who lose active status have live listings taken down (admin must re-publish)
CREATE OR REPLACE FUNCTION public.seller_status_listings()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('suspended','blocked','deactivated') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.properties SET status='unpublished', admin_note='Seller account ' || NEW.status
    WHERE seller_id = NEW.id AND status IN ('published','approved','pending','under_review');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.seller_status_listings() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS seller_status_listings ON public.profiles;
CREATE TRIGGER seller_status_listings AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.seller_status_listings();