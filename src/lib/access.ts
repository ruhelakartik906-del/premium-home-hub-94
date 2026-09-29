import { redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export type Dest = '/admin' | '/buyer' | '/seller' | '/activate';

/** Reads role + account status from the database (never from client state). */
export async function accountAccess() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const [{ data: roles }, { data: p }, { data: staff }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', u.user.id),
    supabase.from('profiles').select('status,account_type').eq('id', u.user.id).maybeSingle(),
    supabase.from('staff_members').select('active').eq('user_id', u.user.id).maybeSingle(),
  ]);
  const r = (roles ?? []).map((x) => x.role as string);
  const role = r.includes('admin') || staff?.active ? 'admin' : r.includes('seller') ? 'seller' : 'buyer';
  const pending = role !== 'admin' && p?.status === 'pending_payment';
  const dest: Dest = role === 'admin' ? '/admin' : pending ? '/activate' : role === 'seller' ? '/seller' : '/buyer';
  return { role, pending, dest };
}

/** Route guard: wrong role → own dashboard; unpaid → payment page. */
export async function guardWorkspace(required: 'buyer' | 'seller' | 'admin') {
  const a = await accountAccess();
  if (!a) throw redirect({ to: '/login' });
  if (a.role !== required || a.pending) throw redirect({ to: a.dest });
}
