import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const mask = (v: string | null) => (v ? `${'•'.repeat(8)}${v.slice(-4)}` : null);

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc('has_role', { _user_id: ctx.userId, _role: 'admin' });
  if (!data) throw new Error('Forbidden');
}

export const getGatewayStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { loadGateway } = await import('./razorpay.server');
    const c = await loadGateway();
    return { enabled: c.enabled, mode: c.mode, keyId: c.keyId, fee: c.fee, secretMasked: mask(c.keySecret), webhookMasked: mask(c.webhookSecret) };
  });

export const saveGatewaySettings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    enabled: z.boolean(), mode: z.enum(['test', 'live']), keyId: z.string().trim().max(64).regex(/^(rzp_(test|live)_[A-Za-z0-9]+)?$/, 'Key ID must start with rzp_test_ or rzp_live_'),
    fee: z.number().min(1).max(10000000), keySecret: z.string().trim().max(128).optional(), webhookSecret: z.string().trim().max(256).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.keyId && !data.keyId.startsWith(`rzp_${data.mode}_`)) return { ok: false as const, error: `Key ID does not match ${data.mode} mode.` };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { loadGateway } = await import('./razorpay.server');
    const cur = await loadGateway();
    if (data.enabled && (!data.keyId || !(data.keySecret || cur.keySecret))) return { ok: false as const, error: 'Add the Key ID and Key Secret before switching payments on.' };
    const { error } = await context.supabase.from('payment_settings').update({ enabled: data.enabled, provider: 'razorpay', mode: data.mode, key_id: data.keyId || null, activation_fee: data.fee, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) return { ok: false as const, error: 'Could not save settings.' };
    const patch: { key_secret?: string; webhook_secret?: string; updated_at: string } = { updated_at: new Date().toISOString() };
    if (data.keySecret) patch.key_secret = data.keySecret; if (data.webhookSecret) patch.webhook_secret = data.webhookSecret;
    const { error: e2 } = await supabaseAdmin.from('gateway_secrets').upsert({ id: 1, ...patch });
    if (e2) return { ok: false as const, error: 'Could not save secrets.' };
    return { ok: true as const };
  });

/** Creates a Razorpay order for the signed-in member's activation fee. */
export const createActivationOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { loadGateway, rzp } = await import('./razorpay.server');
    const { data: p } = await supabaseAdmin.from('profiles').select('full_name,email,mobile,status,account_type').eq('id', context.userId).maybeSingle();
    if (!p) return { ok: false as const, error: 'Profile not found.' };
    if (p.status !== 'pending_payment') return { ok: false as const, error: 'Your account does not need an activation payment.' };
    const { data: paid } = await supabaseAdmin.from('transactions').select('id').eq('user_id', context.userId).eq('purpose', 'activation').eq('status', 'success').limit(1);
    if (paid?.length) return { ok: false as const, error: 'Your activation payment is already confirmed. Please refresh the page.' };
    const cfg = await loadGateway();
    if (!cfg.enabled || !cfg.keyId || !cfg.keySecret) return { ok: false as const, error: 'Online payment is not available right now. Please contact the Eliteoz team.' };
    const amount = Math.round(cfg.fee * 100);
    let order: { id: string; amount: number; currency: string };
    try { order = await rzp(cfg, '/orders', { method: 'POST', body: { amount, currency: 'INR', receipt: `act_${context.userId.slice(0, 8)}_${Date.now()}`, notes: { user_id: context.userId, purpose: 'activation' } } }); }
    catch { return { ok: false as const, error: 'Could not start the payment. Please try again.' }; }
    const { error } = await supabaseAdmin.from('transactions').insert({ user_id: context.userId, amount: cfg.fee, currency: 'INR', purpose: 'activation', method: 'razorpay', provider: 'razorpay', status: 'created', order_id: order.id, environment: cfg.mode, account_role: p.account_type, payer_name: p.full_name, payer_email: p.email });
    if (error) { console.error(error.message); return { ok: false as const, error: 'Could not record the payment.' }; }
    return { ok: true as const, keyId: cfg.keyId, orderId: order.id, amount: order.amount, currency: order.currency, name: p.full_name, email: p.email, mobile: p.mobile ?? '', mode: cfg.mode };
  });

export const verifyActivationPayment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().max(64), paymentId: z.string().max(64), signature: z.string().max(256) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { loadGateway, rzp, hmac, safeEqualHex, markOrderPaid } = await import('./razorpay.server');
    const { data: t } = await supabaseAdmin.from('transactions').select('id,status,amount,currency,user_id').eq('order_id', data.orderId).maybeSingle();
    if (!t || t.user_id !== context.userId) return { ok: false as const, error: 'Payment not found.' };
    if (t.status === 'success') return { ok: true as const, already: true };
    const cfg = await loadGateway();
    if (!cfg.keySecret) return { ok: false as const, error: 'Payment gateway is not configured.' };
    if (!safeEqualHex(hmac(cfg.keySecret, `${data.orderId}|${data.paymentId}`), data.signature)) return { ok: false as const, error: 'Payment signature is invalid.' };
    try {
      const pay = await rzp<{ order_id: string; amount: number; currency: string; status: string }>(cfg, `/payments/${encodeURIComponent(data.paymentId)}`);
      if (pay.order_id !== data.orderId || pay.amount !== Math.round(Number(t.amount) * 100) || pay.currency !== t.currency || !['captured', 'authorized'].includes(pay.status))
        return { ok: false as const, error: 'Payment details do not match the order.' };
      if (pay.status === 'authorized') await rzp(cfg, `/payments/${encodeURIComponent(data.paymentId)}/capture`, { method: 'POST', body: { amount: pay.amount, currency: pay.currency } }).catch(() => undefined);
    } catch { return { ok: false as const, error: 'Could not confirm the payment with Razorpay. If money was debited it will be confirmed automatically.' }; }
    await markOrderPaid(data.orderId, data.paymentId, 'checkout');
    return { ok: true as const, already: false };
  });

export const reportPaymentFailure = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().max(64), reason: z.string().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('transactions').update({ status: 'failed', failure_reason: data.reason }).eq('order_id', data.orderId).eq('user_id', context.userId).in('status', ['created', 'pending']);
    return { ok: true as const };
  });

/** Permanently deactivates a member: terminal status, sign-in disabled, audited with reason. */
export const adminDeactivateUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) return { ok: false as const, error: 'You cannot deactivate your own account.' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: isTargetAdmin } = await supabaseAdmin.from('user_roles').select('id').eq('user_id', data.userId).eq('role', 'admin').maybeSingle();
    if (isTargetAdmin) return { ok: false as const, error: 'Admin accounts cannot be deactivated here.' };
    const { error } = await supabaseAdmin.from('profiles').update({ status: 'deactivated' }).eq('id', data.userId);
    if (error) return { ok: false as const, error: 'Could not deactivate this account.' };
    await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: '876000h' });
    await supabaseAdmin.from('audit_logs').insert({ actor_id: context.userId, target_user_id: data.userId, action: 'account_deactivated', details: { reason: data.reason } });
    return { ok: true as const };
  });

/** MSG91 SMS key status (masked) — admin only. */
export const getSmsKeyStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data } = await supabaseAdmin.from('gateway_secrets').select('msg91_auth_key').eq('id', 1).maybeSingle();
    return { masked: mask(data?.msg91_auth_key ?? null) };
  });

export const saveSmsKey = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ authKey: z.string().trim().min(10).max(128) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('gateway_secrets').upsert({ id: 1, msg91_auth_key: data.authKey, updated_at: new Date().toISOString() });
    if (error) return { ok: false as const, error: 'Could not save the SMS key.' };
    await supabaseAdmin.from('audit_logs').insert({ actor_id: context.userId, action: 'settings_changed:sms_key', details: { updated: true } });
    return { ok: true as const };
  });

const SECRET_FIELDS = ['smtp_password', 'whatsapp_access_token', 'whatsapp_verify_token', 'whatsapp_webhook_secret'] as const;

export const getIntegrationSecretStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data } = await supabaseAdmin.from('gateway_secrets').select('smtp_password,whatsapp_access_token,whatsapp_verify_token,whatsapp_webhook_secret,msg91_auth_key,key_secret,webhook_secret').eq('id', 1).maybeSingle();
    const d = (data ?? {}) as Record<string, string | null>;
    return Object.fromEntries(['msg91_auth_key', 'key_secret', 'webhook_secret', ...SECRET_FIELDS].map((k) => [k, mask(d[k] ?? null)])) as Record<string, string | null>;
  });

export const saveIntegrationSecrets = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    smtp_password: z.string().trim().min(4).max(256).optional(),
    whatsapp_access_token: z.string().trim().min(10).max(1024).optional(),
    whatsapp_verify_token: z.string().trim().min(8).max(256).optional(),
    whatsapp_webhook_secret: z.string().trim().min(16).max(256).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v));
    if (!Object.keys(patch).length) return { ok: true as const };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('gateway_secrets').upsert({ id: 1, ...patch, updated_at: new Date().toISOString() });
    if (error) return { ok: false as const, error: 'Could not save private keys.' };
    await supabaseAdmin.from('audit_logs').insert({ actor_id: context.userId, action: 'settings_changed:secrets', details: { fields: Object.keys(patch) } });
    return { ok: true as const };
  });
