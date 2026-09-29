CREATE OR REPLACE FUNCTION public.profiles_validate()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('active','suspended','blocked','pending_payment') THEN
    RAISE EXCEPTION 'Invalid account status %', NEW.status;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verification_due_at = NEW.activated_at + make_interval(days => (SELECT verification_days FROM public.platform_settings WHERE id=1));
  END IF;
  RETURN NEW;
END $function$;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS environment text, ADD COLUMN IF NOT EXISTS account_role text, ADD COLUMN IF NOT EXISTS verified_via text;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_order_id_uniq ON public.transactions(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_payment_id_uniq ON public.transactions(payment_id) WHERE payment_id IS NOT NULL;

-- Razorpay secrets: server-only. No signed-in user (not even admin) can read them directly.
DROP POLICY IF EXISTS "gw secrets admin" ON public.gateway_secrets;
REVOKE ALL ON public.gateway_secrets FROM anon, authenticated;
GRANT ALL ON public.gateway_secrets TO service_role;
INSERT INTO public.gateway_secrets(id) VALUES (1) ON CONFLICT DO NOTHING;