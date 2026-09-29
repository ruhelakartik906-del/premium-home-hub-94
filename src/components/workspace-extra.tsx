import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useMe } from '@/hooks/use-auth';
import { Panel, Table, Tabs, fmtDate } from '@/components/workspace';
import { formatINR } from '@/lib/eliteoz-data';

export function PlatformSettings() {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['platform-settings'], queryFn: async () => (await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle()).data });
  if (q.isLoading) return <Panel><p className="muted">Loading…</p></Panel>;
  const s = q.data;
  return <form className="panel" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const t = (k: string) => String(f.get(k) ?? '').trim() || null; setBusy(true);
    const { error } = await supabase.from('platform_settings').update({
      verification_days: Number(f.get('verification_days')) || 7, reminder_days_before: Number(f.get('reminder_days_before')) || 0,
      contact_email: t('contact_email'), contact_phone: t('contact_phone'), otp_provider: String(f.get('otp_provider')),
      smtp_host: t('smtp_host'), smtp_from: t('smtp_from'), whatsapp_webhook_url: t('whatsapp_webhook_url'),
      notify_email: f.get('notify_email') === 'on', notify_whatsapp: f.get('notify_whatsapp') === 'on',
    }).eq('id', 1);
    setBusy(false); if (error) { toast.error('Could not save settings'); return; } toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['platform-settings'] });
  }}>
    <h2>Platform settings</h2>
    <div className="form-section"><h3>Verification</h3></div>
    <div className="form-grid">
      <div className="field"><label>Days allowed to complete verification</label><input name="verification_days" type="number" min={1} max={90} className="field-input" defaultValue={s?.verification_days ?? 7} /><small className="muted">Applies to newly activated accounts. Unverified accounts are suspended automatically after this.</small></div>
      <div className="field"><label>Send reminder this many days before</label><input name="reminder_days_before" type="number" min={0} max={30} className="field-input" defaultValue={s?.reminder_days_before ?? 2} /></div>
    </div>
    <div className="form-section"><h3>Contact details</h3></div>
    <div className="form-grid">
      <div className="field"><label>Support email</label><input name="contact_email" type="email" className="field-input" defaultValue={s?.contact_email ?? ''} /></div>
      <div className="field"><label>Support phone</label><input name="contact_phone" className="field-input" defaultValue={s?.contact_phone ?? ''} /></div>
    </div>
    <div className="form-section"><h3>Messages</h3></div>
    <div className="form-grid">
      <div className="field"><label>OTP provider</label><select name="otp_provider" className="field-input" defaultValue={s?.otp_provider ?? 'demo'}><option value="demo">Demo code (no SMS sent)</option><option value="msg91">MSG91 (needs account setup)</option></select></div>
      <div className="field"><label>Email server host</label><input name="smtp_host" className="field-input" defaultValue={s?.smtp_host ?? ''} placeholder="smtp.example.com" /></div>
      <div className="field"><label>Send emails from</label><input name="smtp_from" type="email" className="field-input" defaultValue={s?.smtp_from ?? ''} /></div>
      <div className="field"><label>WhatsApp webhook address</label><input name="whatsapp_webhook_url" type="url" className="field-input" defaultValue={s?.whatsapp_webhook_url ?? ''} /></div>
    </div>
    <label className="gateway-toggle"><input type="checkbox" name="notify_email" defaultChecked={s?.notify_email} /> <span><strong>Email notifications</strong><small>Not sending yet: email delivery isn't connected</small></span></label>
    <label className="gateway-toggle"><input type="checkbox" name="notify_whatsapp" defaultChecked={s?.notify_whatsapp} /> <span><strong>WhatsApp notifications</strong><small>Not sending yet: WhatsApp isn't connected</small></span></label>
    <div className="preview-warning"><strong>Note:</strong> Passwords and API keys are never saved here. They're added separately as private keys when each service is connected.</div>
    <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button></div>
  </form>;
}

const actionLabel = (a: string) => a.startsWith('settings_changed') ? 'Settings changed' : ({ profile_updated: 'Account updated', role_insert: 'Role granted', role_delete: 'Role removed', auto_suspended: 'Auto-suspended', property_status: 'Property status', kyc_status: 'Verification status', payment_status: 'Payment status' } as Record<string, string>)[a] ?? a;

export function AuditLog() {
  const [tab, setTab] = useState('all');
  const q = useQuery({ queryKey: ['audit-logs'], queryFn: async () => {
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    const ids = [...new Set((data ?? []).flatMap((r) => [r.actor_id, r.target_user_id]).filter(Boolean) as string[])];
    const { data: ps } = ids.length ? await supabase.from('profiles').select('id,full_name,email').in('id', ids) : { data: [] };
    const who = new Map((ps ?? []).map((p) => [p.id, p.full_name || p.email]));
    return (data ?? []).map((r) => ({ ...r, actor: r.actor_id ? who.get(r.actor_id) ?? 'Member' : 'System', target: r.target_user_id ? who.get(r.target_user_id) ?? '—' : '—' }));
  } });
  const groups: Record<string, (a: string) => boolean> = { all: () => true, accounts: (a) => a.startsWith('profile') || a.startsWith('role') || a === 'auto_suspended', properties: (a) => a === 'property_status', kyc: (a) => a === 'kyc_status', payments: (a) => a === 'payment_status', settings: (a) => a.startsWith('settings') };
  const list = (q.data ?? []).filter((r) => groups[tab]!(r.action));
  const summary = (d: Record<string, unknown>) => Object.entries(d).filter(([k, v]) => v !== null && !['id', 'updated_at'].includes(k)).slice(0, 5).map(([k, v]) => `${k.replaceAll('_', ' ')}: ${Array.isArray(v) ? v.join(' → ') : k === 'amount' ? formatINR(Number(v)) : String(v)}`).join(' · ');
  return <Panel><Tabs value={tab} onChange={setTab} options={[['all', 'All'], ['accounts', 'Accounts'], ['properties', 'Properties'], ['kyc', 'Verification'], ['payments', 'Payments'], ['settings', 'Settings']]} />
    <Table headers={['When', 'Action', 'By', 'Member', 'Details']} empty="No activity recorded yet." rows={list.map((r) => [fmtDate(r.created_at), <strong>{actionLabel(r.action)}</strong>, r.actor, r.target, <small className="muted">{summary((r.details ?? {}) as Record<string, unknown>)}</small>])} /></Panel>;
}

export function SavedProperties() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['saved'], queryFn: async () => (await supabase.from('saved_properties').select('id, created_at, properties(id, ref, title, location, price, status)').order('created_at', { ascending: false })).data ?? [] });
  const remove = async (id: string) => { await supabase.from('saved_properties').delete().eq('id', id); qc.invalidateQueries({ queryKey: ['saved'] }); };
  return <Panel title="Saved properties"><Table headers={['Property', 'Price', 'Saved', '']} empty="You haven't saved any properties yet. Use Save on any property page." rows={q.data?.filter((s) => s.properties).map((s) => [<div><strong>{s.properties!.title}</strong><small className="block muted">{s.properties!.ref} · {s.properties!.location}</small></div>, formatINR(Number(s.properties!.price)), fmtDate(s.created_at), <div className="row-actions">{s.properties!.status === 'approved' ? <Button size="sm" variant="ghost" asChild><Link to="/properties/$id" params={{ id: s.properties!.ref }}>View</Link></Button> : <small className="muted">No longer listed</small>}<Button size="sm" variant="ghost" onClick={() => remove(s.id)}>Remove</Button></div>]) ?? []} /></Panel>;
}

export function SaveButton({ propertyUuid }: { propertyUuid: string }) {
  const { data: me } = useMe(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['saved-one', propertyUuid], enabled: !!me?.roles.includes('buyer'), queryFn: async () => (await supabase.from('saved_properties').select('id').eq('property_id', propertyUuid).maybeSingle()).data });
  if (!me?.roles.includes('buyer')) return null;
  const toggle = async () => {
    const { error } = q.data ? await supabase.from('saved_properties').delete().eq('id', q.data.id) : await supabase.from('saved_properties').insert({ user_id: me.user.id, property_id: propertyUuid });
    if (error) { toast.error('Could not update saved properties'); return; }
    toast.success(q.data ? 'Removed from saved' : 'Saved'); qc.invalidateQueries({ queryKey: ['saved-one', propertyUuid] }); qc.invalidateQueries({ queryKey: ['saved'] });
  };
  return <Button variant="outline" onClick={toggle} style={{ width: '100%', marginBottom: 12 }}>{q.data ? <><BookmarkCheck /> Saved</> : <><Bookmark /> Save property</>}</Button>;
}
