-- ===== Manual / offline payments =====
ALTER TABLE public.transactions
  ADD COLUMN payment_date date,
  ADD COLUMN notes text,
  ADD COLUMN receipt_path text,
  ADD COLUMN recorded_by uuid,
  ADD COLUMN verified_by uuid,
  ADD COLUMN verified_at timestamptz;

GRANT INSERT ON public.transactions TO authenticated;
CREATE POLICY "txn admin insert" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND recorded_by = auth.uid());

-- Validate method/status values
CREATE OR REPLACE FUNCTION public.transactions_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('created','pending','success','failed','cancelled','refunded','partially_refunded') THEN
    RAISE EXCEPTION 'Invalid payment status %', NEW.status;
  END IF;
  IF NEW.amount < 0 THEN RAISE EXCEPTION 'Amount cannot be negative'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transactions_validate BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.transactions_validate();

-- When an activation payment becomes successful, (re)activate the account
CREATE OR REPLACE FUNCTION public.transactions_activate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE days int;
BEGIN
  IF NEW.purpose = 'activation' AND NEW.status = 'success' AND NEW.user_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'success') THEN
    SELECT verification_days INTO days FROM public.platform_settings WHERE id=1;
    UPDATE public.profiles SET
      status = CASE WHEN status = 'blocked' THEN status ELSE 'active' END,
      activated_at = now(),
      verification_due_at = CASE WHEN verification_status IN ('approved','submitted') THEN verification_due_at ELSE now() + make_interval(days => days) END
    WHERE id = NEW.user_id;
    INSERT INTO public.notifications(user_id,title,body) VALUES (NEW.user_id,'Payment confirmed','Your activation payment (' || NEW.reference || ') has been confirmed. Your account is active.');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transactions_activate AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.transactions_activate();

-- Admins can upload/read payment receipts in the private docs bucket
CREATE POLICY "docs admin upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-docs' AND public.has_role(auth.uid(),'admin'));

-- ===== KYC: changes requested + resubmission + reopen =====
ALTER TABLE public.kyc_submissions ADD COLUMN required_fields text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.kyc_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('submitted','approved','rejected','changes_required') THEN
    RAISE EXCEPTION 'Invalid verification status %', NEW.status;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER kyc_validate BEFORE INSERT OR UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.kyc_validate();

CREATE OR REPLACE FUNCTION public.kyc_sync_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET verification_status = CASE NEW.status
      WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected'
      WHEN 'changes_required' THEN 'changes_required' ELSE 'submitted' END,
    status = CASE WHEN NEW.status='approved' AND status='suspended' THEN 'active' ELSE status END
  WHERE id = NEW.user_id;
  RETURN NEW;
END $$;

-- Members may only submit when verification is open (not submitted / approved)
CREATE POLICY "kyc submit only when open" ON public.kyc_submissions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND verification_status IN ('not_submitted','rejected','changes_required')));

-- ===== Security: unused bootstrap helpers no longer callable from the app =====
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transactions_activate(), public.transactions_validate(), public.kyc_validate() FROM PUBLIC, anon, authenticated;