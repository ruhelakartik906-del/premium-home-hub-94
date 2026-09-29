import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/razorpay-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get('x-razorpay-signature') ?? '';
        const { loadGateway, hmac, safeEqualHex, markOrderPaid } = await import('@/lib/razorpay.server');
        const cfg = await loadGateway();
        if (!cfg.webhookSecret || !sig || !safeEqualHex(hmac(cfg.webhookSecret, body), sig)) return new Response('Invalid signature', { status: 401 });
        let evt: any; try { evt = JSON.parse(body); } catch { return new Response('Bad JSON', { status: 400 }); }
        const pay = evt?.payload?.payment?.entity; const refund = evt?.payload?.refund?.entity;
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        if ((evt.event === 'payment.captured' || evt.event === 'order.paid') && pay?.order_id) {
          const { data: t } = await supabaseAdmin.from('transactions').select('amount,currency').eq('order_id', pay.order_id).maybeSingle();
          if (t && Math.round(Number(t.amount) * 100) === pay.amount && t.currency === pay.currency) await markOrderPaid(pay.order_id, pay.id, 'webhook');
        } else if (evt.event === 'payment.failed' && pay?.order_id) {
          await supabaseAdmin.from('transactions').update({ status: 'failed', failure_reason: String(pay.error_description ?? 'Payment failed').slice(0, 300) }).eq('order_id', pay.order_id).in('status', ['created', 'pending']);
        } else if (evt.event === 'refund.processed' && refund?.payment_id) {
          const { data: t } = await supabaseAdmin.from('transactions').select('amount').eq('payment_id', refund.payment_id).maybeSingle();
          if (t) await supabaseAdmin.from('transactions').update({ status: refund.amount >= Math.round(Number(t.amount) * 100) ? 'refunded' : 'partially_refunded' }).eq('payment_id', refund.payment_id);
        }
        return new Response('ok');
      },
    },
  },
});
