ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS platform_name text NOT NULL DEFAULT 'Eliteoz',
  ADD COLUMN IF NOT EXISTS platform_email text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_status text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS otp_expiry_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS otp_resend_seconds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS otp_max_attempts integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS smtp_port integer,
  ADD COLUMN IF NOT EXISTS smtp_username text,
  ADD COLUMN IF NOT EXISTS smtp_security text NOT NULL DEFAULT 'tls',
  ADD COLUMN IF NOT EXISTS smtp_from_name text,
  ADD COLUMN IF NOT EXISTS smtp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_provider text,
  ADD COLUMN IF NOT EXISTS whatsapp_api_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_matrix jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_timeout_minutes integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS max_upload_mb integer NOT NULL DEFAULT 10;

ALTER TABLE public.gateway_secrets
  ADD COLUMN IF NOT EXISTS smtp_password text,
  ADD COLUMN IF NOT EXISTS whatsapp_access_token text,
  ADD COLUMN IF NOT EXISTS whatsapp_verify_token text,
  ADD COLUMN IF NOT EXISTS whatsapp_webhook_secret text;

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id text PRIMARY KEY,
  provider text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  endpoint text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  last_event_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhooks" ON public.webhook_endpoints FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins toggle webhooks" ON public.webhook_endpoints FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.webhook_endpoints (id, provider, events, endpoint) VALUES
 ('razorpay','Razorpay', ARRAY['payment.captured','payment.failed','order.paid'], '/api/public/razorpay-webhook'),
 ('whatsapp','WhatsApp', ARRAY['messages','message_status'], '/api/public/whatsapp-webhook (not built yet)')
ON CONFLICT (id) DO NOTHING;