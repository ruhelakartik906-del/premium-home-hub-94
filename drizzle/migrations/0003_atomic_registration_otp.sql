ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS registration_email text;
CREATE INDEX IF NOT EXISTS otp_mobile_created_idx ON public.otp_verifications(mobile, created_at DESC);
GRANT ALL ON public.otp_verifications TO service_role;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.reserve_registration_otp(_id uuid, _mobile text, _email text, _hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE last_at timestamptz; minute_count integer; hour_count integer; t timestamptz := clock_timestamp();
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(_mobile, 0));
 SELECT max(created_at), count(*) FILTER (WHERE created_at > t - interval '1 minute'), count(*) INTO last_at, minute_count, hour_count FROM public.otp_verifications WHERE mobile=_mobile AND created_at > t - interval '1 hour';
 IF last_at IS NOT NULL AND last_at > t - interval '60 seconds' THEN RETURN jsonb_build_object('ok', false, 'retryAfter', greatest(1,ceil(extract(epoch from last_at + interval '60 seconds' - t))::integer), 'error', 'Please wait before requesting a new OTP.'); END IF;
 IF minute_count >= 3 OR hour_count >= 10 THEN RETURN jsonb_build_object('ok', false, 'retryAfter', 3600, 'error', 'Too many OTP requests. Please try again later.'); END IF;
 UPDATE public.otp_verifications SET status='invalidated' WHERE mobile=_mobile AND status IN ('pending','sending','verified');
 INSERT INTO public.otp_verifications(id,mobile,registration_email,otp_hash,expires_at,status,created_at) VALUES (_id,_mobile,lower(trim(_email)),_hash,t + interval '5 minutes','sending',t);
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE OR REPLACE FUNCTION public.verify_registration_otp(_mobile text, _email text, _hash text, _token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.otp_verifications%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(_mobile, 0));
 SELECT * INTO r FROM public.otp_verifications WHERE mobile=_mobile ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR r.registration_email IS DISTINCT FROM lower(trim(_email)) THEN RETURN jsonb_build_object('ok',false,'error','Please request an OTP first.'); END IF;
 IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'error','This OTP is unavailable or already used. Please request a new OTP.'); END IF;
 IF r.expires_at <= clock_timestamp() THEN UPDATE public.otp_verifications SET status='expired' WHERE id=r.id; RETURN jsonb_build_object('ok',false,'expired',true,'error','OTP expired. Please request a new OTP.'); END IF;
 IF r.attempts >= 5 THEN RETURN jsonb_build_object('ok',false,'expired',true,'error','Too many wrong attempts. Please request a new OTP.'); END IF;
 IF r.otp_hash <> _hash THEN
  UPDATE public.otp_verifications SET attempts=attempts+1,status=CASE WHEN attempts+1 >= 5 THEN 'invalidated' ELSE status END WHERE id=r.id;
  RETURN jsonb_build_object('ok',false,'expired',r.attempts+1 >= 5,'error',CASE WHEN r.attempts+1 >= 5 THEN 'Too many wrong attempts. Please request a new OTP.' ELSE 'Invalid OTP. Please try again.' END);
 END IF;
 UPDATE public.otp_verifications SET status='verified', verified_at=clock_timestamp(),verify_token_hash=_token_hash WHERE id=r.id;
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE OR REPLACE FUNCTION public.consume_registration_otp(_mobile text, _email text, _token_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(_mobile, 0));
 UPDATE public.otp_verifications SET status='consumed' WHERE mobile=_mobile AND registration_email=lower(trim(_email)) AND status='verified' AND verify_token_hash=_token_hash AND verified_at > clock_timestamp() - interval '30 minutes' RETURNING id INTO changed;
 RETURN changed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.reserve_registration_otp(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.verify_registration_otp(text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.consume_registration_otp(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_registration_otp(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_registration_otp(text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_registration_otp(text,text,text) TO service_role;