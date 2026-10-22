import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { mobileSchema, sha256 } from '@/lib/otp-security';

// Consumes a one-time mobile verification token (valid 30 minutes after OTP verification).
export async function consumeOtpToken(mobile: string, email: string, token: string) {
  const { data, error } = await supabaseAdmin.rpc('consume_registration_otp', { _mobile: mobileSchema.parse(mobile), _email: email.trim().toLowerCase(), _token_hash: await sha256(token) });
  if (error) throw new Error('Could not validate registration proof.');
  return data === true;
}

// Finds an existing account by normalized email or mobile. Returns 'active' | 'pending' | null.
export async function findExistingAccount(email: string, mobile: string) {
  const digits = mobileSchema.parse(mobile);
  const e = email.trim().toLowerCase().replace(/[,()%*]/g, '');
  const { data, error } = await supabaseAdmin.from('profiles').select('status,email,mobile').or(`email.ilike.${e},mobile.ilike.%${digits}`).limit(10);
  if (error) throw new Error('Could not check existing account.');
  const dup = (data ?? []).find((p) => p.email.toLowerCase() === e || (p.mobile ?? '').replace(/\D/g, '').slice(-10) === digits);
  if (!dup) return null;
  return dup.status === 'pending_payment' ? 'pending' as const : 'active' as const;
}
export const DUP_MESSAGES = {
  active: 'An account already exists with these details. Please log in.',
  pending: 'You already have a registered account. Please log in to continue your activation.',
};
