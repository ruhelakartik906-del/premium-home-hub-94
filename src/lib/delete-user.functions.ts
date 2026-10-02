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
    let db: Awaited<typeof import('@/integrations/supabase/client.server')>['supabaseAdmin'];
    try { db = (await import('@/integrations/supabase/client.server')).supabaseAdmin; }
    catch (e) { console.error('delete-user: admin client unavailable', (e as Error).message); return { ok: false as const, error: 'Server is missing its private admin key (SUPABASE_SERVICE_ROLE_KEY), so users cannot be deleted on this deployment.' }; }
    const { data: roles } = await db.from('user_roles').select('role').eq('user_id', data.userId);
    const r = (roles ?? []).map((x) => x.role as string);
    if (r.includes('admin')) return { ok: false as const, error: 'Master Admin accounts cannot be deleted.' };
    const { data: p } = await db.from('profiles').select('status,verification_status,mobile').eq('id', data.userId).maybeSingle();

    // Audit first (audit_logs has no FK to users, so it survives). Minimal, no personal data.
    const { error: auditErr } = await db.from('audit_logs').insert({ actor_id: context.userId, target_user_id: data.userId, action: 'PERMANENT_USER_DELETION', details: { deletion_type: 'PERMANENT', role: r[0] ?? null, reason: data.reason || null, deleted_at: new Date().toISOString() } });
    if (auditErr) { console.error('audit failed', auditErr.message); return { ok: false as const, error: 'Could not record the audit entry; deletion cancelled.' }; }

    const fail = (step: string, e: { message: string } | null) => { if (e) { console.error(`delete-user ${step} failed`, e.message); throw new Error(step); } };
    try {
      // Owned files: KYC paths plus anything stored under the user's own folder in every bucket.
      const { data: docs } = await db.from('kyc_documents').select('file_path').eq('user_id', data.userId);
      const { data: buckets } = await db.storage.listBuckets();
      for (const bk of buckets ?? []) {
        const { data: files } = await db.storage.from(bk.id).list(data.userId, { limit: 1000 });
        const paths = [...(docs ?? []).map((d) => d.file_path), ...(files ?? []).map((f) => `${data.userId}/${f.name}`)];
        if (paths.length) await db.storage.from(bk.id).remove(paths).catch(() => null);
      }
      fail('documents', (await db.from('kyc_documents').delete().eq('user_id', data.userId)).error);
      fail('saved', (await db.from('saved_properties').delete().eq('user_id', data.userId)).error);
      // Seller properties and their dependent records are removed.
      const { data: props } = await db.from('properties').select('id').eq('seller_id', data.userId);
      const ids = (props ?? []).map((x) => x.id);
      if (ids.length) {
        fail('property interests', (await db.from('interests').delete().in('property_id', ids)).error);
        fail('property saves', (await db.from('saved_properties').delete().in('property_id', ids)).error);
        fail('properties', (await db.from('properties').delete().in('id', ids)).error);
      }
      if (p?.mobile) fail('otp', (await db.from('otp_verifications').delete().eq('mobile', p.mobile)).error);
      // Financial records are retained for accounting, personal data removed.
      fail('transactions', (await db.from('transactions').update({ payer_name: null, payer_email: null }).eq('user_id', data.userId)).error);
    } catch (e) {
      return { ok: false as const, error: `Deletion stopped at "${(e as Error).message}". The account was kept; please try again.` };
    }

    // Deleting the auth user revokes sessions and cascades profile, roles, KYC, notifications, interests, tickets.
    const { error } = await db.auth.admin.deleteUser(data.userId);
    if (error) { console.error('deleteUser failed', error.message); return { ok: false as const, error: `Login account could not be removed: ${error.message}` }; }
    return { ok: true as const };
  });
