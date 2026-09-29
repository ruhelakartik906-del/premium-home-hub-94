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

async function createMember(m: Member, opts: { byAdmin: boolean; payment?: { method: string; status: string } }) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: m.email, password: m.password, email_confirm: true, user_metadata: { full_name: m.full_name, role: m.role },
  });
  if (error || !created.user) {
    const msg = error?.message?.toLowerCase().includes('already') ? 'An account with this email already exists.' : 'Could not create the account. Please try again.';
    return { ok: false as const, error: msg };
  }
  const id = created.user.id;
  await supabaseAdmin.from('user_roles').insert({ user_id: id, role: m.role });
  const { password: _pw, role, dob, ...rest } = m;
  await supabaseAdmin.from('profiles').insert({ id, ...rest, dob: dob || null, account_type: role, created_by_admin: opts.byAdmin });
  if (opts.payment) {
    await supabaseAdmin.from('transactions').insert({ user_id: id, amount: ACTIVATION_FEE, purpose: 'activation', method: opts.payment.method, status: opts.payment.status, payer_name: m.full_name, payer_email: m.email });
  }
  await supabaseAdmin.from('notifications').insert({ user_id: id, title: 'Welcome to Eliteoz', body: 'Your membership is active. Please complete verification within 7 days to keep your account active.' });
  return { ok: true as const, userId: id };
}

// Public signup: test-mode activation payment is recorded as successful.
export const registerMember = createServerFn({ method: 'POST' })
  .inputValidator((d) => memberSchema.extend({ paymentMethod: z.enum(['test_card', 'test_upi', 'test_netbanking']) }).parse(d))
  .handler(async ({ data }) => {
    const { paymentMethod, ...m } = data;
    return createMember(m, { byAdmin: false, payment: { method: paymentMethod, status: 'success' } });
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
