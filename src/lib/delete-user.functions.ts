import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Permanent deletion — runs as the signed-in Master Admin. Authorization and the
// full delete happen inside a protected database function, so no private
// server key is needed (works on any hosting).
export const adminDeleteUserPermanently = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), confirm: z.literal('DELETE'), reason: z.string().trim().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: isAdmin } = await sb.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!isAdmin) return { ok: false as const, error: 'Only the Master Admin can permanently delete users.' };
    if (data.userId === context.userId) return { ok: false as const, error: 'You cannot delete your own account.' };

    // Best-effort removal of the user's own files (admin storage access, RLS-checked).
    try {
      const { data: docs } = await sb.from('kyc_documents').select('file_path').eq('user_id', data.userId);
      for (const bucket of ['kyc-docs', 'property-docs', 'property-media']) {
        const { data: files } = await sb.storage.from(bucket).list(data.userId, { limit: 1000 });
        const paths = [...(bucket === 'kyc-docs' ? (docs ?? []).map((d) => d.file_path) : []), ...(files ?? []).map((f) => `${data.userId}/${f.name}`)];
        if (paths.length) await sb.storage.from(bucket).remove(paths);
      }
    } catch (e) { console.error('delete-user storage cleanup', (e as Error).message); }

    const { error } = await sb.rpc('admin_delete_user' as never, { _target: data.userId, _reason: data.reason ?? null } as never);
    if (error) { console.error('delete-user failed', error.message); return { ok: false as const, error: error.message }; }
    return { ok: true as const };
  });
