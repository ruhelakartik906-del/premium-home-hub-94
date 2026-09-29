import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const ACTIVATION_FEE = 50000;

const memberSchema = z.object({
  role: z.enum(['buyer', 'seller']),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72),
  mobile: z.string().trim().regex(/^[0-9+\- ]{8,16}$/),
  dob: z.string().max(20).optional().or(z.literal('')),
  gender: z.string().max(30).optional(),
  country: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  address: z.string().max(400).optional(),
  pincode: z.string().max(12).optional(),
  company_name: z.string().max(160).optional(),
  business_type: z.string().max(80).optional(),
});
type Member = z.infer<typeof memberSchema>;

async function createMember(m: Member, opts: { byAdmin: boolean; pendingPayment?: boolean; payment?: { method: string; status: string } | undefined }) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: m.email, password: m.password, email_confirm: true, user_metadata: { full_name: m.full_name, role: m.role },
  });
  if (error || !created.user) {
    console.error('createMember failed', error?.message);
    const m = error?.message?.toLowerCase() ?? ''; const msg = m.includes('already') ? 'An account with this email already exists.' : m.includes('weak') || m.includes('password') ? 'This password is too common. Please choose a stronger password.' : 'Could not create the account. Please try again.';
    return { ok: false as const, error: msg };
  }
  const id = created.user.id;
  await supabaseAdmin.from('user_roles').insert({ user_id: id, role: m.role });
  const n = (v?: string) => (v && v.trim() ? v.trim() : null);
  await supabaseAdmin.from('profiles').insert({ id, full_name: m.full_name, email: m.email, mobile: m.mobile, dob: n(m.dob), gender: n(m.gender), country: n(m.country), state: n(m.state), city: n(m.city), address: n(m.address), pincode: n(m.pincode), company_name: n(m.company_name), business_type: n(m.business_type), account_type: m.role, created_by_admin: opts.byAdmin, ...(opts.pendingPayment ? { status: 'pending_payment' } : {}) });
  if (opts.payment) {
    await supabaseAdmin.from('transactions').insert({ user_id: id, amount: Number((await supabaseAdmin.from('payment_settings').select('activation_fee').eq('id', 1).maybeSingle()).data?.activation_fee ?? ACTIVATION_FEE), purpose: 'activation', method: opts.payment.method, status: opts.payment.status, provider: 'offline', verified_via: 'offline', account_role: m.role, notes: 'Recorded by Master Admin (offline/manual payment)', payer_name: m.full_name, payer_email: m.email });
  }
  await supabaseAdmin.from('notifications').insert({ user_id: id, title: 'Welcome to Eliteoz', body: opts.pendingPayment ? 'Complete your activation payment to open your membership.' : 'Your membership is active. Please complete verification within 7 days to keep your account active.' });
  return { ok: true as const, userId: id };
}

// Public signup. Every self-registered account starts in 'pending_payment' and is
// activated only by a verified payment (server-side signature/webhook or admin record).
export const registerMember = createServerFn({ method: 'POST' })
  .inputValidator((d) => memberSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const digits = data.mobile.replace(/\D/g, '').slice(-10);
    const { data: existing } = await supabaseAdmin.from('profiles').select('status,email,mobile')
      .or(`email.ilike.${data.email.replace(/[,()%*]/g, '')},mobile.ilike.%${digits}`).limit(5);
    const dup = (existing ?? []).find((p) => p.email.toLowerCase() === data.email.toLowerCase() || (p.mobile ?? '').replace(/\D/g, '').slice(-10) === digits);
    if (dup) {
      const pending = dup.status === 'pending_payment';
      return { ok: false as const, duplicate: pending ? 'pending' as const : 'active' as const, error: pending ? 'You already have an account. Please login to continue your registration.' : 'You already have an active account. Please login.' };
    }
    const r = await createMember(data, { byAdmin: false, pendingPayment: true });
    return r.ok ? { ...r, needsPayment: true } : r;
  });

export const adminCreateUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => memberSchema.extend({ recordPayment: z.enum(['none', 'offline_paid', 'waived']) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!isAdmin) return { ok: false as const, error: 'Only a Master Admin can create users.' };
    const { recordPayment, ...m } = data;
    return createMember(m, { byAdmin: true, payment: recordPayment === 'none' ? undefined : { method: recordPayment === 'waived' ? 'waived' : 'offline', status: 'success' } });
  });
