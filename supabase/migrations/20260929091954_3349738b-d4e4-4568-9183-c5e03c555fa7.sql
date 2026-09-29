ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS manual_payment_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS msg91_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS msg91_sender_id text,
  ADD COLUMN IF NOT EXISTS msg91_template_id text;
ALTER TABLE public.gateway_secrets ADD COLUMN IF NOT EXISTS msg91_auth_key text;
CREATE OR REPLACE FUNCTION public.settings_audit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_logs(actor_id,action,details) VALUES (auth.uid(), 'settings_changed:' || TG_TABLE_NAME, to_jsonb(NEW) - 'key_secret' - 'webhook_secret' - 'msg91_auth_key');
  RETURN NEW;
END $function$;