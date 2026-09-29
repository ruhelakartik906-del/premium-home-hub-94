import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const mobileSchema = z.string().trim().transform((v) => v.replace(/\D/g, '').slice(-10)).refine((v) => /^[6-9]\d{9}$/.test(v), 'Please enter a valid 10-digit Indian mobile number.');

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomOtp() {
  const a = new Uint32Array(1);
  let n: number;
  do { crypto.getRandomValues(a); n = a[0]!; } while (n >= 4294000000);
  return String(n % 1000000).padStart(6, '0');
}
function randomToken() {
  const a = new Uint8Array(32); crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const sendOtp = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ mobile: mobileSchema }).parse(d))
  .handler(async ({ data }) => {
    const authkey = process.env['APITXT_AUTHKEY'];
    if (!authkey) return { ok: false as const, error: 'SMS service is not configured yet. Please try again later.' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const mobile = data.mobile;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin.from('otp_verifications').select('created_at').eq('mobile', mobile).gte('created_at', since).order('created_at', { ascending: false }).limit(20);
    const rows = recent ?? [];
    const last = rows[0] ? new Date(rows[0].created_at).getTime() : 0;
    if (Date.now() - last < RESEND_MS) return { ok: false as const, error: 'Please wait before requesting a new OTP.', retryAfter: Math.ceil((RESEND_MS - (Date.now() - last)) / 1000) };
    const lastMinute = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 60000).length;
    if (lastMinute >= 3 || rows.length >= 10) return { ok: false as const, error: 'Too many OTP requests. Please try again later.' };

    // Invalidate previous OTPs for this number
    await supabaseAdmin.from('otp_verifications').update({ status: 'invalidated' }).eq('mobile', mobile).eq('status', 'pending');

    const otp = randomOtp();
    const id = crypto.randomUUID();
    const { error: insErr } = await supabaseAdmin.from('otp_verifications').insert({ id, mobile, otp_hash: await sha256(`${id}:${otp}`), expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() });
    if (insErr) { console.error('otp insert failed'); return { ok: false as const, error: 'Could not send OTP. Please try again.' }; }

    let sent = false;
    try {
      const res = await fetch('https://apitxt.com/api/sendOTP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ authkey, mobile: `91${mobile}`, otp, channel: 'sms', country: '91' }).toString(),
      });
      const text = await res.text();
      let status = '';
      try { status = String((JSON.parse(text) as { status?: unknown }).status ?? '').toLowerCase(); } catch { status = ''; }
      sent = res.ok && status === 'success';
      if (!sent) console.error('APITXT send failed', res.status);
    } catch { console.error('APITXT request error'); }

    if (!sent) {
      await supabaseAdmin.from('otp_verifications').update({ status: 'failed' }).eq('id', id);
      return { ok: false as const, error: 'We could not send the OTP right now. Please try again in a minute.' };
    }
    return { ok: true as const, masked: `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`, expiresIn: OTP_TTL_MS / 1000, resendIn: RESEND_MS / 1000 };
  });

export const verifyOtp = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ mobile: mobileSchema, otp: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row } = await supabaseAdmin.from('otp_verifications').select('*').eq('mobile', data.mobile).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!row || row.status === 'failed') return { ok: false as const, error: 'Please request an OTP first.' };
    if (row.status === 'verified') return { ok: false as const, error: 'This OTP has already been used. Please request a new OTP.' };
    if (row.status !== 'pending') return { ok: false as const, error: 'This OTP is no longer valid. Please request a new OTP.', expired: true };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from('otp_verifications').update({ status: 'expired' }).eq('id', row.id);
      return { ok: false as const, error: 'OTP expired. Please request a new OTP.', expired: true };
    }
    if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: 'Too many wrong attempts. Please request a new OTP.', expired: true };
    const match = (await sha256(`${row.id}:${data.otp}`)) === row.otp_hash;
    if (!match) {
      const attempts = row.attempts + 1;
      await supabaseAdmin.from('otp_verifications').update({ attempts, ...(attempts >= MAX_ATTEMPTS ? { status: 'invalidated' } : {}) }).eq('id', row.id);
      return attempts >= MAX_ATTEMPTS
        ? { ok: false as const, error: 'Too many wrong attempts. Please request a new OTP.', expired: true }
        : { ok: false as const, error: `Invalid OTP. Please try again. (${MAX_ATTEMPTS - attempts} attempts left)` };
    }
    const token = randomToken();
    const { data: upd } = await supabaseAdmin.from('otp_verifications').update({ status: 'verified', verified_at: new Date().toISOString(), verify_token_hash: await sha256(token) }).eq('id', row.id).eq('status', 'pending').select('id');
    if (!upd?.length) return { ok: false as const, error: 'This OTP has already been used. Please request a new OTP.' };
    return { ok: true as const, token };
  });

