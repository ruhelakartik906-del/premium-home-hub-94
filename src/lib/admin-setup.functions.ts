import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

async function adminCount() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { count } = await supabaseAdmin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  return count ?? 0;
}

export const adminSetupAvailable = createServerFn({ method: 'GET' }).handler(async () => ({ available: (await adminCount()) === 0 }));

// One-time bootstrap: only works while no Master Admin exists.
export const createFirstAdmin = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ full_name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data }) => {
    if ((await adminCount()) > 0) return { ok: false as const, error: 'A Master Admin already exists.' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.full_name } });
    if (error || !created.user) return { ok: false as const, error: 'Could not create the admin account.' };
    await supabaseAdmin.from('user_roles').insert({ user_id: created.user.id, role: 'admin' });
    await supabaseAdmin.from('profiles').insert({ id: created.user.id, full_name: data.full_name, email: data.email, account_type: 'admin', verification_status: 'approved', created_by_admin: true });
    return { ok: true as const };
  });
