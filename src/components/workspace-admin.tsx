import { MarketBadge, MarketTabs, useCountries } from '@/components/market';
import { formatMoney, flagOf } from '@/lib/eliteoz-data';
import { Globe } from 'lucide-react';
import { adminDeactivateUser, getGatewayStatus, saveGatewaySettings, setPaymentMode } from '@/lib/payments.functions';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useMemo, useState } from 'react';
import { BadgeCheck, Building2, CreditCard, Download, FileCheck, FileText, Heart, Pencil, Wallet, Plus, Send, Star, Trash2, Users, X, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { effectiveStatus, daysLeft, type Profile } from '@/hooks/use-auth';
import { coverOf, formatINR } from '@/lib/eliteoz-data';
import { DobInput } from '@/components/auth-flow';
import { adminCreateUser } from '@/lib/members.functions';
import { DeleteUserDialog, type DeleteTarget } from '@/components/delete-user-dialog';
import { Panel, SectionLink, Stat, Status, Table, Tabs, fmtDate } from '@/components/workspace';
import { ListingForm, type Me, type EditableProperty } from '@/components/workspace-member';
import { AuditLog, PlatformSettings, OfflinePaymentForm, VerifyPaymentButton } from '@/components/workspace-extra';
import { KYC_FIELD_LABELS } from '@/components/workspace-member';
import { KycDocsViewer } from '@/components/kyc-documents';
import { EditUserDialog, StaffSection, WebhooksSection, type EditableUser } from '@/components/admin-people';
import { useMe } from '@/hooks/use-auth';

async function notify(userIds: string[], title: string, body: string) {
  if (!userIds.length) return;
  await supabase.from('notifications').insert(userIds.map((user_id) => ({ user_id, title, body })));
}

function useUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: async () => {
    const [{ data: profiles }, { data: roles }, { data: extra }] = await Promise.all([supabase.from('profiles').select('*').order('created_at', { ascending: false }), supabase.from('user_roles').select('user_id,role'), supabase.rpc('admin_list_members')]);
    const ex = new Map((extra ?? []).map((e) => [e.id, e]));
    const map = new Map<string, string[]>(); (roles ?? []).forEach((r) => map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]));
    return ((profiles ?? []) as Profile[]).map((p) => ({ ...p, roles: map.get(p.id) ?? [], role: (map.get(p.id) ?? []).includes('admin') ? 'admin' : (map.get(p.id) ?? [])[0] ?? p.account_type, payment_status: ex.get(p.id)?.payment_status ?? null, last_sign_in_at: ex.get(p.id)?.last_sign_in_at ?? null, lifecycle: ex.get(p.id)?.lifecycle ?? 'verification_required' }));
  } });
}
function useTxns() { return useQuery({ queryKey: ['admin-txns'], queryFn: async () => { const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }); return data ?? []; } }); }
function useLeads() { return useQuery({ queryKey: ['admin-leads'], queryFn: async () => { const { data } = await supabase.from('interests').select('*,properties(ref,title,location,price,seller_id)').order('created_at', { ascending: false }); return data ?? []; } }); }
function useAllProps() { return useQuery({ queryKey: ['admin-props'], queryFn: async () => { const { data } = await supabase.from('properties').select('*,categories(name)').order('created_at', { ascending: false }); return data ?? []; } }); }

export function AdminBody({ section, me }: { section: string; me: Me }) {
  switch (section) {
    case '': return <Overview />;
    case 'users': return <UsersSection />;
    case 'kyc': return <Kyc />;
    case 'properties': return <PropertiesSection />;
    case 'categories': return <Categories />;
    case 'countries': return <CountriesSection />;
    case 'leads': return <Leads />;
    case 'payments': return <Transactions />;
    case 'notifications': return <SendNotification me={me} />;
    case 'integrations': return <Integrations />;
    case 'tickets': return <Tickets />;
    case 'gateway': return <Gateway />;
    case 'settings': return <PlatformSettings payments={<Gateway />} />;
    case 'audit': return <AuditLog />;
    case 'staff': return <StaffSection />;
    case 'webhooks': return <WebhooksSection />;
    default: return null;
  }
}

function Overview() {
  const users = useUsers(); const txns = useTxns(); const leads = useLeads(); const props = useAllProps();
  const kyc = useQuery({ queryKey: ['admin-kyc-count'], queryFn: async () => { const { count } = await supabase.from('kyc_submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'); return count ?? 0; } });
  const u = users.data ?? []; const revenue = (txns.data ?? []).filter((t) => t.status === 'success').reduce((s, t) => s + Number(t.amount), 0);
  return <>
    <div className="stats-grid"><Stat icon={Users} label="Members" value={u.filter((x) => x.role !== 'admin').length} hint={`${u.filter((x) => x.role === 'buyer').length} buyers · ${u.filter((x) => x.role === 'seller').length} sellers`} /><Stat icon={FileCheck} label="KYC awaiting review" value={kyc.data ?? 0} /><Stat icon={Building2} label="Properties pending" value={(props.data ?? []).filter((p) => ['pending', 'under_review'].includes(p.status)).length} hint={`${(props.data ?? []).filter((p) => p.status === 'published').length} live`} /><Stat icon={CreditCard} label="Revenue collected" value={formatINR(revenue)} /></div>
    <div className="dash-grid"><Panel title="Newest buyer interests" action={<SectionLink role="admin" slug="leads" className="text-link">All</SectionLink>}><Table headers={['Buyer', 'Property', 'Status', 'Date']} empty="No interests yet." rows={(leads.data ?? []).slice(0, 6).map((l) => [<div><strong>{l.name}</strong><small className="block muted">{l.phone}</small></div>, l.properties?.title ?? '—', <Status value={l.status} />, fmtDate(l.created_at)])} /></Panel>
      <div className="dash-side"><Panel title="Recent transactions" action={<SectionLink role="admin" slug="payments" className="text-link">All</SectionLink>}>{(txns.data ?? []).slice(0, 5).map((t) => <div className="mini-row" key={t.id}><div><strong>{t.payer_name ?? '—'}</strong><small>{t.reference} · {fmtDate(t.created_at)}</small></div><span>₹{Number(t.amount).toLocaleString('en-IN')}</span></div>)}{!txns.data?.length && <p className="muted">No transactions yet.</p>}</Panel>
        <Panel title="Needs attention">{u.filter((x) => x.role !== 'admin' && effectiveStatus(x) === 'suspended').length} suspended accounts · {u.filter((x) => x.role !== 'admin' && x.verification_status === 'not_submitted' && effectiveStatus(x) !== 'suspended').length} awaiting verification</Panel></div></div>
  </>;
}

const blank = { full_name: '', email: '', password: '', mobile: '', dob: '', gender: '', country: 'India', state: '', city: '', address: '', pincode: '', company_name: '', business_type: '' };
function CreateUser({ onDone }: { onDone: () => void }) {
  const create = useServerFn(adminCreateUser); const qc = useQueryClient();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer'); const [pay, setPay] = useState<'none' | 'offline_paid' | 'waived'>('offline_paid'); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const fields: [keyof typeof blank, string, string?][] = [['full_name', 'Full name *'], ['email', 'Email *', 'email'], ['mobile', 'Mobile *', 'tel'], ['password', 'Temporary password * (min 8)', 'text'], ['gender', 'Gender'], ['country', 'Country'], ['state', 'State'], ['city', 'City'], ['pincode', 'Pincode'], ['address', 'Full address']];
  return <form className="panel create-user" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const d = { ...blank }; (Object.keys(blank) as (keyof typeof blank)[]).forEach((k) => { d[k] = String(f.get(k) ?? ''); }); setBusy(true); setErr('');
    const res = await create({ data: { ...d, role, recordPayment: pay } }).catch(() => ({ ok: false as const, error: 'Please check the details (valid email, mobile, password of 8+ characters).' }));
    setBusy(false); if (!res.ok) { setErr(res.error); return; }
    toast.success(`${role === 'buyer' ? 'Buyer' : 'Seller'} account created`); qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-txns'] }); onDone();
  }}>
    <div className="panel-head"><h2>Create user</h2><Button type="button" variant="ghost" size="icon" onClick={onDone} aria-label="Close"><X /></Button></div>
    <p className="muted">Same details as registration. No OTP needed — the account is active immediately and the member can log in with this email and password.</p>
    <Tabs value={role} onChange={(v) => setRole(v as 'buyer' | 'seller')} options={[['buyer', 'Buyer'], ['seller', 'Seller']]} />
    <div className="form-grid">{fields.map(([k, l, t]) => <div key={k} className={`field ${k === 'address' ? 'full' : ''}`}><label>{l}</label><input name={k} type={t ?? 'text'} className="field-input" required={l.includes('*')} minLength={k === 'password' ? 8 : undefined} defaultValue={blank[k]} /></div>)}
      <div className="field full"><label>Date of birth</label><DobInput name="dob" /></div>
      {role === 'seller' && <><div className="field"><label>Company / business name</label><input name="company_name" className="field-input" /></div><div className="field"><label>Business type</label><input name="business_type" className="field-input" /></div></>}
      <div className="field full"><label>Activation fee</label><select className="field-input" value={pay} onChange={(e) => setPay(e.target.value as typeof pay)}><option value="offline_paid">Paid offline — record transaction</option><option value="waived">Waived — record as waived</option><option value="none">Do not record</option></select></div></div>
    {err && <p className="form-error">{err}</p>}
    <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button></div>
  </form>;
}

function UsersSection() {
  const users = useUsers(); const qc = useQueryClient();
  const [role, setRole] = useState('all'); const [status, setStatus] = useState(''); const [kyc, setKyc] = useState(''); const [q, setQ] = useState(''); const [creating, setCreating] = useState(false); const [open, setOpen] = useState<string | null>(null); const [delUser, setDelUser] = useState<DeleteTarget | null>(null); const [editUser, setEditUser] = useState<EditableUser | null>(null); const { data: meData } = useMe(); const isMaster = !!meData?.isMaster;
  const list = (users.data ?? []).filter((u) => (role === 'all' || u.role === role) && (!status || (u.role !== 'admin' && u.lifecycle === status)) && (!kyc || u.verification_status === kyc) && `${u.full_name} ${u.email} ${u.mobile ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const reopen = async (id: string) => { const note = prompt('Why is verification being reopened? (shown to the member)'); if (!note) return; const { error } = await supabase.from('profiles').update({ verification_status: 'changes_required' }).eq('id', id); if (error) { toast.error('Could not reopen'); return; } await notify([id], 'Verification reopened', `Please review and resubmit your verification. ${note}`); toast.success('Verification reopened'); qc.invalidateQueries({ queryKey: ['admin-users'] }); };
  const setUserStatus = async (id: string, s: 'active' | 'suspended' | 'blocked') => { const { data: cfg } = await supabase.from('platform_settings').select('verification_days').eq('id', 1).maybeSingle(); const days = cfg?.verification_days ?? 7; const patch = s === 'active' ? { status: 'active', verification_due_at: new Date(Date.now() + days * 86400000).toISOString() } : { status: s }; const { error } = await supabase.from('profiles').update(patch).eq('id', id); if (error) { toast.error('Update failed'); return; } await notify([id], s === 'active' ? 'Account reactivated' : s === 'blocked' ? 'Account blocked' : 'Account suspended', s === 'active' ? `Your account is active again. Please complete verification within ${days} days.` : s === 'blocked' ? 'Your account has been blocked by Eliteoz. Please contact support.' : 'Your account has been suspended. Please contact support or complete verification.'); toast.success(s === 'active' ? 'User activated' : s === 'blocked' ? 'User blocked' : 'User suspended'); qc.invalidateQueries({ queryKey: ['admin-users'] }); };
  const deact = useServerFn(adminDeactivateUser);
  const deactivate = async (id: string, email: string) => { const typed = prompt(`Permanently deactivate ${email}? This cannot be undone and the member will no longer be able to sign in.\n\nType DEACTIVATE to confirm:`); if (typed !== 'DEACTIVATE') return; const reason = prompt('Reason (recorded in the audit log):'); if (!reason || reason.trim().length < 3) { toast.error('A reason is required'); return; } const r = await deact({ data: { userId: id, reason } }).catch(() => ({ ok: false as const, error: 'Could not deactivate' })); if (!r.ok) { toast.error(r.error); return; } toast.success('Account deactivated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); };
  const editCompany = async (u: { id: string; company_name: string | null; business_type: string | null }) => { const c = prompt('Company / business name:', u.company_name ?? ''); if (c === null) return; const b = prompt('Business type:', u.business_type ?? ''); if (b === null) return; const { error } = await supabase.from('profiles').update({ company_name: c.trim() || null, business_type: b.trim() || null }).eq('id', u.id); if (error) { toast.error('Update failed'); return; } await notify([u.id], 'Company details updated', 'The Eliteoz team has updated your company details.'); toast.success('Company details updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); };
  const count = (r: string) => (users.data ?? []).filter((u) => r === 'all' || u.role === r).length;
  return <>
    {creating ? <CreateUser onDone={() => setCreating(false)} /> : null}
    <Panel action={!creating && <Button onClick={() => setCreating(true)}><Plus /> Create user</Button>}>
      <Tabs value={role} onChange={setRole} options={[['all', `All (${count('all')})`], ['buyer', `Buyers (${count('buyer')})`], ['seller', `Sellers (${count('seller')})`], ['admin', `Admins (${count('admin')})`]]} />
      <div className="toolbar"><input className="field-input" placeholder="Search name, email or mobile" value={q} onChange={(e) => setQ(e.target.value)} /><select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any stage</option><option value="pending_payment">Pending payment</option><option value="payment_failed">Payment failed</option><option value="verification_required">Verification required</option><option value="verification_pending">Verification pending</option><option value="resubmission_required">Resubmission required</option><option value="verified">Verified / Active</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option></select><select className="field-input" value={kyc} onChange={(e) => setKyc(e.target.value)}><option value="">Any verification</option><option value="not_submitted">Not submitted</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
      <Table headers={['Member', 'Role', 'Verification', 'Stage', 'Payment', 'Joined / last active', '']} empty="No users match these filters." rows={list.flatMap((u) => { const st = u.role === 'admin' ? 'active' : effectiveStatus(u); const row = [<button className="cell-user" onClick={() => setOpen(open === u.id ? null : u.id)}><span className="avatar sm">{(u.full_name || u.email).slice(0, 2).toUpperCase()}</span><div><strong>{u.full_name || '—'}</strong><small>{u.email}</small></div></button>, <Status value={u.role} />, <div><Status value={u.verification_status} />{u.role !== 'admin' && !['submitted', 'approved'].includes(u.verification_status) && st !== 'suspended' && <small className="block muted">{daysLeft(u.verification_due_at)}d left</small>}</div>, <Status value={u.role === 'admin' ? 'active' : u.lifecycle} />, u.payment_status ? <Status value={u.payment_status} /> : <span className="muted">—</span>, <div>{fmtDate(u.created_at)}<small className="block muted">{u.last_sign_in_at ? `Active ${fmtDate(u.last_sign_in_at)}` : 'Never signed in'}</small></div>, u.role === 'admin' ? '' : u.status === 'deactivated' ? <div className="row-actions"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDelUser(u)}><Trash2 size={14} /> Delete</Button></div> : <div className="row-actions"><Button size="sm" variant="ghost" onClick={() => setOpen(open === u.id ? null : u.id)}>{open === u.id ? 'Hide' : 'View'}</Button><Button size="sm" variant="outline" aria-label="Edit user" onClick={() => setEditUser(u as EditableUser)}><Pencil size={14} /> Edit</Button>{u.role === 'seller' && <Button size="sm" variant="ghost" aria-label="Edit company" onClick={() => editCompany(u)}><Pencil size={14} /></Button>}{u.status === 'pending_payment' ? null : st !== 'active' ? <Button size="sm" variant="outline" onClick={() => setUserStatus(u.id, 'active')}>Activate</Button> : <Button size="sm" variant="ghost" onClick={() => confirm('Suspend this user?') && setUserStatus(u.id, 'suspended')}>Suspend</Button>}{u.verification_status === 'approved' && <Button size="sm" variant="ghost" onClick={() => reopen(u.id)}>Reopen verification</Button>}{st !== 'blocked' && <Button size="sm" variant="ghost" onClick={() => confirm('Block this user? They will lose access until you reactivate them.') && setUserStatus(u.id, 'blocked')}>Block</Button>}<Button size="sm" variant="ghost" onClick={() => deactivate(u.id, u.email)}>Deactivate</Button></div>];
        return open === u.id ? [row, [<div className="user-detail" style={{ gridColumn: '1/-1' }}>{([['Mobile', u.mobile], ['Date of birth', u.dob], ['Gender', u.gender], ['Country', u.country], ['State', u.state], ['City', u.city], ['Pincode', u.pincode], ['Address', u.address], ['Company', u.company_name], ['Business type', u.business_type], ['Activated', fmtDate(u.activated_at)], ['Verify by', fmtDate(u.verification_due_at)], ['Created by admin', u.created_by_admin ? 'Yes' : 'No'], ['Mobile OTP verified', (u as { mobile_verified?: boolean }).mobile_verified ? 'Yes' : 'No']] as [string, string | null][]).map(([l, v]) => <div key={l}><span>{l}</span><strong>{v || '—'}</strong></div>)}</div>, '', '', '', '', '', '']] : [row]; })} />
    </Panel>
    <DeleteUserDialog user={delUser} onClose={() => setDelUser(null)} />
    <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onDelete={isMaster ? (u) => { setEditUser(null); setDelUser({ ...u, role: u.account_type } as DeleteTarget); } : undefined} />
  </>;
}

function Kyc() {
  const qc = useQueryClient(); const [tab, setTab] = useState('submitted');
  const q = useQuery({ queryKey: ['admin-kyc'], queryFn: async () => { const [{ data: subs }, { data: profs }] = await Promise.all([supabase.from('kyc_submissions').select('*').order('created_at', { ascending: false }), supabase.from('profiles').select('id,full_name,email,account_type')]); const m = new Map((profs ?? []).map((p) => [p.id, p])); return (subs ?? []).map((s) => ({ ...s, profile: m.get(s.user_id) })); } });
  const review = async (id: string, userId: string, status: 'approved' | 'rejected' | 'changes_required') => {
    let note: string | null = null; let fields: string[] = [];
    if (status !== 'approved') { note = prompt(status === 'rejected' ? 'Reason for rejection (shown to the member):' : 'What needs to be changed? (shown to the member)') ?? ''; if (!note) return; }
    if (status === 'changes_required') { const keys = Object.keys(KYC_FIELD_LABELS); const ans = prompt(`Which fields must be corrected? Enter numbers separated by commas:\n${keys.map((k, i) => `${i + 1}. ${KYC_FIELD_LABELS[k]}`).join('\n')}`) ?? ''; fields = ans.split(',').map((x) => keys[Number(x.trim()) - 1]).filter((x): x is string => !!x); if (!fields.length) { toast.error('Pick at least one field'); return; } }
    const { error } = await supabase.from('kyc_submissions').update({ status, admin_note: note, required_fields: fields, reviewed_at: new Date().toISOString() }).eq('id', id); if (error) { toast.error('Update failed'); return; }
    await notify([userId], status === 'approved' ? 'Verification approved' : status === 'rejected' ? 'Verification rejected' : 'Verification needs changes', status === 'approved' ? 'Congratulations — your Eliteoz account is now verified.' : status === 'rejected' ? `Your verification was not approved: ${note}. Please resubmit.` : `Please correct: ${fields.map((f) => KYC_FIELD_LABELS[f]).join(', ')}. Remarks: ${note}`);
    toast.success('Saved'); qc.invalidateQueries({ queryKey: ['admin-kyc'] }); qc.invalidateQueries({ queryKey: ['admin-users'] }); };
  const list = (q.data ?? []).filter((s) => tab === 'all' || s.status === tab);
  return <Panel><Tabs value={tab} onChange={setTab} options={[['submitted', 'Awaiting review'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']]} />
    <Table headers={['Member', 'PAN / ID', 'Bank', 'Submitted', 'Status', '']} empty="No submissions here." rows={list.map((s) => [<div><strong>{s.profile?.full_name}</strong><small className="block muted">{s.profile?.email} · {s.profile?.account_type}</small></div>, <div><code>{s.pan}</code><small className="block muted">{s.gov_id}{s.gst ? ` · GST ${s.gst}` : ''}</small></div>, <div>{s.bank_name}<small className="block muted">{s.account_holder} · {s.account_number} · {s.ifsc}</small></div>, fmtDate(s.created_at), <Status value={s.status} />, s.status === 'submitted' ? <div className="row-actions"><KycDocsViewer submissionId={s.id} /><Button size="sm" onClick={() => review(s.id, s.user_id, 'approved')}>Approve</Button><Button size="sm" variant="outline" onClick={() => review(s.id, s.user_id, 'changes_required')}>Request changes</Button><Button size="sm" variant="ghost" onClick={() => review(s.id, s.user_id, 'rejected')}>Reject</Button></div> : <div className="row-actions"><KycDocsViewer submissionId={s.id} /><small>{s.admin_note ?? ''}{s.required_fields?.length ? <span className="block muted">Fields: {s.required_fields.map((f) => KYC_FIELD_LABELS[f] ?? f).join(', ')}</span> : null}</small></div>])} /></Panel>;
}

const PROP_ACTIONS: Record<string, [string, string, boolean][]> = {
  // [label, target status, needs reason]
  pending: [['Start review', 'under_review', false], ['Approve', 'approved', false], ['Request changes', 'changes_required', true], ['Reject', 'rejected', true]],
  under_review: [['Approve', 'approved', false], ['Request changes', 'changes_required', true], ['Reject', 'rejected', true]],
  approved: [['Publish', 'published', false], ['Request changes', 'changes_required', true], ['Reject', 'rejected', true]],
  published: [['Unpublish', 'unpublished', true], ['Suspend', 'suspended', true], ['Mark sold', 'sold', false]],
  unpublished: [['Re-publish', 'published', false], ['Suspend', 'suspended', true]],
  suspended: [['Re-publish', 'published', false], ['Reject', 'rejected', true]],
};
const PROP_MSG: Record<string, string> = { under_review: 'is now under review', approved: 'has been approved and will be published shortly', published: 'is now live on Eliteoz', changes_required: 'needs changes before it can go live', rejected: 'was not approved', unpublished: 'has been unpublished', suspended: 'has been suspended', sold: 'has been marked as sold' };

function PropertiesSection() {
  const { data: meData } = useMe(); const [formMode, setFormMode] = useState<null | 'new' | EditableProperty>(null); const [src, setSrc] = useState(''); const [sort, setSort] = useState('newest');
  const qc = useQueryClient(); const props = useAllProps(); const users = useUsers(); const [tab, setTab] = useState('review'); const [cat, setCat] = useState(''); const [q, setQ] = useState(''); const [mk, setMk] = useState(''); const [cc, setCc] = useState(''); const [sel, setSel] = useState(''); const [enq, setEnq] = useState(''); const [ver, setVer] = useState(''); const leads = useLeads();
  const all = props.data ?? []; const n = (...st: string[]) => all.filter((p) => st.includes(p.status)).length;
  const seller = new Map((users.data ?? []).map((u) => [u.id, u]));
  const cats = [...new Set(all.map((p) => p.categories?.name).filter(Boolean))] as string[];
  const move = async (p: { id: string; seller_id: string | null; title: string }, status: string, needsReason: boolean) => {
    let note: string | null = null;
    if (needsReason) { note = prompt(`Reason (shown to the seller):`)?.trim() ?? ''; if (!note) return; }
    const patch: { status: string; admin_note?: string | null } = { status }; if (needsReason) patch.admin_note = note; else if (['approved', 'published', 'under_review'].includes(status)) patch.admin_note = null;
    const { error } = await supabase.from('properties').update(patch).eq('id', p.id);
    if (error) { toast.error(error.message.includes('approved before') ? 'Approve the property before publishing.' : 'Update failed'); return; }
    if (p.seller_id) await notify([p.seller_id], `Property update: ${p.title}`, `${p.title} ${PROP_MSG[status] ?? 'was updated'}.${note ? ` Reason: ${note}` : ''}`);
    toast.success('Saved'); qc.invalidateQueries({ queryKey: ['admin-props'] });
  };
  const feature = async (p: { id: string; featured: boolean }) => { const { error } = await supabase.from('properties').update({ featured: !p.featured }).eq('id', p.id); if (error) toast.error('Update failed'); else qc.invalidateQueries({ queryKey: ['admin-props'] }); };
  const inTab = (st: string, featured: boolean) => tab === 'all' || (tab === 'review' ? ['pending', 'under_review'].includes(st) : tab === 'featured' ? featured : st === tab);
  const enquired = new Set((leads.data ?? []).map((l) => l.property_id));
  const byCountry = [...all.reduce((m, p) => m.set(p.country, (m.get(p.country) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
  const countryOpts = [...new Map(all.map((p) => [p.country_code, p.country])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const sellerOpts = [...new Set(all.map((p) => p.seller_id).filter(Boolean))] as string[];
  const remove = async (p: { id: string; title: string }) => { if (!confirm(`Permanently delete "${p.title}"?`)) return; const { error } = await supabase.from('properties').delete().eq('id', p.id); if (error) toast.error('Delete failed'); else { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-props'] }); } };
  const list = all.filter((p) => inTab(p.status, p.featured) && (!cat || p.categories?.name === cat) && (!mk || p.market === mk) && (!cc || p.country_code === cc) && (!sel || p.seller_id === sel) && (!enq || (enq === 'yes') === enquired.has(p.id)) && (!ver || seller.get(p.seller_id ?? '')?.verification_status === ver) && (!src || p.created_by_role === src) && `${p.title} ${p.ref} ${p.location} ${seller.get(p.seller_id ?? '')?.full_name ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  list.sort((a, b) => sort === 'price_desc' ? Number(b.price_in_inr ?? b.price) - Number(a.price_in_inr ?? a.price) : sort === 'price_asc' ? Number(a.price_in_inr ?? a.price) - Number(b.price_in_inr ?? b.price) : sort === 'oldest' ? a.created_at.localeCompare(b.created_at) : sort === 'title' ? a.title.localeCompare(b.title) : b.created_at.localeCompare(a.created_at));
  if (formMode && meData) return <><div className="toolbar"><Button variant="outline" onClick={() => setFormMode(null)}><X size={15} /> Back to all properties</Button><strong>{formMode === 'new' ? 'Add property (Master Admin listing)' : `Edit: ${formMode.title}`}</strong></div><ListingForm key={formMode === 'new' ? 'new' : formMode.id} me={meData} admin edit={formMode === 'new' ? undefined : formMode} onDone={() => setFormMode(null)} /></>;
  return <>
    <div className="toolbar"><Button onClick={() => setFormMode('new')}><Plus size={15} /> Add property</Button></div>
    <div className="stats-grid"><Stat icon={Building2} label="Total properties" value={all.length} hint={`${n('draft')} drafts`} /><Stat icon={FileCheck} label="Pending review" value={n('pending', 'under_review')} hint={`${n('approved')} approved, not yet live`} /><Stat icon={Eye} label="Published" value={n('published')} hint={`${n('sold')} sold / closed`} /><Stat icon={AlertTriangle} label="Rejected / suspended" value={n('rejected') + n('suspended')} hint={`${n('changes_required')} awaiting seller changes`} /></div>
    <div className="stats-grid"><Stat icon={Building2} label="India properties" value={all.filter((p) => p.market === 'india').length} /><Stat icon={Globe} label="Global properties" value={all.filter((p) => p.market === 'international').length} hint={`${countryOpts.length} countries`} /><Stat icon={BadgeCheck} label="Approved / live" value={n('approved', 'published')} /><Stat icon={Globe} label="Top markets" value={byCountry[0]?.[0] ?? '—'} hint={byCountry.slice(0, 4).map(([c, k]) => `${c} ${k}`).join(' · ')} /></div>
    <Panel><Tabs value={tab} onChange={setTab} options={[['review', `Review (${n('pending', 'under_review')})`], ['approved', 'Approved'], ['published', 'Published'], ['changes_required', 'Changes required'], ['rejected', 'Rejected'], ['suspended', 'Suspended'], ['unpublished', 'Unpublished'], ['sold', 'Sold'], ['draft', 'Drafts'], ['featured', 'Featured'], ['all', 'All']]} />
    <div className="toolbar wrap"><input className="field-input" placeholder="Search title, ref, location or seller" value={q} onChange={(e) => setQ(e.target.value)} /><select className="field-input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      <MarketTabs value={mk} onChange={(v) => { setMk(v); setCc(''); }} />
      <select className="field-input" value={cc} onChange={(e) => setCc(e.target.value)} aria-label="Country"><option value="">All countries</option>{countryOpts.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <select className="field-input" value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Seller"><option value="">All sellers</option>{sellerOpts.map((id) => <option key={id} value={id}>{seller.get(id)?.full_name ?? id.slice(0, 8)}</option>)}</select>
      <select className="field-input" value={enq} onChange={(e) => setEnq(e.target.value)} aria-label="Buyer enquiry"><option value="">Any enquiry</option><option value="yes">Has buyer enquiry</option><option value="no">No enquiry</option></select>
      <select className="field-input" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="Source"><option value="">Any source</option><option value="seller">Seller listings</option><option value="admin">Admin listings</option></select><select className="field-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price_desc">Price: high to low</option><option value="price_asc">Price: low to high</option><option value="title">Title A–Z</option></select><select className="field-input" value={ver} onChange={(e) => setVer(e.target.value)} aria-label="Seller verification"><option value="">Any seller verification</option>{['not_submitted', 'submitted', 'approved', 'rejected', 'changes_required'].map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}</select></div>
    <Table headers={['Property', 'Created by', 'Price', 'Status', 'Added', '']} empty={props.isLoading ? 'Loading…' : props.isError ? 'Could not load properties.' : 'No properties here.'} rows={list.map((p) => { const s = seller.get(p.seller_id ?? ''); return [
      <div className="cell-prop"><img src={coverOf(p)} alt="" /><div><strong>{p.title}</strong><small>{p.ref} · {p.location} · {p.categories?.name ?? 'No category'}</small><MarketBadge market={p.market} country={p.country} code={p.country_code} />{p.admin_note && <small className="muted">Note: {p.admin_note}</small>}</div></div>,
      p.created_by_role === 'admin' ? <div><strong>Master Admin</strong><small className="block muted">Source: Admin</small></div> : s ? <div><strong>{s.full_name}</strong><small className="block muted">Source: Seller · {s.email}</small><small className="block muted">Verification: {s.verification_status.replace('_', ' ')} · {s.status}</small></div> : '—',
      <div>{formatMoney(Number(p.price), p.currency)}{p.currency !== 'INR' && p.price_in_inr ? <small className="block muted">≈ {formatINR(Number(p.price_in_inr))}</small> : null}</div>, <Status value={p.status} />, fmtDate(p.created_at),
      <div className="row-actions"><DocsButton docs={p.documents ?? []} gallery={p.gallery ?? []} /><Button size="sm" variant="outline" onClick={() => setFormMode(p as unknown as EditableProperty)}><Pencil size={14} /> Edit</Button>{p.created_by_role === 'admin' && ['draft', 'pending', 'under_review', 'changes_required', 'rejected'].includes(p.status) && <Button size="sm" onClick={() => move(p, 'published', false)}>Publish now</Button>}{(PROP_ACTIONS[p.status] ?? []).map(([l, st, r]) => <Button key={st} size="sm" variant={st === 'published' || st === 'approved' ? 'default' : 'outline'} onClick={() => move(p, st, r)}>{l}</Button>)}<Button size="sm" variant="ghost" aria-label="Toggle featured" onClick={() => feature(p)}><Star size={15} fill={p.featured ? 'currentColor' : 'none'} /></Button>{p.status === 'published' && <Button size="sm" variant="ghost" asChild><Link to="/properties/$id" params={{ id: p.ref }}>View</Link></Button>}<Button size="sm" variant="ghost" aria-label="Delete" onClick={() => remove(p)}><Trash2 size={15} /></Button></div>]; })} /></Panel>
  </>;
}

function CountriesSection() {
  const qc = useQueryClient(); const q = useCountries(true); const [f, setF] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['countries'] });
  const save = async (code: string, patch: { active?: boolean; inr_rate?: number | null; currency?: string }) => { const { error } = await supabase.from('countries').update(patch).eq('code', code); if (error) toast.error('Update failed'); else refresh(); };
  const add = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = new FormData(e.currentTarget); const code = String(d.get('code')).trim().toUpperCase(); const name = String(d.get('name')).trim(); const currency = String(d.get('currency')).trim().toUpperCase(); const rate = Number(d.get('rate')) || null;
    if (!/^[A-Z]{2}$/.test(code) || !/^[A-Z]{3}$/.test(currency) || name.length < 2) { toast.error('Use a 2-letter ISO code, a name and a 3-letter currency.'); return; }
    const { error } = await supabase.from('countries').insert({ code, name: name.slice(0, 80), currency, inr_rate: rate }); if (error) toast.error(error.code === '23505' ? 'That country already exists.' : 'Could not add'); else { toast.success('Country added'); e.currentTarget.reset(); refresh(); } };
  const list = (q.data ?? []).filter((c) => `${c.name} ${c.code} ${c.currency}`.toLowerCase().includes(f.toLowerCase()));
  return <>
    <Panel title="Add a country"><form className="toolbar wrap" onSubmit={add}><input name="code" className="field-input" placeholder="ISO code (e.g. FR)" maxLength={2} required /><input name="name" className="field-input" placeholder="Country name" required /><input name="currency" className="field-input" placeholder="Currency (e.g. EUR)" maxLength={3} required /><input name="rate" type="number" step="any" min={0} className="field-input" placeholder="1 unit = ₹ ?" /><Button type="submit">Add</Button></form></Panel>
    <Panel title="Supported countries" action={<input className="field-input" placeholder="Search" value={f} onChange={(e) => setF(e.target.value)} />}>
      <p className="muted">INR rates are set manually here and used for approximate INR prices shown to buyers. Inactive countries are hidden from sellers.</p>
      <Table headers={['Country', 'ISO', 'Currency', '1 unit = ₹', 'Active']} empty="No countries." rows={list.map((c) => [<strong>{flagOf(c.code)} {c.name}</strong>, c.code, c.currency, <input className="field-input" type="number" step="any" min={0} defaultValue={c.inr_rate ?? ''} disabled={c.code === 'IN'} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== c.inr_rate) void save(c.code, { inr_rate: v }); }} style={{ maxWidth: 120 }} />, <Button size="sm" variant={c.active ? 'default' : 'outline'} disabled={c.code === 'IN'} onClick={() => save(c.code, { active: !c.active })}>{c.active ? 'Active' : 'Inactive'}</Button>])} />
    </Panel>
  </>;
}

function Categories() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-cats'], queryFn: async () => { const [{ data: cats }, { data: props }] = await Promise.all([supabase.from('categories').select('*').order('name'), supabase.from('properties').select('category_id')]); return (cats ?? []).map((c) => ({ ...c, count: (props ?? []).filter((p) => p.category_id === c.id).length })); } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-cats'] }); qc.invalidateQueries({ queryKey: ['categories-active'] }); qc.invalidateQueries({ queryKey: ['public-properties'] }); };
  return <div className="dash-grid"><Panel title="All categories"><Table headers={['Category', 'Properties', 'Visible', '']} rows={(q.data ?? []).map((c) => [<div><strong>{c.name}</strong><small className="block muted">{c.description}</small></div>, c.count, <Status value={c.active ? 'active' : 'hidden'} />, <div className="row-actions"><Button size="sm" variant="ghost" onClick={async () => { await supabase.from('categories').update({ active: !c.active }).eq('id', c.id); refresh(); }}>{c.active ? 'Hide' : 'Show'}</Button><Button size="sm" variant="ghost" aria-label="Delete" onClick={async () => { if (!confirm(`Delete ${c.name}? Properties keep existing but lose this category.`)) return; await supabase.from('categories').delete().eq('id', c.id); refresh(); }}><Trash2 size={15} /></Button></div>])} /></Panel>
    <form className="panel" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const { error } = await supabase.from('categories').insert({ name: String(f.get('name')).trim().slice(0, 60), description: String(f.get('description') ?? '').slice(0, 200) }); if (error) { toast.error(error.code === '23505' ? 'This category already exists' : 'Could not create'); return; } toast.success('Category created'); form.reset(); refresh(); }}><h2>New category</h2><p className="muted">Sellers choose from these when adding a property; buyers can browse by them.</p><div className="field"><label>Name</label><input name="name" required className="field-input" /></div><div className="field"><label>Description</label><input name="description" className="field-input" /></div><div className="form-actions"><Button type="submit"><Plus /> Create category</Button></div></form></div>;
}

function Leads() {
  const qc = useQueryClient(); const leads = useLeads(); const [tab, setTab] = useState('all'); const [q, setQ] = useState('');
  const list = (leads.data ?? []).filter((l) => (tab === 'all' || l.status === tab) && `${l.name} ${l.email} ${l.phone} ${l.properties?.title ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const update = async (l: { id: string; buyer_id: string; properties: { title: string } | null }, status: string) => { const note = prompt('Note for the buyer (optional):') ?? null; const { error } = await supabase.from('interests').update({ status, admin_note: note || null }).eq('id', l.id); if (error) { toast.error('Update failed'); return; } await notify([l.buyer_id], 'Update on your interest', `${l.properties?.title}: status is now ${status}.${note ? ' ' + note : ''}`); toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-leads'] }); };
  return <Panel><Tabs value={tab} onChange={setTab} options={[['all', `All (${leads.data?.length ?? 0})`], ['new', 'New'], ['contacted', 'Contacted'], ['closed', 'Closed']]} />
    <div className="toolbar"><input className="field-input" placeholder="Search buyer or property" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <Table headers={['Buyer', 'Contact', 'Property', 'Message', 'Status', 'Date', '']} empty="No buyer interests yet." rows={list.map((l) => [<strong>{l.name}</strong>, <div>{l.phone}<small className="block muted">{l.email}</small></div>, <div>{l.properties?.title}<small className="block muted">{l.properties?.location}</small></div>, <small>{l.message || '—'}{l.preferred_time ? ` · ${l.preferred_time}` : ''}</small>, <Status value={l.status} />, fmtDate(l.created_at), <div className="row-actions">{l.status !== 'contacted' && <Button size="sm" variant="outline" onClick={() => update(l, 'contacted')}>Contacted</Button>}{l.status !== 'closed' && <Button size="sm" variant="ghost" onClick={() => update(l, 'closed')}>Close</Button>}</div>])} /></Panel>;
}

function Transactions() {
  const txns = useTxns(); const users = useUsers();
  const [status, setStatus] = useState(''); const [method, setMethod] = useState(''); const [purpose, setPurpose] = useState(''); const [role, setRole] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [q, setQ] = useState('');
  const roleOf = useMemo(() => new Map((users.data ?? []).map((u) => [u.id, u.role])), [users.data]);
  const all = txns.data ?? [];
  const list = all.filter((t) => (!status || t.status === status) && (!method || t.method === method) && (!purpose || t.purpose === purpose) && (!role || roleOf.get(t.user_id ?? '') === role) && (!from || t.created_at >= from) && (!to || t.created_at <= to + 'T23:59:59') && `${t.reference} ${t.payer_name ?? ''} ${t.payer_email ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const sum = (s: string) => list.filter((t) => t.status === s).reduce((a, t) => a + Number(t.amount), 0);
  const uniq = (k: 'status' | 'method' | 'purpose') => [...new Set(all.map((t) => t[k]))];
  const exportCsv = () => { const rows = [['Reference', 'Name', 'Email', 'Role', 'Purpose', 'Method', 'Status', 'Amount', 'Date'], ...list.map((t) => [t.reference, t.payer_name ?? '', t.payer_email ?? '', roleOf.get(t.user_id ?? '') ?? '', t.purpose, t.method, t.status, String(t.amount), t.created_at])]; const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'eliteoz-transactions.csv'; a.click(); };
  return <>
    <div className="stats-grid"><Stat label="Successful" value={formatINR(sum('success'))} /><Stat label="Pending" value={formatINR(sum('pending'))} /><Stat label="Failed" value={formatINR(sum('failed'))} /><Stat label="Transactions shown" value={list.length} /></div>
    <OfflinePaymentForm users={(users.data ?? []).filter((u) => u.role !== 'admin').map((u) => ({ id: u.id, name: u.full_name || u.email, email: u.email }))} />
    <Panel title="Transactions" action={<Button size="sm" variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>}>
      <div className="toolbar wrap"><input className="field-input" placeholder="Reference, name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option>{uniq('status').map((x) => <option key={x}>{x}</option>)}</select>
        <select className="field-input" value={method} onChange={(e) => setMethod(e.target.value)}><option value="">Any method</option>{uniq('method').map((x) => <option key={x}>{x}</option>)}</select>
        <select className="field-input" value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">Any purpose</option>{uniq('purpose').map((x) => <option key={x}>{x}</option>)}</select>
        <select className="field-input" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Buyers & sellers</option><option value="buyer">Buyers</option><option value="seller">Sellers</option></select>
        <label className="date-f">From <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="date-f">To <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {(status || method || purpose || role || from || to || q) && <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setMethod(''); setPurpose(''); setRole(''); setFrom(''); setTo(''); setQ(''); }}>Clear</Button>}</div>
      <Table headers={['Reference', 'Payer', 'Role', 'Purpose', 'Method', 'Amount', 'Status', 'Date', '']} empty="No transactions match these filters." rows={list.map((t) => [<code>{t.reference}</code>, <div><strong>{t.payer_name}</strong><small className="block muted">{t.payer_email}</small></div>, roleOf.get(t.user_id ?? '') ?? '—', t.purpose, t.method.replaceAll('_', ' '), `₹ ${Number(t.amount).toLocaleString('en-IN')}`, <Status value={t.status} />, fmtDate(t.payment_date ?? t.created_at), <VerifyPaymentButton t={t} />])} />
    </Panel>
  </>;
}

function SendNotification({ me }: { me: Me }) {
  const users = useUsers(); const [aud, setAud] = useState('all'); const [target, setTarget] = useState(''); const [busy, setBusy] = useState(false);
  const history = useQuery({ queryKey: ['admin-notif-history'], queryFn: async () => { const { data } = await supabase.from('notifications').select('title,body,created_at').order('created_at', { ascending: false }).limit(200); const seen = new Set<string>(); return (data ?? []).filter((n) => { const k = n.title + n.body; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10); } });
  const members = (users.data ?? []).filter((u) => u.role !== 'admin' && u.id !== me.user.id);
  const recipients = aud === 'user' ? members.filter((u) => u.id === target) : members.filter((u) => aud === 'all' || u.role === aud);
  return <div className="dash-grid"><form className="panel" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); if (!recipients.length) { toast.error('No recipients selected'); return; } setBusy(true); const { error } = await supabase.from('notifications').insert(recipients.map((u) => ({ user_id: u.id, title: String(f.get('title')).slice(0, 120), body: String(f.get('body')).slice(0, 1000) }))); setBusy(false); if (error) { toast.error('Could not send'); return; } toast.success(`Sent to ${recipients.length} member${recipients.length === 1 ? '' : 's'}`); form.reset(); history.refetch(); }}>
    <h2>Send an update</h2><p className="muted">Appears instantly in each member’s notification centre.</p>
    <Tabs value={aud} onChange={setAud} options={[['all', 'All members'], ['buyer', 'All buyers'], ['seller', 'All sellers'], ['user', 'One member']]} />
    {aud === 'user' && <div className="field"><label>Member</label><select className="field-input" value={target} onChange={(e) => setTarget(e.target.value)} required><option value="">Select member</option>{members.map((u) => <option key={u.id} value={u.id}>{u.full_name} · {u.role} · {u.email}</option>)}</select></div>}
    <div className="field"><label>Title</label><input name="title" required maxLength={120} className="field-input" /></div>
    <div className="field"><label>Message</label><textarea name="body" required rows={4} maxLength={1000} className="field-input" /></div>
    <div className="form-actions"><span className="muted">{recipients.length} recipient{recipients.length === 1 ? '' : 's'}</span><Button type="submit" disabled={busy}><Send /> Send notification</Button></div></form>
    <Panel title="Recently sent">{(history.data ?? []).map((n, i) => <div className="mini-row" key={i}><div><strong>{n.title}</strong><small>{n.body.slice(0, 80)}</small></div><small>{fmtDate(n.created_at)}</small></div>)}</Panel></div>;
}

function Integrations() {
  const items: { title: string; state: string; body: string; icon: typeof Heart }[] = [
    { title: 'Payment gateway', state: 'test mode', body: 'Activation payments are recorded as test transactions. Connect Razorpay or Stripe to collect real payments; its webhook will then confirm each payment automatically.', icon: CreditCard },
    { title: 'Payment webhooks', state: 'waiting', body: 'Becomes active together with the live payment gateway — successful, failed and refunded payments will update transactions automatically.', icon: BadgeCheck },
    { title: 'Email (SMTP)', state: 'waiting', body: 'Password reset emails already work. Branded emails from your own domain (welcome, approvals) need your domain to be connected.', icon: Send },
    { title: 'SMS OTP', state: 'demo', body: 'Registration uses a demo code today. Connect an SMS provider such as MSG91 or Twilio to send real OTPs.', icon: Users },
    { title: 'SEO', state: 'active', body: 'Every public page has its own title and description, and each property page is shareable with its own preview text.', icon: Star },
    { title: 'In-app notifications', state: 'active', body: 'Approvals, verification results, interest updates and admin broadcasts are delivered to member dashboards.', icon: Heart },
  ];
  return <div className="integration-grid">{items.map(({ title, state, body, icon: I }) => <article key={title} className="integration"><div className="flex items-center justify-between"><span className="stat-icon"><I size={17} /></span><Status value={state} /></div><h3>{title}</h3><p>{body}</p></article>)}</div>;
}

function DocsButton({ docs, gallery }: { docs: string[]; gallery: string[] }) {
  const [open, setOpen] = useState(false); const [links, setLinks] = useState<string[]>([]);
  const load = async () => { setOpen(!open); if (links.length || !docs.length) return; const { data } = await supabase.storage.from('property-docs').createSignedUrls(docs, 600); setLinks((data ?? []).map((d) => d.signedUrl ?? '').filter(Boolean)); };
  return <><Button size="sm" variant="outline" onClick={load}><FileText size={14} /> Review ({docs.length})</Button>
    {open && <div className="doc-pop"><div className="panel-head"><strong>Ownership documents</strong><Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close"><X /></Button></div>
      {docs.length ? docs.map((d, i) => <a key={d} className="text-link block" href={links[i]} target="_blank" rel="noreferrer"><FileText size={13} /> {d.split('/').pop()?.replace(/^[0-9a-f-]{36}-/, '')}</a>) : <p className="muted">No documents uploaded.</p>}
      {gallery.length > 0 && <><strong className="block" style={{ marginTop: 12 }}>Photos</strong><div className="doc-thumbs">{gallery.map((g) => <a key={g} href={g} target="_blank" rel="noreferrer"><img src={g} alt="" /></a>)}</div></>}
      <small className="muted">Links expire after 10 minutes. Visible only to Master Admin.</small></div>}</>;
}

function Tickets() {
  const qc = useQueryClient(); const users = useUsers(); const [tab, setTab] = useState('open');
  const q = useQuery({ queryKey: ['admin-tickets'], queryFn: async () => { const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }); return data ?? []; } });
  const who = new Map((users.data ?? []).map((u) => [u.id, u]));
  const reply = async (t: { id: string; user_id: string; subject: string }, status: 'in_progress' | 'resolved') => { const r = prompt('Reply to the member:'); if (r === null) return; const { error } = await supabase.from('support_tickets').update({ status, admin_reply: r || null, updated_at: new Date().toISOString() }).eq('id', t.id); if (error) { toast.error('Update failed'); return; } await notify([t.user_id], `Ticket update: ${t.subject}`, r || `Your ticket is now ${status.replace('_', ' ')}.`); toast.success('Saved'); qc.invalidateQueries({ queryKey: ['admin-tickets'] }); };
  const list = (q.data ?? []).filter((t) => tab === 'all' || t.status === tab);
  return <Panel><Tabs value={tab} onChange={setTab} options={[['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['all', 'All']]} />
    <p className="muted small">To change a seller’s locked company details, open All Users → Details → Edit company.</p>
    <Table headers={['Member', 'Subject', 'Message', 'Status', 'Date', '']} empty="No tickets here." rows={list.map((t) => { const u = who.get(t.user_id); return [<div><strong>{u?.full_name ?? '—'}</strong><small className="block muted">{u?.email} · {u?.role}</small></div>, <strong>{t.subject}</strong>, <small>{t.message}{t.admin_reply ? <span className="block muted">Reply: {t.admin_reply}</span> : null}</small>, <Status value={t.status} />, fmtDate(t.created_at), <div className="row-actions">{t.status !== 'resolved' && <><Button size="sm" variant="outline" onClick={() => reply(t, 'in_progress')}>Reply</Button><Button size="sm" onClick={() => reply(t, 'resolved')}>Resolve</Button></>}</div>]; })} /></Panel>;
}

function Gateway() {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  const getStatus = useServerFn(getGatewayStatus); const save = useServerFn(saveGatewaySettings); const setMode = useServerFn(setPaymentMode);
  const q = useQuery({ queryKey: ['pay-settings'], queryFn: () => getStatus() });
  if (!q.data) return <Panel><p className="muted">Loading…</p></Panel>;
  const s = q.data;
  const hookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/public/razorpay-webhook` : '';
  return <form className="panel" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true);
    const enabled = f.get('enabled') === 'on';
    const r = await save({ data: { enabled, mode: String(f.get('mode')) as 'test' | 'live', keyId: String(f.get('key_id') ?? '').trim(), fee: Number(f.get('fee')) || 0, keySecret: String(f.get('key_secret') ?? '').trim() || undefined, webhookSecret: String(f.get('webhook_secret') ?? '').trim() || undefined } }).catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : 'Could not save' }));
    setBusy(false); if (!r.ok) { toast.error(r.error); return; } toast.success(enabled ? 'Razorpay is ON for new registrations' : 'Payment step is OFF — registrations skip payment'); qc.invalidateQueries({ queryKey: ['pay-settings'] }); e.currentTarget?.reset?.();
  }}>
    <h2>Razorpay settings</h2>
    <p className="muted">Buyers and sellers pay the activation fee through Razorpay. Accounts activate only after the payment is verified on the server. When switched off, registrations skip payment.</p>
    <div className="flex gap-2"><span className={`status ${s.mode === 'live' ? 'success' : 'pending'}`}>{s.mode === 'live' ? 'LIVE MODE' : 'TEST MODE'}</span><span className={`status ${s.enabled ? 'active' : 'suspended'}`}>{s.enabled ? 'Collecting payments' : 'Payments off'}</span></div>
    <div className="field"><label>Payment Mode</label><select className="field-input" value={s.paymentMode} onChange={async (e) => { const r = await setMode({ data: { mode: e.target.value as 'test_bypass' | 'live_required' } }); if (!r.ok) toast.error(r.error); else toast.success('Payment mode updated'); qc.invalidateQueries({ queryKey: ['pay-settings'] }); }}><option value="test_bypass">Test / Temporary Bypass</option><option value="live_required">Live Payment Required</option></select>
      <small className="muted">{s.paymentMode === 'test_bypass' && !(s.enabled && s.keyId && s.secretMasked) ? 'New members see “Skip Payment (Testing)” on the payment page.' : 'Skip Payment is hidden and blocked — a verified Razorpay payment is required.'} Saving a complete, switched-on Razorpay setup sets Live automatically.</small></div>
    <label className="gateway-toggle"><input type="checkbox" name="enabled" defaultChecked={s.enabled} /> <span><strong>Collect activation fee at registration</strong><small>Currently {s.enabled ? 'ON' : 'OFF (payment skipped)'}</small></span></label>
    <div className="form-grid">
      <div className="field"><label>Environment</label><select name="mode" className="field-input" defaultValue={s.mode}><option value="test">Test</option><option value="live">Live</option></select></div>
      <div className="field"><label>Activation fee (₹)</label><input name="fee" type="number" min={1} className="field-input" defaultValue={s.fee} /></div>
      <div className="field"><label>Razorpay Key ID</label><input name="key_id" className="field-input" defaultValue={s.keyId ?? ''} placeholder="rzp_test_…" /></div>
      <div className="field"><label>Key Secret {s.secretMasked && <small className="muted">saved {s.secretMasked} — leave blank to keep</small>}</label><input name="key_secret" type="password" autoComplete="off" className="field-input" /></div>
      <div className="field full"><label>Webhook Secret {s.webhookMasked && <small className="muted">saved {s.webhookMasked} — leave blank to keep</small>}</label><input name="webhook_secret" type="password" autoComplete="off" className="field-input" /></div>
    </div>
    <div className="preview-warning"><strong>Webhook URL:</strong> {hookUrl} — add it in Razorpay Dashboard → Webhooks with events payment.captured, payment.failed, order.paid and refund.processed, using the same webhook secret. Secrets are never shown again after saving.</div>
    <div className="form-actions"><Button type="submit" disabled={busy}><Wallet /> Save Razorpay settings</Button></div>
  </form>;
}
