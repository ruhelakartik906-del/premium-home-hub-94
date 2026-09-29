ALTER TABLE public.properties ADD COLUMN cover_url text, ADD COLUMN gallery text[] NOT NULL DEFAULT '{}', ADD COLUMN documents text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket read" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ticket insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'open' AND admin_reply IS NULL);
CREATE POLICY "ticket admin update" ON public.support_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.payment_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'razorpay',
  mode text NOT NULL DEFAULT 'test',
  key_id text,
  activation_fee numeric NOT NULL DEFAULT 50000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT UPDATE, INSERT ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay settings read" ON public.payment_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pay settings admin write" ON public.payment_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.payment_settings (id) VALUES (1);

CREATE TABLE public.gateway_secrets (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  key_secret text,
  webhook_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.gateway_secrets TO authenticated;
GRANT ALL ON public.gateway_secrets TO service_role;
ALTER TABLE public.gateway_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gw secrets admin" ON public.gateway_secrets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.gateway_secrets (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.status = OLD.status; NEW.verification_status = OLD.verification_status; NEW.account_type = OLD.account_type;
    NEW.activated_at = OLD.activated_at; NEW.verification_due_at = OLD.verification_due_at; NEW.created_by_admin = OLD.created_by_admin; NEW.email = OLD.email;
    IF coalesce(OLD.company_name,'') <> '' THEN NEW.company_name = OLD.company_name; END IF;
    IF coalesce(OLD.business_type,'') <> '' THEN NEW.business_type = OLD.business_type; END IF;
  END IF;
  RETURN NEW;
END $function$;