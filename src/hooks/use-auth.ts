import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Profile = {
  id: string; full_name: string; email: string; mobile: string | null; dob: string | null; gender: string | null; country: string | null; state: string | null; city: string | null; address: string | null; pincode: string | null; company_name: string | null; business_type: string | null;
  account_type: string; status: string; verification_status: string; activated_at: string; verification_due_at: string; created_by_admin: boolean; created_at: string;
};

export function effectiveStatus(p: Pick<Profile, 'status' | 'verification_status' | 'verification_due_at'>) {
  if (p.status === 'blocked') return 'blocked';
  if (p.status === 'suspended') return 'suspended';
  if (p.status === 'pending_payment') return 'pending_payment';
  if (!['submitted', 'approved'].includes(p.verification_status) && new Date(p.verification_due_at).getTime() < Date.now()) return 'suspended';
  return 'active';
}
export function daysLeft(due: string) { return Math.max(0, Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)); }

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: roles }, { data: profile }, { data: staff }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', u.user.id),
        supabase.from('profiles').select('*').eq('id', u.user.id).maybeSingle(),
        supabase.from('staff_members').select('active,permissions').eq('user_id', u.user.id).maybeSingle(),
      ]);
      const r = (roles ?? []).map((x) => x.role as string);
      const isMaster = r.includes('admin');
      const staffPerms = !isMaster && staff?.active ? staff.permissions : null;
      // Active staff use the admin workspace, limited to their permissions.
      return { user: u.user, roles: staffPerms ? [...r, 'admin'] : r, profile: profile as Profile | null, isMaster, staffPerms };
    },
  });
}
