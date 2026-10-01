ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'test_bypass';
ALTER TABLE public.payment_settings ADD CONSTRAINT payment_settings_payment_mode_chk CHECK (payment_mode IN ('test_bypass','live_required'));
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
CREATE OR REPLACE FUNCTION public.transactions_validate()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('created','pending','success','failed','cancelled','refunded','partially_refunded','test_bypass') THEN
    RAISE EXCEPTION 'Invalid payment status %', NEW.status;
  END IF;
  IF NEW.amount < 0 THEN RAISE EXCEPTION 'Amount cannot be negative'; END IF;
  IF TG_OP = 'INSERT' AND NEW.provider = 'offline'
     AND NOT coalesce((SELECT manual_payment_enabled FROM public.platform_settings WHERE id=1), true) THEN
    RAISE EXCEPTION 'Manual payments are switched off in Platform settings';
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.profiles_validate()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('active','suspended','blocked','pending_payment','deactivated') THEN
    RAISE EXCEPTION 'Invalid account status %', NEW.status;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verification_due_at = NEW.activated_at + make_interval(days => (SELECT verification_days FROM public.platform_settings WHERE id=1));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'deactivated' THEN RAISE EXCEPTION 'Deactivated accounts cannot be changed'; END IF;
    IF OLD.status = 'pending_payment' AND NEW.status = 'active' AND NOT EXISTS (
        SELECT 1 FROM public.transactions WHERE user_id = NEW.id AND purpose='activation' AND status IN ('success','test_bypass')) THEN
      RAISE EXCEPTION 'Account cannot be activated before the activation payment is verified';
    END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.transactions_activate()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE days int;
BEGIN
  IF NEW.purpose = 'activation' AND NEW.status IN ('success','test_bypass') AND NEW.user_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('success','test_bypass')) THEN
    SELECT verification_days INTO days FROM public.platform_settings WHERE id=1;
    UPDATE public.profiles SET
      status = CASE WHEN status = 'blocked' THEN status ELSE 'active' END,
      activated_at = now(),
      verification_due_at = CASE WHEN verification_status IN ('approved','submitted') THEN verification_due_at ELSE now() + make_interval(days => days) END
    WHERE id = NEW.user_id;
    INSERT INTO public.notifications(user_id,title,body) VALUES (NEW.user_id,
      CASE WHEN NEW.status='test_bypass' THEN 'Test activation' ELSE 'Payment confirmed' END,
      CASE WHEN NEW.status='test_bypass' THEN 'Your account was activated in testing mode (payment bypassed). A real payment may be required later.'
           ELSE 'Your activation payment (' || NEW.reference || ') has been confirmed. Your account is active.' END);
  END IF;
  RETURN NEW;
END $function$;