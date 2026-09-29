import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Permanent deletion — Master Admin only, verified server-side.
export const adminDeleteUserPermanently = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), confirm: z.literal('DELETE'), reason: z.string().trim().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!isAdmin) return { ok: false as const, error: 'Only the Master Admin can permanently delete users.' };
    if (data.userId === context.userId) return { ok: false as const, error: 'You cannot delete your own account.' };
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data: roles } = await db.from('user_roles').select('role').eq('user_id', data.userId);
    const r = (roles ?? []).map((x) => x.role as string);
    if (r.includes('admin')) return { ok: false as const, error: 'Master Admin accounts cannot be deleted.' };
    const { data: p } = await db.from('profiles').select('status,verification_status').eq('id', data.userId).maybeSingle();

    // Audit first (audit_logs has no FK to users, so it survives).
    const { error: auditErr } = await db.from('audit_logs').insert({ actor_id: context.userId, target_user_id: data.userId, action: 'PERMANENT_USER_DELETION', details: { role: r[0] ?? null, reason: data.reason || null, status: p?.status ?? null, verification: p?.verification_status ?? null } });
    if (auditErr) { console.error('audit failed', auditErr.message); return { ok: false as const, error: 'Could not record the audit entry; deletion cancelled.' }; }

    // Private verification files + rows without cascading FKs.
    const { data: docs } = await db.from('kyc_documents').select('file_path').eq('user_id', data.userId);
    const paths = (docs ?? []).map((d) => d.file_path);
    if (paths.length) { const { data: b } = await db.storage.listBuckets(); for (const bk of b ?? []) await db.storage.from(bk.id).remove(paths).catch(() => null); }
    await db.from('kyc_documents').delete().eq('user_id', data.userId);
    await db.from('saved_properties').delete().eq('user_id', data.userId);
    // Keep seller listings (not deleted) but take them off the market.
    await db.from('properties').update({ status: 'unpublished', admin_note: 'Seller account permanently deleted' }).eq('seller_id', data.userId);
    // Financial records are retained for accounting, personal data removed.
    await db.from('transactions').update({ payer_name: null, payer_email: null }).eq('user_id', data.userId);

    // Deleting the auth user revokes sessions and cascades profile, roles, KYC, notifications, interests, tickets.
    const { error } = await db.auth.admin.deleteUser(data.userId);
    if (error) { console.error('deleteUser failed', error.message); return { ok: false as const, error: 'Could not delete the account. Please try again.' }; }
    return { ok: true as const };
  });
