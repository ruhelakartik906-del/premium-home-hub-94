CREATE OR REPLACE FUNCTION public.protect_property_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.featured = OLD.featured; NEW.admin_note = OLD.admin_note; NEW.seller_id = OLD.seller_id;
    -- Seller may publish an admin-approved listing, or take own live listing offline, with no content edits.
    IF (OLD.status IN ('approved','unpublished') AND NEW.status = 'published')
       OR (OLD.status = 'published' AND NEW.status = 'unpublished') THEN
      IF OLD.status = 'unpublished' AND NOT EXISTS (SELECT 1 FROM public.audit_logs a WHERE (a.details->>'property_id')::uuid = NEW.id AND a.details->>'from' = 'published' AND a.details->>'to' = 'unpublished' AND a.actor_id = auth.uid() AND a.created_at > NEW.updated_at - interval '100 years') THEN
        NEW.status = 'pending';
      ELSE
        NEW.title = OLD.title; NEW.location = OLD.location; NEW.price = OLD.price; NEW.description = OLD.description;
        NEW.area_sqft = OLD.area_sqft; NEW.beds = OLD.beds; NEW.baths = OLD.baths; NEW.property_type = OLD.property_type;
        NEW.category_id = OLD.category_id; NEW.image = OLD.image; NEW.cover_url = OLD.cover_url; NEW.gallery = OLD.gallery;
        NEW.documents = OLD.documents; NEW.amenities = OLD.amenities;
      END IF;
    ELSIF NEW.status NOT IN ('draft','pending') THEN NEW.status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.properties_workflow()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('draft','pending','under_review','approved','changes_required','rejected','published','suspended','unpublished','sold') THEN
    RAISE EXCEPTION 'Invalid property status %', NEW.status;
  END IF;
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF TG_OP = 'INSERT' OR OLD.status NOT IN ('approved','unpublished','suspended') THEN
      RAISE EXCEPTION 'A property must be approved before it is published';
    END IF;
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
      IF OLD.seller_id IS DISTINCT FROM auth.uid() OR OLD.status = 'suspended' THEN RAISE EXCEPTION 'Only the owner can publish an approved property'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status='active') THEN RAISE EXCEPTION 'Your account must be active to publish'; END IF;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IN ('rejected','changes_required') AND NEW.status IS DISTINCT FROM OLD.status
     AND coalesce(trim(NEW.admin_note),'') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;
  RETURN NEW;
END $function$;