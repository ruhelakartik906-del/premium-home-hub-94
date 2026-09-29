CREATE OR REPLACE FUNCTION public.transactions_validate()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('created','pending','success','failed','cancelled','refunded','partially_refunded') THEN
    RAISE EXCEPTION 'Invalid payment status %', NEW.status;
  END IF;
  IF NEW.amount < 0 THEN RAISE EXCEPTION 'Amount cannot be negative'; END IF;
  IF TG_OP = 'INSERT' AND NEW.provider = 'offline'
     AND NOT coalesce((SELECT manual_payment_enabled FROM public.platform_settings WHERE id=1), true) THEN
    RAISE EXCEPTION 'Manual payments are switched off in Platform settings';
  END IF;
  RETURN NEW;
END $function$;