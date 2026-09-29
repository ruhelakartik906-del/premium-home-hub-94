-- Saved properties
CREATE TABLE public.saved_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_properties TO authenticated;
GRANT ALL ON public.saved_properties TO service_role;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved own read" ON public.saved_properties FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "saved own insert" ON public.saved_properties FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved own delete" ON public.saved_properties FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Platform settings: non-secret configuration
ALTER TABLE public.platform_settings
  ADD COLUMN contact_email text, ADD COLUMN contact_phone text,
  ADD COLUMN otp_provider text NOT NULL DEFAULT 'demo',
  ADD COLUMN smtp_host text, ADD COLUMN smtp_from text,
  ADD COLUMN whatsapp_webhook_url text,
  ADD COLUMN notify_email boolean NOT NULL DEFAULT false,
  ADD COLUMN notify_whatsapp boolean NOT NULL DEFAULT false;

-- Transactions: payment tracking fields
ALTER TABLE public.transactions
  ADD COLUMN order_id text, ADD COLUMN payment_id text,
  ADD COLUMN currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN provider text, ADD COLUMN failure_reason text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX transactions_payment_id_uq ON public.transactions(payment_id) WHERE payment_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS properties_status_cat_idx ON public.properties(status, category_id);
CREATE INDEX IF NOT EXISTS properties_seller_idx ON public.properties(seller_id);
CREATE INDEX IF NOT EXISTS interests_buyer_idx ON public.interests(buyer_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS kyc_user_idx ON public.kyc_submissions(user_id, created_at DESC);

-- Property: notify seller on submit/resubmit, audit every status change
CREATE OR REPLACE FUNCTION public.properties_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'pending' AND NEW.seller_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,title,body) VALUES (NEW.seller_id,
        CASE WHEN TG_OP='UPDATE' AND OLD.status='rejected' THEN 'Property resubmitted' ELSE 'Property submitted' END,
        NEW.title || ' is with the Eliteoz team for verification. It goes live only after approval.');
    END IF;
    INSERT INTO public.audit_logs(actor_id,target_user_id,action,details) VALUES (auth.uid(), NEW.seller_id, 'property_status',
      jsonb_build_object('property_id',NEW.id,'ref',NEW.ref,'from',CASE WHEN TG_OP='UPDATE' THEN OLD.status END,'to',NEW.status,'note',NEW.admin_note));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER properties_events AFTER INSERT OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.properties_events();

-- KYC: notify on submit, audit every status change
CREATE OR REPLACE FUNCTION public.kyc_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES (NEW.user_id,'Verification submitted','Your documents are with the Eliteoz team for review.');
  END IF;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs(actor_id,target_user_id,action,details) VALUES (auth.uid(), NEW.user_id, 'kyc_status',
      jsonb_build_object('kyc_id',NEW.id,'to',NEW.status,'note',NEW.admin_note));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER kyc_events AFTER INSERT OR UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.kyc_events();

-- Transactions: audit + updated_at
CREATE OR REPLACE FUNCTION public.transactions_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs(actor_id,target_user_id,action,details) VALUES (auth.uid(), NEW.user_id, 'payment_status',
      jsonb_build_object('reference',NEW.reference,'amount',NEW.amount,'method',NEW.method,'to',NEW.status));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transactions_events AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.transactions_events();
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER transactions_touch BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER platform_settings_touch BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Settings: audit changes
CREATE OR REPLACE FUNCTION public.settings_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(actor_id,action,details) VALUES (auth.uid(), 'settings_changed:' || TG_TABLE_NAME, to_jsonb(NEW) - 'key_secret' - 'webhook_secret');
  RETURN NEW;
END $$;
CREATE TRIGGER platform_settings_audit AFTER UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.settings_audit();
CREATE TRIGGER payment_settings_audit AFTER UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.settings_audit();

REVOKE EXECUTE ON FUNCTION public.properties_events(), public.kyc_events(), public.transactions_events(), public.settings_audit(), public.touch_updated_at() FROM PUBLIC, anon, authenticated;