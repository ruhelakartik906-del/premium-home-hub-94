CREATE TYPE public.app_role AS ENUM ('admin','buyer','seller');

CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE POLICY "own roles or admin" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.claim_first_admin() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(),'admin');
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.admin_exists() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') $$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', mobile text, dob date, gender text,
  country text, state text, city text, address text, pincode text, company_name text, business_type text,
  account_type text NOT NULL DEFAULT 'buyer',
  status text NOT NULL DEFAULT 'active',
  verification_status text NOT NULL DEFAULT 'not_submitted',
  activated_at timestamptz NOT NULL DEFAULT now(),
  verification_due_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "update own or admin" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.protect_profile_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.status = OLD.status; NEW.verification_status = OLD.verification_status; NEW.account_type = OLD.account_type;
    NEW.activated_at = OLD.activated_at; NEW.verification_due_at = OLD.verification_due_at; NEW.created_by_admin = OLD.created_by_admin; NEW.email = OLD.email;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pan text NOT NULL, gov_id text NOT NULL, gst text, account_holder text NOT NULL, bank_name text NOT NULL,
  account_number text NOT NULL, ifsc text NOT NULL, status text NOT NULL DEFAULT 'submitted', admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated; GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc read" ON public.kyc_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "kyc insert own" ON public.kyc_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status='submitted');
CREATE POLICY "kyc admin update" ON public.kyc_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.kyc_sync_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET verification_status = CASE NEW.status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' ELSE 'submitted' END,
    status = CASE WHEN NEW.status='approved' AND status='suspended' THEN 'active' ELSE status END
  WHERE id = NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER kyc_sync AFTER INSERT OR UPDATE OF status ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.kyc_sync_profile();

CREATE TABLE public.categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, description text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.categories TO anon, authenticated; GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated; GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ref text NOT NULL UNIQUE DEFAULT ('ELZ-' || lpad((floor(random()*90000)+10000)::text,5,'0')),
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL, location text NOT NULL, price numeric NOT NULL DEFAULT 0, area_sqft integer, beds integer, baths integer,
  property_type text NOT NULL DEFAULT 'Villa', description text, image text NOT NULL DEFAULT 'villa', amenities text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', featured boolean NOT NULL DEFAULT false, admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO anon; GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated; GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved public" ON public.properties FOR SELECT TO anon, authenticated USING (status='approved');
CREATE POLICY "seller own read" ON public.properties FOR SELECT TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "seller insert" ON public.properties FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid() AND public.has_role(auth.uid(),'seller') AND status IN ('draft','pending'));
CREATE POLICY "seller update" ON public.properties FOR UPDATE TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "seller delete" ON public.properties FOR DELETE TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.protect_property_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.featured = OLD.featured; NEW.admin_note = OLD.admin_note; NEW.seller_id = OLD.seller_id;
    IF NEW.status NOT IN ('draft','pending') THEN NEW.status = 'pending'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER properties_protect BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.protect_property_fields();

CREATE TABLE public.interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL, phone text NOT NULL, email text NOT NULL,
  message text, preferred_time text, status text NOT NULL DEFAULT 'new', admin_note text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.interests TO authenticated; GRANT ALL ON public.interests TO service_role;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interest read" ON public.interests FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.seller_id = auth.uid()));
CREATE POLICY "interest insert" ON public.interests FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid() AND status='new');
CREATE POLICY "interest admin update" ON public.interests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, title text NOT NULL, body text NOT NULL, read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated; GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif read own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif mark own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif admin insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, amount numeric NOT NULL, purpose text NOT NULL DEFAULT 'activation', method text NOT NULL DEFAULT 'test', status text NOT NULL DEFAULT 'success', reference text NOT NULL DEFAULT ('TXN-' || upper(substr(md5(random()::text),1,10))), payer_name text, payer_email text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.transactions TO authenticated; GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "txn read" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "txn admin update" ON public.transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.categories(name, description) VALUES ('Residential','Villas, penthouses and homes'),('Commercial','Offices and retail'),('Land','Plots and land parcels'),('Investment','Income-generating assets'),('Hospitality','Hotels and resorts');

INSERT INTO public.properties(ref,title,location,price,area_sqft,beds,baths,property_type,description,image,status,featured,category_id,amenities) VALUES
('ELZ-10001','The Solstice Residence','Lonavala, Maharashtra',125000000,8400,5,6,'Villa','A hillside villa with sweeping valley views, generous terraces and a private pool.','villa','approved',true,(SELECT id FROM public.categories WHERE name='Residential'),ARRAY['Private pool','Parking','Garden','Security']),
('ELZ-10002','Altura Sky Penthouse','Worli, Mumbai',280000000,6200,4,5,'Penthouse','A full-floor penthouse with sea views, a sky deck and private elevator access.','penthouse','approved',true,(SELECT id FROM public.categories WHERE name='Residential'),ARRAY['Sea view','Private lift','Concierge','Gym']),
('ELZ-10003','Arbor House Estate','Whitefield, Bengaluru',180000000,11600,6,7,'Estate','A landscaped estate with mature trees, guest wing and entertainment pavilion.','estate','approved',false,(SELECT id FROM public.categories WHERE name='Residential'),ARRAY['Guest house','Garden','Parking']),
('ELZ-10004','The Glass Pavilion','Alibaug, Maharashtra',167500000,9100,5,5,'Villa','A contemporary glass pavilion near the coast, designed for light and calm.','hero','approved',false,(SELECT id FROM public.categories WHERE name='Investment'),ARRAY['Near beach','Pool','Solar power']);