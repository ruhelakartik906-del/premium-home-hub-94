import { supabaseAdmin } from '@/integrations/supabase/client.server';

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Consumes a one-time mobile verification token (valid 30 minutes after OTP verification).
export async function consumeOtpToken(mobile: string, token: string) {
  const digits = mobile.replace(/\D/g, '').slice(-10);
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin.from('otp_verifications').update({ status: 'consumed' })
    .eq('mobile', digits).eq('status', 'verified').eq('verify_token_hash', await sha256(token)).gte('verified_at', since).select('id');
  return !!data?.length;
}

// Finds an existing account by normalized email or mobile. Returns 'active' | 'pending' | null.
export async function findExistingAccount(email: string, mobile: string) {
  const digits = mobile.replace(/\D/g, '').slice(-10);
  const e = email.trim().toLowerCase().replace(/[,()%*]/g, '');
  const { data } = await supabaseAdmin.from('profiles').select('status,email,mobile').or(`email.ilike.${e},mobile.ilike.%${digits}`).limit(10);
  const dup = (data ?? []).find((p) => p.email.toLowerCase() === e || (p.mobile ?? '').replace(/\D/g, '').slice(-10) === digits);
  if (!dup) return null;
  return dup.status === 'pending_payment' ? 'pending' as const : 'active' as const;
}
export const DUP_MESSAGES = {
  active: 'An account already exists with these details. Please log in.',
  pending: 'You already have a registered account. Please log in to continue your activation.',
};
