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

// Public signup. If the Master Admin has switched on Razorpay, the account starts in
// 'pending_payment' and is activated only after server-side payment verification.
export const registerMember = createServerFn({ method: 'POST' })
  .inputValidator((d) => memberSchema.parse(d))
  .handler(async ({ data }) => {
    const { loadGateway } = await import('./razorpay.server');
    const cfg = await loadGateway();
    const needsPay = cfg.enabled && !!cfg.keyId && !!cfg.keySecret;
    const r = await createMember(data, { byAdmin: false, pendingPayment: needsPay });
    return r.ok ? { ...r, needsPayment: needsPay } : r;
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
