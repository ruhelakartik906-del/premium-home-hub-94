ALTER TABLE public.interests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'enquiry',
  ADD COLUMN IF NOT EXISTS request_code text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.interests SET request_code = 'REQ-' || upper(substr(replace(id::text,'-',''),1,8)) WHERE request_code IS NULL;

CREATE OR REPLACE FUNCTION public.interests_prepare() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.request_type NOT IN ('enquiry','viewing','purchase_interest','general') THEN RAISE EXCEPTION 'Invalid request type'; END IF;
    IF NOT EXISTS (SELECT 1 FROM properties p WHERE p.id = NEW.property_id AND p.status IN ('published','approved','live','active')) THEN RAISE EXCEPTION 'Property is not available'; END IF;
    IF EXISTS (SELECT 1 FROM interests i WHERE i.buyer_id = NEW.buyer_id AND i.property_id = NEW.property_id AND i.request_type = NEW.request_type AND i.status <> 'closed') THEN
      RAISE EXCEPTION 'DUPLICATE_REQUEST' USING ERRCODE = 'P0001';
    END IF;
    NEW.request_code := 'REQ-' || upper(substr(replace(NEW.id::text,'-',''),1,8));
    NEW.assigned_to := NULL; NEW.internal_notes := NULL; NEW.admin_note := NULL;
  ELSE
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS interests_prepare ON public.interests;
CREATE TRIGGER interests_prepare BEFORE INSERT OR UPDATE ON public.interests FOR EACH ROW EXECUTE FUNCTION public.interests_prepare();

CREATE TABLE IF NOT EXISTS public.interest_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id uuid NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  actor_id uuid,
  kind text NOT NULL DEFAULT 'note',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.interest_activity TO authenticated;
GRANT ALL ON public.interest_activity TO service_role;
ALTER TABLE public.interest_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read activity" ON public.interest_activity FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_permission(auth.uid(),'view_users'));
CREATE POLICY "admin write activity" ON public.interest_activity FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND actor_id = auth.uid());

-- Sellers can no longer read buyer contact rows directly
DROP POLICY IF EXISTS "interest read" ON public.interests;
CREATE POLICY "interest read" ON public.interests FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Seller sees an anonymised summary only
CREATE OR REPLACE FUNCTION public.seller_interest_summary()
RETURNS TABLE(id uuid, request_code text, request_type text, status text, created_at timestamptz, property_ref text, property_title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.request_code, i.request_type, i.status, i.created_at, p.ref, p.title
  FROM interests i JOIN properties p ON p.id = i.property_id
  WHERE p.seller_id = auth.uid() ORDER BY i.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.seller_interest_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_interest_summary() TO authenticated;