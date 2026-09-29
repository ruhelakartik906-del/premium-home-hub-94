import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const PERMISSIONS = [
  ['view_users', 'View users'], ['edit_users', 'Edit users'], ['suspend_users', 'Suspend users'], ['activate_users', 'Activate users'],
  ['manage_payments', 'Manage payments'], ['view_transactions', 'View transactions'], ['view_properties', 'View properties'], ['manage_properties', 'Manage properties'],
  ['view_documents', 'View documents'], ['manage_documents', 'Manage documents'], ['manage_notifications', 'Send notifications'],
  ['view_audit_logs', 'View audit logs'], ['manage_settings', 'Manage settings'], ['manage_webhooks', 'Manage webhooks'],
] as const;
const permKeys = PERMISSIONS.map((p) => p[0]) as [string, ...string[]];

type Ctx = { supabase: { rpc: (fn: 'has_permission' | 'has_role', args: never) => PromiseLike<{ data: unknown }> }; userId: string };
async function can(ctx: Ctx, perm: string) {
  const { data } = await ctx.supabase.rpc('has_permission', { _user_id: ctx.userId, _perm: perm } as never);
  return data === true;
}
async function isMaster(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc('has_role', { _user_id: ctx.userId, _role: 'admin' } as never);
  return data === true;
}
async function audit(actor: string, target: string | null, action: string, details: Record<string, unknown>) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  await supabaseAdmin.from('audit_logs').insert({ actor_id: actor, target_user_id: target, action, details: details as never });
}
const deny = (msg = 'You do not have permission for this action.') => ({ ok: false as const, error: msg });

async function targetIsAdmin(id: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', id);
  return (data ?? []).some((r) => r.role === 'admin');
}

export const adminUpdateUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(),
    full_name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    mobile: z.string().trim().regex(/^[0-9+\- ]{8,16}$/),
    account_type: z.enum(['buyer', 'seller']),
    verification_status: z.enum(['not_submitted', 'submitted', 'approved', 'rejected', 'changes_required']),
    mobile_verified: z.boolean(),
    city: z.string().max(80).optional(), state: z.string().max(80).optional(), country: z.string().max(80).optional(),
    address: z.string().max(400).optional(), pincode: z.string().max(12).optional(),
    company_name: z.string().max(160).optional(), business_type: z.string().max(80).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await can(context as never, 'edit_users'))) return deny();
    if (await targetIsAdmin(data.userId)) return deny('Master Admin accounts are managed separately.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data: before } = await db.from('profiles').select('*').eq('id', data.userId).maybeSingle();
    if (!before) return deny('User not found.');
    if (before.status === 'deactivated') return deny('Deactivated accounts cannot be edited.');
    const n = (v?: string) => (v && v.trim() ? v.trim() : null);
    if (data.email.toLowerCase() !== before.email.toLowerCase()) {
      const { error } = await db.auth.admin.updateUserById(data.userId, { email: data.email, email_confirm: true });
      if (error) return deny(error.message.toLowerCase().includes('already') ? 'Another account already uses this email.' : 'Could not update the email.');
    }
    const patch = { full_name: data.full_name, email: data.email, mobile: data.mobile, account_type: data.account_type, verification_status: data.verification_status, mobile_verified: data.mobile_verified, city: n(data.city), state: n(data.state), country: n(data.country), address: n(data.address), pincode: n(data.pincode), company_name: n(data.company_name), business_type: n(data.business_type) };
    const { error } = await db.from('profiles').update(patch).eq('id', data.userId);
    if (error) return deny(error.code === '23505' ? 'Another account already uses this email or mobile.' : 'Could not save changes.');
    if (data.account_type !== before.account_type) {
      await db.from('user_roles').delete().eq('user_id', data.userId).in('role', ['buyer', 'seller']);
      await db.from('user_roles').insert({ user_id: data.userId, role: data.account_type });
    }
    const changed = Object.fromEntries(Object.entries(patch).filter(([k, v]) => (before as Record<string, unknown>)[k] !== v).map(([k, v]) => [k, [(before as Record<string, unknown>)[k], v]]));
    await audit(context.userId, data.userId, 'user_edited', changed);
    return { ok: true as const };
  });

export const adminSetStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), status: z.enum(['active', 'suspended']), reason: z.string().trim().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await can(context as never, data.status === 'active' ? 'activate_users' : 'suspend_users'))) return deny();
    if (await targetIsAdmin(data.userId)) return deny('Master Admin accounts cannot be suspended here.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data: p } = await db.from('profiles').select('status').eq('id', data.userId).maybeSingle();
    if (!p) return deny('User not found.');
    if (data.status === 'active' && p.status === 'pending_payment') return deny('This member has not paid yet. Mark the payment as paid to activate the account.');
    const patch: { status: string; verification_due_at?: string } = { status: data.status };
    if (data.status === 'active') { const { data: cfg } = await db.from('platform_settings').select('verification_days').eq('id', 1).maybeSingle(); patch.verification_due_at = new Date(Date.now() + (cfg?.verification_days ?? 7) * 86400000).toISOString(); }
    const { error } = await db.from('profiles').update(patch).eq('id', data.userId);
    if (error) return deny('Could not update the account status.');
    if (data.status === 'suspended') await db.auth.admin.signOut(data.userId).catch(() => null);
    await db.from('notifications').insert({ user_id: data.userId, title: data.status === 'active' ? 'Account reactivated' : 'Account suspended', body: data.status === 'active' ? 'Your Eliteoz account is active again.' : `Your account has been suspended.${data.reason ? ` Reason: ${data.reason}` : ''} Please contact support.` });
    await audit(context.userId, data.userId, data.status === 'active' ? 'user_activated' : 'user_suspended', { reason: data.reason ?? null });
    return { ok: true as const };
  });

export const adminSetPayment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), mark: z.enum(['paid', 'unpaid']),
    amount: z.number().min(0).max(100000000).optional(), reference: z.string().trim().max(120).optional(),
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), notes: z.string().trim().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await can(context as never, 'manage_payments'))) return deny();
    if (await targetIsAdmin(data.userId)) return deny('Not applicable to Master Admin accounts.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data: p } = await db.from('profiles').select('full_name,email,account_type,status').eq('id', data.userId).maybeSingle();
    if (!p) return deny('User not found.');
    if (data.mark === 'paid') {
      const { data: fee } = await db.from('payment_settings').select('activation_fee').eq('id', 1).maybeSingle();
      const { error } = await db.from('transactions').insert({ user_id: data.userId, amount: data.amount ?? Number(fee?.activation_fee ?? 50000), purpose: 'activation', method: 'manual', status: 'success', provider: 'manual', verified_via: 'master_admin', verified_by: context.userId, verified_at: new Date().toISOString(), recorded_by: context.userId, account_role: p.account_type, payer_name: p.full_name, payer_email: p.email, payment_id: data.reference || null, payment_date: data.payment_date || null, notes: data.notes || 'Marked paid by admin' });
      if (error) { console.error('manual payment failed', error.message); return deny('Could not record the payment.'); }
    } else {
      await db.from('transactions').update({ status: 'cancelled', notes: data.notes || 'Marked unpaid by admin' }).eq('user_id', data.userId).eq('purpose', 'activation').eq('status', 'success');
      if (p.status !== 'deactivated') await db.from('profiles').update({ status: 'pending_payment' }).eq('id', data.userId);
      await db.auth.admin.signOut(data.userId).catch(() => null);
    }
    await audit(context.userId, data.userId, 'payment_manually_updated', { mark: data.mark, amount: data.amount ?? null, reference: data.reference ?? null, payment_date: data.payment_date ?? null });
    return { ok: true as const };
  });

// ---------- Staff & permissions (Master Admin only) ----------
export const listStaff = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isMaster(context as never))) return { ok: false as const, error: 'Only the Master Admin can manage staff.', staff: [] };
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data } = await db.from('staff_members').select('*').order('created_at', { ascending: false });
    return { ok: true as const, staff: data ?? [] };
  });

export const createStaff = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ full_name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), password: z.string().min(8).max(72), permissions: z.array(z.enum(permKeys)).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isMaster(context as never))) return deny('Only the Master Admin can create staff.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data: created, error } = await db.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.full_name, staff: true } });
    if (error || !created.user) return deny(error?.message?.toLowerCase().includes('already') ? 'An account with this email already exists.' : 'Could not create the staff account.');
    const { error: e2 } = await db.from('staff_members').insert({ user_id: created.user.id, full_name: data.full_name, email: data.email, permissions: data.permissions, created_by: context.userId });
    if (e2) { await db.auth.admin.deleteUser(created.user.id); return deny('Could not create the staff account.'); }
    await audit(context.userId, created.user.id, 'staff_created', { email: data.email, permissions: data.permissions });
    return { ok: true as const };
  });

export const updateStaff = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), active: z.boolean(), permissions: z.array(z.enum(permKeys)).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isMaster(context as never))) return deny('Only the Master Admin can change staff permissions.');
    if (data.userId === context.userId) return deny('You cannot change your own permissions.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data: before } = await db.from('staff_members').select('active,permissions').eq('user_id', data.userId).maybeSingle();
    if (!before) return deny('Staff member not found.');
    const { error } = await db.from('staff_members').update({ active: data.active, permissions: data.permissions }).eq('user_id', data.userId);
    if (error) return deny('Could not save.');
    if (!data.active) await db.auth.admin.signOut(data.userId).catch(() => null);
    await audit(context.userId, data.userId, 'staff_permissions_changed', { active: [before.active, data.active], permissions: [before.permissions, data.permissions] });
    return { ok: true as const };
  });

// Records sign-in / sign-out events for the audit log.
export const recordAuthEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ event: z.enum(['login', 'logout']) }).parse(d))
  .handler(async ({ data, context }) => {
    const { getRequestHeader } = await import('@tanstack/react-start/server');
    await audit(context.userId, context.userId, data.event, { user_agent: (getRequestHeader('user-agent') ?? '').slice(0, 200) });
    return { ok: true as const };
  });
