import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { mobileSchema, generateOtp, generateToken, sha256, otpHash, deliverOtp, OTP_SECONDS, RESEND_SECONDS } from '@/lib/otp-security';

type OtpResult = { ok: boolean; error?: string; retryAfter?: number; expired?: boolean };
const emailSchema = z.string().trim().email().max(200).transform((value) => value.toLowerCase());

export const sendOtp = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ mobile: mobileSchema, email: emailSchema }).parse(input))
  .handler(async ({ data }) => {
    const authkey = process.env['APITXT_AUTHKEY'];
    if (!authkey) return { ok: false as const, error: 'SMS service is not configured. Please try again later.' };
    try {
      const { findExistingAccount, DUP_MESSAGES } = await import('@/lib/otp.server');
      const existing = await findExistingAccount(data.email, data.mobile);
      if (existing) return { ok: false as const, duplicate: existing, error: DUP_MESSAGES[existing] };
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const otp = generateOtp();
      const id = crypto.randomUUID();
      const hash = await otpHash(id, data.email, otp, authkey);
      const { data: reserved, error: reserveError } = await supabaseAdmin.rpc('reserve_registration_otp', { _id: id, _mobile: data.mobile, _email: data.email, _hash: hash });
      if (reserveError || !reserved) return { ok: false as const, error: 'Could not prepare OTP securely. Please try again later.' };
      const reservation = reserved as unknown as OtpResult;
      if (!reservation.ok) return { ok: false as const, error: reservation.error ?? 'Please wait before requesting another OTP.', retryAfter: reservation.retryAfter };
      const delivery = await deliverOtp({ authkey, mobile: data.mobile, otp, templateId: process.env['APITXT_TEMPLATE_ID'] });
      const { data: saved, error: saveError } = await supabaseAdmin.from('otp_verifications').update({ status: delivery.ok ? 'pending' : 'failed' })
        .eq('id', id).eq('status', 'sending').select('expires_at,created_at').maybeSingle();
      if (saveError || !saved) return { ok: false as const, error: 'Could not confirm OTP status. Please request a new OTP after the cooldown.' };
      if (!delivery.ok) return { ok: false as const, error: delivery.error, retryAfter: RESEND_SECONDS };
      const serverNow = Date.now();
      return { ok: true as const, masked: `+91 ••••••${data.mobile.slice(-4)}`, expiresIn: Math.max(0, Math.ceil((new Date(saved.expires_at).getTime() - serverNow) / 1000)), resendIn: Math.max(0, Math.ceil((new Date(saved.created_at).getTime() + RESEND_SECONDS * 1000 - serverNow) / 1000)) };
    } catch {
      return { ok: false as const, error: 'Could not send OTP. Please try again later.' };
    }
  });

export const verifyOtp = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ mobile: mobileSchema, email: emailSchema, otp: z.string().regex(/^\d{6}$/) }).parse(input))
  .handler(async ({ data }) => {
    const authkey = process.env['APITXT_AUTHKEY'];
    if (!authkey) return { ok: false as const, error: 'SMS service is not configured. Please try again later.' };
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: latest, error } = await supabaseAdmin.from('otp_verifications').select('id').eq('mobile', data.mobile).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error || !latest) return { ok: false as const, error: 'Please request an OTP first.' };
      const token = generateToken();
      const { data: result, error: verifyError } = await supabaseAdmin.rpc('verify_registration_otp', { _mobile: data.mobile, _email: data.email, _hash: await otpHash(latest.id, data.email, data.otp, authkey), _token_hash: await sha256(token) });
      if (verifyError || !result) return { ok: false as const, error: 'Could not verify OTP securely. Please try again.' };
      const verification = result as unknown as OtpResult;
      if (!verification.ok) return { ok: false as const, error: verification.error ?? 'Could not verify OTP.', expired: verification.expired };
      return { ok: true as const, token };
    } catch {
      return { ok: false as const, error: 'Could not verify OTP. Please try again later.' };
    }
  });
