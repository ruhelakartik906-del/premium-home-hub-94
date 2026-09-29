import { createHmac, timingSafeEqual } from 'crypto';

export type GatewayConfig = { enabled: boolean; mode: 'test' | 'live'; keyId: string | null; keySecret: string | null; webhookSecret: string | null; fee: number };

export async function loadGateway(): Promise<GatewayConfig> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [{ data: s }, { data: sec }] = await Promise.all([
    supabaseAdmin.from('payment_settings').select('enabled,mode,key_id,activation_fee').eq('id', 1).maybeSingle(),
    supabaseAdmin.from('gateway_secrets').select('key_secret,webhook_secret').eq('id', 1).maybeSingle(),
  ]);
  return { enabled: !!s?.enabled, mode: s?.mode === 'live' ? 'live' : 'test', keyId: s?.key_id ?? null, keySecret: sec?.key_secret ?? null, webhookSecret: sec?.webhook_secret ?? null, fee: Number(s?.activation_fee ?? 50000) };
}

export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, 'utf8'); const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}
export const hmac = (secret: string, body: string) => createHmac('sha256', secret).update(body).digest('hex');

export async function rzp<T>(cfg: GatewayConfig, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  if (!cfg.keyId || !cfg.keySecret) throw new Error('Razorpay is not configured');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : null,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { console.error('Razorpay error', res.status, json?.error?.description); throw new Error(json?.error?.description ?? `Razorpay ${res.status}`); }
  return json as T;
}

/** Idempotently mark an activation order as paid. Returns true if this call changed it. */
export async function markOrderPaid(orderId: string, paymentId: string, via: 'checkout' | 'webhook') {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('transactions')
    .update({ status: 'success', payment_id: paymentId, verified_via: via, verified_at: new Date().toISOString(), failure_reason: null })
    .eq('order_id', orderId).neq('status', 'success').select('id');
  return (data?.length ?? 0) > 0;
}
