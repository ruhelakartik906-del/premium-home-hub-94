import { z } from 'zod';

export const OTP_SECONDS = 300;
export const RESEND_SECONDS = 60;
export const mobileSchema = z.string().trim().max(20).transform((value) => {
  if (!/^[+\d\s-]+$/.test(value)) return '';
  const digits = value.replace(/[\s+-]/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}).refine((value) => /^[6-9]\d{9}$/.test(value), 'Enter an Indian mobile number with optional +91 country code.');

export function generateOtp() {
  const values = new Uint32Array(1);
  let number = 0;
  do { crypto.getRandomValues(values); number = values[0] ?? 0; } while (number >= 4294000000);
  return String(number % 1000000).padStart(6, '0');
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function otpHash(id: string, email: string, otp: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}:${email.trim().toLowerCase()}:${otp}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Never expose or log the response body: providers can echo credentials or codes.
export async function deliverOtp(input: { authkey: string; mobile: string; otp: string; templateId?: string }, fetcher: typeof fetch = fetch) {
  const parameters = new URLSearchParams({ authkey: input.authkey, mobile: `91${input.mobile}`, otp: input.otp, channel: 'sms' });
  if (input.templateId) parameters.set('template_id', input.templateId);
  try {
    const response = await fetcher('https://apitxt.com/api/sendOTP', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: parameters.toString(), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { ok: false as const, error: 'SMS provider rejected the request. Please try again later.' };
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('status' in body) || String(body.status).toLowerCase() !== 'success') {
      return { ok: false as const, error: 'The SMS request was not accepted. Please try again later.' };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'SMS service did not respond. Please wait before trying again.' };
  }
}