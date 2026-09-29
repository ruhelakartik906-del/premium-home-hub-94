import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const EVENTS = ['user.registered', 'user.otp_verified', 'user.payment_pending', 'user.payment_success', 'user.payment_failed', 'user.login', 'user.suspended', 'user.activated', 'user.deleted'] as const;
const bodySchema = z.object({
  event_id: z.string().trim().min(1).max(200),
  event: z.enum(EVENTS),
  source: z.string().max(80).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute('/api/public/webhooks/n8n')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['N8N_WEBHOOK_SECRET'];
        if (!secret) return json(503, { ok: false, error: 'Webhook not configured' });
        const given = request.headers.get('x-webhook-secret') ?? '';
        if (!safeEqual(given, secret)) return json(401, { ok: false, error: 'Unauthorized' });
        const raw = await request.text();
        if (raw.length > 100_000) return json(413, { ok: false, error: 'Payload too large' });
        let parsed: z.infer<typeof bodySchema>;
        try { parsed = bodySchema.parse(JSON.parse(raw)); } catch { return json(400, { ok: false, error: 'Invalid payload', allowed_events: EVENTS }); }
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { error } = await supabaseAdmin.from('webhook_events').insert({ event_id: parsed.event_id, event_type: parsed.event, source: parsed.source ?? 'n8n', payload: (parsed.data ?? {}) as never });
        if (error?.code === '23505') return json(200, { ok: true, duplicate: true });
        if (error) { console.error('webhook insert failed', error.message); return json(500, { ok: false, error: 'Could not store event' }); }
        await supabaseAdmin.from('webhook_endpoints').update({ last_event_at: new Date().toISOString(), last_success_at: new Date().toISOString() }).eq('id', 'n8n');
        return json(202, { ok: true });
      },
    },
  },
});
