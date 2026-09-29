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
import { useServerFn } from '@tanstack/react-start';
import { saveSmsKey, getIntegrationSecretStatus, saveIntegrationSecrets } from '@/lib/payments.functions';

const NOTIFY_TYPES: [string, string][] = [['registration','Registration'],['activation','Account activation'],['payment_success','Payment success'],['payment_failure','Payment failure'],['kyc_submitted','Verification submitted'],['kyc_approved','Verification approved'],['kyc_rejected','Verification rejected / changes required'],['property_submitted','Property submitted'],['property_approved','Property approved'],['property_rejected','Property rejected'],['admin_important','Important admin notifications']];
const CHANNELS = ['email', 'sms', 'whatsapp'] as const;

function ConnState({ ready, enabled }: { ready: boolean; enabled: boolean }) {
  return <div className="flex flex-wrap gap-2"><span className={`status ${ready ? 'pending' : 'suspended'}`}>{ready ? 'Configured' : 'Not configured'}</span><span className="status suspended">Not connected</span><span className={`status ${enabled ? 'active' : 'suspended'}`}>{enabled ? 'Enabled' : 'Disabled'}</span></div>;
}
function SecretField({ label, name, masked, value, onChange }: { label: string; name: string; masked?: string | null | undefined; value: string; onChange: (n: string, v: string) => void }) {
  return <div className="field"><label>{label}</label><input type="password" autoComplete="new-password" className="field-input" value={value} onChange={(e) => onChange(name, e.target.value)} placeholder={masked ?? 'Not configured'} /><small className="muted">{masked ? `Saved ${masked}. Leave blank to keep it.` : 'Not configured. Stored privately on the server only.'}</small></div>;
}
function Toggle({ name, checked, title, note }: { name: string; checked?: boolean | undefined; title: string; note: string }) {
  return <label className="gateway-toggle"><input type="checkbox" name={name} defaultChecked={!!checked} /> <span><strong>{title}</strong><small>{note}</small></span></label>;
}

export function PlatformSettings({ payments }: { payments?: React.ReactNode }) {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false); const [tab, setTab] = useState('general');
  const [secrets, setSecrets] = useState<{ [k in 'msg91_auth_key'|'key_secret'|'webhook_secret'|'smtp_password'|'whatsapp_access_token'|'whatsapp_verify_token'|'whatsapp_webhook_secret']?: string }>({});
  const onSecret = (n: string, v: string) => setSecrets((x) => ({ ...x, [n as 'smtp_password']: v }));
  const secStatus = useServerFn(getIntegrationSecretStatus); const saveSecrets = useServerFn(saveIntegrationSecrets); const saveKey = useServerFn(saveSmsKey);
  const sec = useQuery({ queryKey: ['integration-secrets'], queryFn: () => secStatus() });
  const q = useQuery({ queryKey: ['platform-settings'], queryFn: async () => (await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle()).data });
  const hooks = useQuery({ queryKey: ['webhook-endpoints'], enabled: tab === 'webhooks', queryFn: async () => (await supabase.from('webhook_endpoints').select('*').order('id')).data ?? [] });
  const tabs: [string, string][] = [['general','General'],['payments','Payments'],['sms','SMS / OTP'],['email','Email / SMTP'],['whatsapp','WhatsApp'],['webhooks','Webhooks'],['notifications','Notifications'],['security','Security']];
  if (q.isLoading) return <Panel><p className="muted">Loading…</p></Panel>;
  const s = q.data; const m = (sec.data ?? {}) as { [k in 'msg91_auth_key'|'key_secret'|'webhook_secret'|'smtp_password'|'whatsapp_access_token'|'whatsapp_verify_token'|'whatsapp_webhook_secret']?: string | null };
  const matrix = (s?.notification_matrix ?? {}) as Record<string, Record<string, boolean>>;
  const head = <Tabs value={tab} onChange={setTab} options={tabs} />;
  if (tab === 'payments') return <div>{head}{payments}</div>;
  if (tab === 'webhooks') return <div>{head}<Panel title="Webhooks">
    <p className="muted">Incoming events from providers. Signatures are verified on the server before anything is processed. No events are shown until a real provider sends one.</p>
    <Table headers={['Provider','Events','Endpoint','Status','Last event','Last success','Last error','Verification']} rows={(hooks.data ?? []).map((h) => [
      <strong key="p">{h.provider}</strong>, h.events.join(', '), <code key="e" className="text-xs break-all">{h.endpoint}</code>,
      <button type="button" className={`status ${h.active ? 'active' : 'suspended'}`} onClick={async () => { const { error } = await supabase.from('webhook_endpoints').update({ active: !h.active, updated_at: new Date().toISOString() }).eq('id', h.id); if (error) toast.error('Could not update'); else qc.invalidateQueries({ queryKey: ['webhook-endpoints'] }); }}>{h.active ? 'Active' : 'Inactive'}</button>,
      h.last_event_at ? fmtDate(h.last_event_at) : 'None yet', h.last_success_at ? fmtDate(h.last_success_at) : 'None yet', h.last_error ?? '—',
      <span key="v" className="status suspended">{(h.id === 'razorpay' ? m.webhook_secret : m.whatsapp_webhook_secret) ? 'Secret saved · not connected' : 'Secret not configured'}</span>])} empty="No webhooks registered" />
  </Panel></div>;

  const n = (f: FormData, k: string, d: number) => { const v = Number(f.get(k)); return Number.isFinite(v) && v > 0 ? v : d; };
  return <div>{head}<form className="panel" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const t = (k: string) => f.has(k) ? (String(f.get(k) ?? '').trim() || null) : undefined; const b = (k: string) => f.has(`__${k}`) ? f.get(k) === 'on' : undefined; setBusy(true);
    const raw: Record<string, unknown> = {};
    if (tab === 'general') Object.assign(raw, { platform_name: t('platform_name') ?? 'Eliteoz', platform_email: t('platform_email'), contact_email: t('contact_email'), contact_phone: t('contact_phone'), currency: t('currency') ?? 'INR', platform_status: t('platform_status') ?? 'live', maintenance_mode: b('maintenance_mode'), verification_days: n(f, 'verification_days', 7), reminder_days_before: Number(f.get('reminder_days_before')) || 0 });
    if (tab === 'sms') Object.assign(raw, { otp_provider: t('otp_provider') ?? 'demo', msg91_sender_id: t('msg91_sender_id'), msg91_template_id: t('msg91_template_id'), msg91_enabled: b('msg91_enabled'), otp_expiry_minutes: n(f, 'otp_expiry_minutes', 5), otp_resend_seconds: n(f, 'otp_resend_seconds', 30), otp_max_attempts: n(f, 'otp_max_attempts', 5) });
    if (tab === 'email') Object.assign(raw, { smtp_host: t('smtp_host'), smtp_port: f.get('smtp_port') ? n(f, 'smtp_port', 587) : null, smtp_username: t('smtp_username'), smtp_security: t('smtp_security') ?? 'tls', smtp_from_name: t('smtp_from_name'), smtp_from: t('smtp_from'), smtp_enabled: b('smtp_enabled') });
    if (tab === 'whatsapp') Object.assign(raw, { whatsapp_provider: t('whatsapp_provider'), whatsapp_api_url: t('whatsapp_api_url'), whatsapp_phone_number_id: t('whatsapp_phone_number_id'), whatsapp_business_account_id: t('whatsapp_business_account_id'), whatsapp_enabled: b('whatsapp_enabled') });
    if (tab === 'notifications') { const mx: Record<string, Record<string, boolean>> = {}; NOTIFY_TYPES.forEach(([k]) => { mx[k] = Object.fromEntries(CHANNELS.map((c) => [c, f.get(`${k}:${c}`) === 'on'])); }); Object.assign(raw, { notification_matrix: mx, notify_email: b('notify_email'), notify_sms: b('notify_sms'), notify_whatsapp: b('notify_whatsapp') }); }
    if (tab === 'security') Object.assign(raw, { session_timeout_minutes: n(f, 'session_timeout_minutes', 120), max_upload_mb: Math.min(n(f, 'max_upload_mb', 10), 25), manual_payment_enabled: b('manual_payment_enabled') });
    const patch = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
    const { error } = await supabase.from('platform_settings').update({ ...patch, updated_at: new Date().toISOString() } as never).eq('id', 1);
    let secErr: string | null = null;
    if (!error) {
      const pick = (k: 'msg91_auth_key'|'key_secret'|'webhook_secret'|'smtp_password'|'whatsapp_access_token'|'whatsapp_verify_token'|'whatsapp_webhook_secret') => secrets[k]?.trim() || undefined;
      if (pick('msg91_auth_key')) { const r = await saveKey({ data: { authKey: pick('msg91_auth_key')! } }).catch(() => ({ ok: false as const, error: 'Could not save the SMS key.' })); if (!r.ok) secErr = r.error; }
      const payload = { smtp_password: pick('smtp_password'), whatsapp_access_token: pick('whatsapp_access_token'), whatsapp_verify_token: pick('whatsapp_verify_token'), whatsapp_webhook_secret: pick('whatsapp_webhook_secret') };
      if (!secErr && Object.values(payload).some(Boolean)) { const r = await saveSecrets({ data: payload }).catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : 'Could not save private keys.' })); if (!r.ok) secErr = r.error; }
      if (!secErr) { setSecrets({}); qc.invalidateQueries({ queryKey: ['integration-secrets'] }); }
    }
    setBusy(false); if (error || secErr) { toast.error(secErr ?? 'Could not save settings'); return; } toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['platform-settings'] });
  }}>
    {tab === 'general' && <>
      <h2>General</h2>
      <div className="form-grid">
        <div className="field"><label>Platform name</label><input name="platform_name" maxLength={60} className="field-input" defaultValue={s?.platform_name ?? 'Eliteoz'} /></div>
        <div className="field"><label>Platform email</label><input name="platform_email" type="email" className="field-input" defaultValue={s?.platform_email ?? ''} /></div>
        <div className="field"><label>Support email</label><input name="contact_email" type="email" className="field-input" defaultValue={s?.contact_email ?? ''} /></div>
        <div className="field"><label>Support phone</label><input name="contact_phone" maxLength={20} className="field-input" defaultValue={s?.contact_phone ?? ''} /></div>
        <div className="field"><label>Currency</label><select name="currency" className="field-input" defaultValue={s?.currency ?? 'INR'}><option value="INR">INR (₹)</option></select></div>
        <div className="field"><label>Platform status</label><select name="platform_status" className="field-input" defaultValue={s?.platform_status ?? 'live'}><option value="live">Live</option><option value="paused_registrations">Registrations paused</option></select></div>
        <div className="field"><label>Days allowed to complete verification</label><input name="verification_days" type="number" min={1} max={90} className="field-input" defaultValue={s?.verification_days ?? 7} /></div>
        <div className="field"><label>Reminder days before deadline</label><input name="reminder_days_before" type="number" min={0} max={30} className="field-input" defaultValue={s?.reminder_days_before ?? 2} /></div>
      </div>
      <input type="hidden" name="__maintenance_mode" /><Toggle name="maintenance_mode" checked={s?.maintenance_mode} title="Maintenance mode" note="Saved setting for showing a maintenance notice" />
      <p className="muted">The registration activation fee is set in the Payments tab.</p>
    </>}
    {tab === 'sms' && <>
      <h2>SMS / OTP</h2><ConnState ready={!!m.msg91_auth_key} enabled={!!s?.msg91_enabled} />
      <div className="form-grid">
        <div className="field"><label>Provider</label><select name="otp_provider" className="field-input" defaultValue={s?.otp_provider ?? 'demo'}><option value="demo">None (no SMS sent)</option><option value="msg91">MSG91 (not connected yet)</option></select></div>
        <SecretField label="API / Auth key" name="msg91_auth_key" masked={m.msg91_auth_key} value={secrets.msg91_auth_key ?? ''} onChange={onSecret} />
        <div className="field"><label>Sender ID</label><input name="msg91_sender_id" maxLength={11} className="field-input" defaultValue={s?.msg91_sender_id ?? ''} /></div>
        <div className="field"><label>Template ID</label><input name="msg91_template_id" maxLength={64} className="field-input" defaultValue={s?.msg91_template_id ?? ''} /></div>
        <div className="field"><label>OTP expiry (minutes)</label><input name="otp_expiry_minutes" type="number" min={1} max={30} className="field-input" defaultValue={s?.otp_expiry_minutes ?? 5} /></div>
        <div className="field"><label>Resend cooldown (seconds)</label><input name="otp_resend_seconds" type="number" min={10} max={600} className="field-input" defaultValue={s?.otp_resend_seconds ?? 30} /></div>
        <div className="field"><label>Maximum attempts</label><input name="otp_max_attempts" type="number" min={1} max={10} className="field-input" defaultValue={s?.otp_max_attempts ?? 5} /></div>
      </div>
      <input type="hidden" name="__msg91_enabled" /><Toggle name="msg91_enabled" checked={s?.msg91_enabled} title="Enable SMS OTP" note="No real SMS is sent until the provider is connected" />
    </>}
    {tab === 'email' && <>
      <h2>Email / SMTP</h2><ConnState ready={!!(s?.smtp_host && m.smtp_password)} enabled={!!s?.smtp_enabled} />
      <div className="form-grid">
        <div className="field"><label>SMTP host</label><input name="smtp_host" maxLength={255} className="field-input" defaultValue={s?.smtp_host ?? ''} /></div>
        <div className="field"><label>Port</label><input name="smtp_port" type="number" min={1} max={65535} className="field-input" defaultValue={s?.smtp_port ?? ''} /></div>
        <div className="field"><label>Username</label><input name="smtp_username" maxLength={255} autoComplete="off" className="field-input" defaultValue={s?.smtp_username ?? ''} /></div>
        <SecretField label="Password" name="smtp_password" masked={m.smtp_password} value={secrets.smtp_password ?? ''} onChange={onSecret} />
        <div className="field"><label>TLS / SSL</label><select name="smtp_security" className="field-input" defaultValue={s?.smtp_security ?? 'tls'}><option value="tls">STARTTLS</option><option value="ssl">SSL</option><option value="none">None</option></select></div>
        <div className="field"><label>From name</label><input name="smtp_from_name" maxLength={80} className="field-input" defaultValue={s?.smtp_from_name ?? ''} /></div>
        <div className="field"><label>From email</label><input name="smtp_from" type="email" className="field-input" defaultValue={s?.smtp_from ?? ''} /></div>
      </div>
      <input type="hidden" name="__smtp_enabled" /><Toggle name="smtp_enabled" checked={s?.smtp_enabled} title="Enable email sending" note="No emails are sent until SMTP is connected" />
    </>}
    {tab === 'whatsapp' && <>
      <h2>WhatsApp</h2><ConnState ready={!!m.whatsapp_access_token} enabled={!!s?.whatsapp_enabled} />
      <div className="form-grid">
        <div className="field"><label>Provider</label><input name="whatsapp_provider" maxLength={60} className="field-input" defaultValue={s?.whatsapp_provider ?? ''} placeholder="e.g. Meta Cloud API" /></div>
        <div className="field"><label>API URL</label><input name="whatsapp_api_url" type="url" className="field-input" defaultValue={s?.whatsapp_api_url ?? ''} /></div>
        <SecretField label="API key / Access token" name="whatsapp_access_token" masked={m.whatsapp_access_token} value={secrets.whatsapp_access_token ?? ''} onChange={onSecret} />
        <div className="field"><label>Phone number ID</label><input name="whatsapp_phone_number_id" maxLength={64} className="field-input" defaultValue={s?.whatsapp_phone_number_id ?? ''} /></div>
        <div className="field"><label>Business account ID</label><input name="whatsapp_business_account_id" maxLength={64} className="field-input" defaultValue={s?.whatsapp_business_account_id ?? ''} /></div>
        <SecretField label="Webhook verify token" name="whatsapp_verify_token" masked={m.whatsapp_verify_token} value={secrets.whatsapp_verify_token ?? ''} onChange={onSecret} />
        <SecretField label="Webhook secret" name="whatsapp_webhook_secret" masked={m.whatsapp_webhook_secret} value={secrets.whatsapp_webhook_secret ?? ''} onChange={onSecret} />
      </div>
      <input type="hidden" name="__whatsapp_enabled" /><Toggle name="whatsapp_enabled" checked={s?.whatsapp_enabled} title="Enable WhatsApp" note="No messages are sent until WhatsApp is connected" />
    </>}
    {tab === 'notifications' && <>
      <h2>Notifications</h2><p className="muted">Choose which events will go out on each channel once that channel is connected. In-app dashboard notifications always work.</p>
      <input type="hidden" name="__notify_email" /><input type="hidden" name="__notify_sms" /><input type="hidden" name="__notify_whatsapp" />
      <Toggle name="notify_email" checked={s?.notify_email} title="Email channel" note="Not connected — nothing is sent yet" />
      <Toggle name="notify_sms" checked={s?.notify_sms} title="SMS channel" note="Not connected — nothing is sent yet" />
      <Toggle name="notify_whatsapp" checked={s?.notify_whatsapp} title="WhatsApp channel" note="Not connected — nothing is sent yet" />
      <Table headers={['Event','Email','SMS','WhatsApp']} rows={NOTIFY_TYPES.map(([k, l]) => [l, ...CHANNELS.map((c) => <input key={c} type="checkbox" aria-label={`${l} ${c}`} name={`${k}:${c}`} defaultChecked={!!matrix[k]?.[c]} className="h-5 w-5" />)])} />
    </>}
    {tab === 'security' && <>
      <h2>Security</h2>
      <div className="form-grid">
        <div className="field"><label>Admin session timeout (minutes)</label><input name="session_timeout_minutes" type="number" min={15} max={1440} className="field-input" defaultValue={s?.session_timeout_minutes ?? 120} /></div>
        <div className="field"><label>Max upload size (MB)</label><input name="max_upload_mb" type="number" min={1} max={25} className="field-input" defaultValue={s?.max_upload_mb ?? 10} /></div>
      </div>
      <input type="hidden" name="__manual_payment_enabled" /><Toggle name="manual_payment_enabled" checked={s?.manual_payment_enabled ?? true} title="Manual / offline payments" note="Allow recording bank transfer or cheque payments for admin approval" />
      <div className="preview-warning">Only the Master Admin can open these settings. Private keys are saved on the server and never shown again; every change is recorded in the activity log.</div>
    </>}
    <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button></div>
  </form></div>;
}

const actionLabel = (a: string) => a.startsWith('settings_changed') ? 'Settings changed' : ({ profile_updated: 'Account updated', role_insert: 'Role granted', role_delete: 'Role removed', account_deactivated: 'Account deactivated', auto_suspended: 'Auto-suspended', property_status: 'Property status', kyc_status: 'Verification status', payment_status: 'Payment status' } as Record<string, string>)[a] ?? a;

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
  return <Panel title="Saved properties"><Table headers={['Property', 'Price', 'Saved', '']} empty="You haven't saved any properties yet. Use Save on any property page." rows={q.data?.filter((s) => s.properties).map((s) => [<div><strong>{s.properties!.title}</strong><small className="block muted">{s.properties!.ref} · {s.properties!.location}</small></div>, formatINR(Number(s.properties!.price)), fmtDate(s.created_at), <div className="row-actions">{s.properties!.status === 'published' ? <Button size="sm" variant="ghost" asChild><Link to="/properties/$id" params={{ id: s.properties!.ref }}>View</Link></Button> : <small className="muted">No longer listed</small>}<Button size="sm" variant="ghost" onClick={() => remove(s.id)}>Remove</Button></div>]) ?? []} /></Panel>;
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

type OfflineUser = { id: string; name: string; email: string };
export function OfflinePaymentForm({ users }: { users: OfflineUser[] }) {
  const qc = useQueryClient(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const fee = useQuery({ queryKey: ['pay-fee'], queryFn: async () => Number((await supabase.from('payment_settings').select('activation_fee').eq('id', 1).maybeSingle()).data?.activation_fee ?? 50000) });
  if (!open) return <div className="form-actions" style={{ justifyContent: 'flex-start', marginBottom: 12 }}><Button onClick={() => setOpen(true)}>Record offline payment</Button></div>;
  return <form className="panel" onSubmit={async (e) => {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setBusy(true);
    const { data: auth } = await supabase.auth.getUser(); const u = users.find((x) => x.id === f.get('user_id'));
    if (!auth.user || !u) { setBusy(false); toast.error('Choose a member'); return; }
    let receipt_path: string | null = null; const file = f.get('receipt') as File | null;
    if (file && file.size) {
      if (file.size > 10 * 1024 * 1024) { setBusy(false); toast.error('Receipt must be under 10 MB'); return; }
      receipt_path = `receipts/${u.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const up = await supabase.storage.from('property-docs').upload(receipt_path, file);
      if (up.error) { setBusy(false); toast.error('Receipt upload failed'); return; }
    }
    const verified = f.get('status') === 'success';
    const ref = String(f.get('reference') ?? '').trim();
    const { error } = await supabase.from('transactions').insert({
      user_id: u.id, payer_name: u.name, payer_email: u.email, purpose: String(f.get('purpose')), method: String(f.get('method')),
      amount: Number(f.get('amount')), status: verified ? 'success' : 'pending', payment_date: String(f.get('payment_date')) || null,
      notes: String(f.get('notes') ?? '').trim() || null, receipt_path, provider: 'offline', recorded_by: auth.user.id,
      ...(ref ? { reference: ref } : {}), ...(verified ? { verified_by: auth.user.id, verified_at: new Date().toISOString() } : {}),
    });
    setBusy(false); if (error) { toast.error(error.message.includes('duplicate') ? 'This reference is already recorded' : 'Could not record the payment'); return; }
    toast.success(verified ? 'Payment recorded and account activated' : 'Payment recorded as pending'); form.reset(); setOpen(false);
    qc.invalidateQueries({ queryKey: ['admin-txns'] }); qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries();
  }}>
    <h2>Record offline payment</h2>
    <div className="form-grid">
      <div className="field"><label>Member *</label><select name="user_id" className="field-input" required defaultValue=""><option value="" disabled>Choose a member</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}</select></div>
      <div className="field"><label>Purpose</label><select name="purpose" className="field-input"><option value="activation">Registration / activation fee</option><option value="other">Other</option></select></div>
      <div className="field"><label>Payment method *</label><select name="method" className="field-input" required><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div>
      <div className="field"><label>Amount (₹) *</label><input name="amount" type="number" min={0} required className="field-input" key={fee.data} defaultValue={fee.data ?? 50000} /></div>
      <div className="field"><label>Transaction / reference number</label><input name="reference" className="field-input" placeholder="UTR, cheque no. or receipt no." maxLength={80} /></div>
      <div className="field"><label>Payment date *</label><input name="payment_date" type="date" required className="field-input" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
      <div className="field"><label>Status</label><select name="status" className="field-input"><option value="success">Verified — money received</option><option value="pending">Pending — verify later</option></select></div>
      <div className="field"><label>Receipt / proof (optional)</label><input name="receipt" type="file" accept="image/*,application/pdf" className="field-input" /></div>
      <div className="field" style={{ gridColumn: '1/-1' }}><label>Notes</label><textarea name="notes" className="field-input" rows={2} maxLength={500} /></div>
    </div>
    <p className="muted small">A verified registration payment activates the member's account automatically.</p>
    <div className="form-actions"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</Button></div>
  </form>;
}

export function VerifyPaymentButton({ t }: { t: { id: string; status: string; provider?: string | null; receipt_path?: string | null } }) {
  const qc = useQueryClient();
  const viewReceipt = async () => { const { data } = await supabase.storage.from('property-docs').createSignedUrl(t.receipt_path!, 120); if (data) window.open(data.signedUrl, '_blank', 'noopener'); else toast.error('Could not open receipt'); };
  const verify = async () => {
    if (!confirm('Confirm this payment was received? A registration payment will activate the account.')) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('transactions').update({ status: 'success', verified_by: auth.user?.id ?? null, verified_at: new Date().toISOString() }).eq('id', t.id);
    if (error) { toast.error('Could not verify'); return; } toast.success('Payment verified'); qc.invalidateQueries();
  };
  return <div className="row-actions">{t.receipt_path && <Button size="sm" variant="ghost" onClick={viewReceipt}>Receipt</Button>}{t.status === 'pending' && t.provider === 'offline' && <Button size="sm" variant="outline" onClick={verify}>Verify</Button>}</div>;
}
