import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useMemo, useState } from 'react';
import { BadgeCheck, Building2, CreditCard, Download, FileCheck, Heart, Plus, Send, Star, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { effectiveStatus, daysLeft, type Profile } from '@/hooks/use-auth';
import { formatINR, propertyImages } from '@/lib/eliteoz-data';
import { adminCreateUser } from '@/lib/members.functions';
import { Panel, SectionLink, Stat, Status, Table, Tabs, fmtDate } from '@/components/workspace';
import type { Me } from '@/components/workspace-member';

async function notify(userIds: string[], title: string, body: string) {
  if (!userIds.length) return;
  await supabase.from('notifications').insert(userIds.map((user_id) => ({ user_id, title, body })));
}

function useUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([supabase.from('profiles').select('*').order('created_at', { ascending: false }), supabase.from('user_roles').select('user_id,role')]);
    const map = new Map<string, string[]>(); (roles ?? []).forEach((r) => map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]));
    return ((profiles ?? []) as Profile[]).map((p) => ({ ...p, roles: map.get(p.id) ?? [], role: (map.get(p.id) ?? []).includes('admin') ? 'admin' : (map.get(p.id) ?? [])[0] ?? p.account_type }));
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
    case 'leads': return <Leads />;
    case 'payments': return <Transactions />;
    case 'notifications': return <SendNotification me={me} />;
    case 'integrations': return <Integrations />;
    default: return null;
  }
}

function Overview() {
  const users = useUsers(); const txns = useTxns(); const leads = useLeads(); const props = useAllProps();
  const kyc = useQuery({ queryKey: ['admin-kyc-count'], queryFn: async () => { const { count } = await supabase.from('kyc_submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'); return count ?? 0; } });
  const u = users.data ?? []; const revenue = (txns.data ?? []).filter((t) => t.status === 'success').reduce((s, t) => s + Number(t.amount), 0);
  return <>
    <div className="stats-grid"><Stat icon={Users} label="Members" value={u.filter((x) => x.role !== 'admin').length} hint={`${u.filter((x) => x.role === 'buyer').length} buyers · ${u.filter((x) => x.role === 'seller').length} sellers`} /><Stat icon={FileCheck} label="KYC awaiting review" value={kyc.data ?? 0} /><Stat icon={Building2} label="Properties pending" value={(props.data ?? []).filter((p) => p.status === 'pending').length} hint={`${(props.data ?? []).filter((p) => p.status === 'approved').length} live`} /><Stat icon={CreditCard} label="Revenue collected" value={formatINR(revenue)} /></div>
    <div className="dash-grid"><Panel title="Newest buyer interests" action={<SectionLink role="admin" slug="leads" className="text-link">All</SectionLink>}><Table headers={['Buyer', 'Property', 'Status', 'Date']} empty="No interests yet." rows={(leads.data ?? []).slice(0, 6).map((l) => [<div><strong>{l.name}</strong><small className="block muted">{l.phone}</small></div>, l.properties?.title ?? '—', <Status value={l.status} />, fmtDate(l.created_at)])} /></Panel>
      <div className="dash-side"><Panel title="Recent transactions" action={<SectionLink role="admin" slug="payments" className="text-link">All</SectionLink>}>{(txns.data ?? []).slice(0, 5).map((t) => <div className="mini-row" key={t.id}><div><strong>{t.payer_name ?? '—'}</strong><small>{t.reference} · {fmtDate(t.created_at)}</small></div><span>₹{Number(t.amount).toLocaleString('en-IN')}</span></div>)}{!txns.data?.length && <p className="muted">No transactions yet.</p>}</Panel>
        <Panel title="Needs attention">{u.filter((x) => x.role !== 'admin' && effectiveStatus(x) === 'suspended').length} suspended accounts · {u.filter((x) => x.role !== 'admin' && x.verification_status === 'not_submitted' && effectiveStatus(x) !== 'suspended').length} awaiting verification</Panel></div></div>
  </>;
}

const blank = { full_name: '', email: '', password: '', mobile: '', dob: '', gender: '', country: 'India', state: '', city: '', address: '', pincode: '', company_name: '', business_type: '' };
function CreateUser({ onDone }: { onDone: () => void }) {
  const create = useServerFn(adminCreateUser); const qc = useQueryClient();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer'); const [pay, setPay] = useState<'none' | 'offline_paid' | 'waived'>('offline_paid'); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const fields: [keyof typeof blank, string, string?][] = [['full_name', 'Full name *'], ['email', 'Email *', 'email'], ['mobile', 'Mobile *', 'tel'], ['password', 'Temporary password * (min 8)', 'text'], ['dob', 'Date of birth', 'date'], ['gender', 'Gender'], ['country', 'Country'], ['state', 'State'], ['city', 'City'], ['pincode', 'Pincode'], ['address', 'Full address']];
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
      {role === 'seller' && <><div className="field"><label>Company / business name</label><input name="company_name" className="field-input" /></div><div className="field"><label>Business type</label><input name="business_type" className="field-input" /></div></>}
      <div className="field full"><label>Activation fee (₹50,000)</label><select className="field-input" value={pay} onChange={(e) => setPay(e.target.value as typeof pay)}><option value="offline_paid">Paid offline — record transaction</option><option value="waived">Waived — record as waived</option><option value="none">Do not record</option></select></div></div>
    {err && <p className="form-error">{err}</p>}
    <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button></div>
  </form>;
}

function UsersSection() {
  const users = useUsers(); const qc = useQueryClient();
  const [role, setRole] = useState('all'); const [status, setStatus] = useState(''); const [kyc, setKyc] = useState(''); const [q, setQ] = useState(''); const [creating, setCreating] = useState(false); const [open, setOpen] = useState<string | null>(null);
  const list = (users.data ?? []).filter((u) => (role === 'all' || u.role === role) && (!status || (u.role !== 'admin' ? effectiveStatus(u) : 'active') === status) && (!kyc || u.verification_status === kyc) && `${u.full_name} ${u.email} ${u.mobile ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const setUserStatus = async (id: string, s: 'active' | 'suspended') => { const patch = s === 'active' ? { status: 'active', verification_due_at: new Date(Date.now() + 7 * 86400000).toISOString() } : { status: 'suspended' }; const { error } = await supabase.from('profiles').update(patch).eq('id', id); if (error) { toast.error('Update failed'); return; } await notify([id], s === 'active' ? 'Account reactivated' : 'Account suspended', s === 'active' ? 'Your account is active again. Please complete verification within 7 days.' : 'Your account has been suspended. Please contact support or complete verification.'); toast.success(s === 'active' ? 'User activated' : 'User suspended'); qc.invalidateQueries({ queryKey: ['admin-users'] }); };
  const count = (r: string) => (users.data ?? []).filter((u) => r === 'all' || u.role === r).length;
  return <>
    {creating ? <CreateUser onDone={() => setCreating(false)} /> : null}
    <Panel action={!creating && <Button onClick={() => setCreating(true)}><Plus /> Create user</Button>}>
      <Tabs value={role} onChange={setRole} options={[['all', `All (${count('all')})`], ['buyer', `Buyers (${count('buyer')})`], ['seller', `Sellers (${count('seller')})`], ['admin', `Admins (${count('admin')})`]]} />
      <div className="toolbar"><input className="field-input" placeholder="Search name, email or mobile" value={q} onChange={(e) => setQ(e.target.value)} /><select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option></select><select className="field-input" value={kyc} onChange={(e) => setKyc(e.target.value)}><option value="">Any verification</option><option value="not_submitted">Not submitted</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
      <Table headers={['Member', 'Role', 'Verification', 'Status', 'Joined', '']} empty="No users match these filters." rows={list.flatMap((u) => { const st = u.role === 'admin' ? 'active' : effectiveStatus(u); const row = [<button className="cell-user" onClick={() => setOpen(open === u.id ? null : u.id)}><span className="avatar sm">{(u.full_name || u.email).slice(0, 2).toUpperCase()}</span><div><strong>{u.full_name || '—'}</strong><small>{u.email}</small></div></button>, <Status value={u.role} />, <div><Status value={u.verification_status} />{u.role !== 'admin' && !['submitted', 'approved'].includes(u.verification_status) && st !== 'suspended' && <small className="block muted">{daysLeft(u.verification_due_at)}d left</small>}</div>, <Status value={st} />, fmtDate(u.created_at), u.role === 'admin' ? '' : <div className="row-actions"><Button size="sm" variant="ghost" onClick={() => setOpen(open === u.id ? null : u.id)}>{open === u.id ? 'Hide' : 'Details'}</Button>{st === 'suspended' ? <Button size="sm" variant="outline" onClick={() => setUserStatus(u.id, 'active')}>Activate</Button> : <Button size="sm" variant="ghost" onClick={() => confirm('Suspend this user?') && setUserStatus(u.id, 'suspended')}>Suspend</Button>}</div>];
        return open === u.id ? [row, [<div className="user-detail" style={{ gridColumn: '1/-1' }}>{([['Mobile', u.mobile], ['Date of birth', u.dob], ['Gender', u.gender], ['Country', u.country], ['State', u.state], ['City', u.city], ['Pincode', u.pincode], ['Address', u.address], ['Company', u.company_name], ['Business type', u.business_type], ['Activated', fmtDate(u.activated_at)], ['Verify by', fmtDate(u.verification_due_at)], ['Created by admin', u.created_by_admin ? 'Yes' : 'No']] as [string, string | null][]).map(([l, v]) => <div key={l}><span>{l}</span><strong>{v || '—'}</strong></div>)}</div>, '', '', '', '', '']] : [row]; })} />
    </Panel>
  </>;
}

function Kyc() {
  const qc = useQueryClient(); const [tab, setTab] = useState('submitted');
  const q = useQuery({ queryKey: ['admin-kyc'], queryFn: async () => { const [{ data: subs }, { data: profs }] = await Promise.all([supabase.from('kyc_submissions').select('*').order('created_at', { ascending: false }), supabase.from('profiles').select('id,full_name,email,account_type')]); const m = new Map((profs ?? []).map((p) => [p.id, p])); return (subs ?? []).map((s) => ({ ...s, profile: m.get(s.user_id) })); } });
  const review = async (id: string, userId: string, status: 'approved' | 'rejected') => { const note = status === 'rejected' ? prompt('Reason for rejection (shown to the member):') ?? '' : null; if (status === 'rejected' && !note) return; const { error } = await supabase.from('kyc_submissions').update({ status, admin_note: note, reviewed_at: new Date().toISOString() }).eq('id', id); if (error) { toast.error('Update failed'); return; } await notify([userId], status === 'approved' ? 'Verification approved' : 'Verification needs changes', status === 'approved' ? 'Congratulations — your Eliteoz account is now verified.' : `Your verification was not approved: ${note}. Please resubmit.`); toast.success('Saved'); qc.invalidateQueries({ queryKey: ['admin-kyc'] }); qc.invalidateQueries({ queryKey: ['admin-users'] }); };
  const list = (q.data ?? []).filter((s) => tab === 'all' || s.status === tab);
  return <Panel><Tabs value={tab} onChange={setTab} options={[['submitted', 'Awaiting review'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']]} />
    <Table headers={['Member', 'PAN / ID', 'Bank', 'Submitted', 'Status', '']} empty="No submissions here." rows={list.map((s) => [<div><strong>{s.profile?.full_name}</strong><small className="block muted">{s.profile?.email} · {s.profile?.account_type}</small></div>, <div><code>{s.pan}</code><small className="block muted">{s.gov_id}{s.gst ? ` · GST ${s.gst}` : ''}</small></div>, <div>{s.bank_name}<small className="block muted">{s.account_holder} · {s.account_number} · {s.ifsc}</small></div>, fmtDate(s.created_at), <Status value={s.status} />, s.status === 'submitted' ? <div className="row-actions"><Button size="sm" onClick={() => review(s.id, s.user_id, 'approved')}>Approve</Button><Button size="sm" variant="outline" onClick={() => review(s.id, s.user_id, 'rejected')}>Reject</Button></div> : s.admin_note ?? ''])} /></Panel>;
}

function PropertiesSection() {
  const qc = useQueryClient(); const props = useAllProps(); const [tab, setTab] = useState('pending'); const [cat, setCat] = useState('');
  const cats = [...new Set((props.data ?? []).map((p) => p.categories?.name).filter(Boolean))] as string[];
  const update = async (p: { id: string; seller_id: string | null; title: string }, patch: { status?: string; featured?: boolean; admin_note?: string | null }) => { const { error } = await supabase.from('properties').update(patch).eq('id', p.id); if (error) { toast.error('Update failed'); return; } if (patch.status && p.seller_id) await notify([p.seller_id], patch.status === 'approved' ? 'Property approved' : 'Property not approved', patch.status === 'approved' ? `${p.title} is now live on Eliteoz.` : `${p.title} was not approved: ${patch.admin_note ?? ''}`); toast.success('Saved'); qc.invalidateQueries({ queryKey: ['admin-props'] }); };
  const list = (props.data ?? []).filter((p) => (tab === 'all' || (tab === 'featured' ? p.featured : p.status === tab)) && (!cat || p.categories?.name === cat));
  return <Panel><Tabs value={tab} onChange={setTab} options={[['pending', 'Pending review'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['draft', 'Drafts'], ['featured', 'Featured'], ['all', 'All']]} />
    <div className="toolbar"><select className="field-input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
    <Table headers={['Property', 'Category', 'Price', 'Status', 'Added', '']} empty="No properties here." rows={list.map((p) => [<div className="cell-prop"><img src={propertyImages[p.image]} alt="" /><div><strong>{p.title}</strong><small>{p.ref} · {p.location}</small></div></div>, p.categories?.name ?? '—', formatINR(Number(p.price)), <Status value={p.status} />, fmtDate(p.created_at), <div className="row-actions">{p.status !== 'approved' && <Button size="sm" onClick={() => update(p, { status: 'approved', admin_note: null })}>Approve</Button>}{p.status !== 'rejected' && <Button size="sm" variant="outline" onClick={() => { const n = prompt('Reason for rejection:'); if (n) update(p, { status: 'rejected', admin_note: n }); }}>Reject</Button>}<Button size="sm" variant="ghost" aria-label="Toggle featured" onClick={() => update(p, { featured: !p.featured })}><Star size={15} fill={p.featured ? 'currentColor' : 'none'} /></Button>{p.status === 'approved' && <Button size="sm" variant="ghost" asChild><Link to="/properties/$id" params={{ id: p.ref }}>View</Link></Button>}</div>])} /></Panel>;
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
    <Panel title="Transactions" action={<Button size="sm" variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>}>
      <div className="toolbar wrap"><input className="field-input" placeholder="Reference, name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option>{uniq('status').map((x) => <option key={x}>{x}</option>)}</select>
        <select className="field-input" value={method} onChange={(e) => setMethod(e.target.value)}><option value="">Any method</option>{uniq('method').map((x) => <option key={x}>{x}</option>)}</select>
        <select className="field-input" value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">Any purpose</option>{uniq('purpose').map((x) => <option key={x}>{x}</option>)}</select>
        <select className="field-input" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Buyers & sellers</option><option value="buyer">Buyers</option><option value="seller">Sellers</option></select>
        <label className="date-f">From <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="date-f">To <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {(status || method || purpose || role || from || to || q) && <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setMethod(''); setPurpose(''); setRole(''); setFrom(''); setTo(''); setQ(''); }}>Clear</Button>}</div>
      <Table headers={['Reference', 'Payer', 'Role', 'Purpose', 'Method', 'Amount', 'Status', 'Date']} empty="No transactions match these filters." rows={list.map((t) => [<code>{t.reference}</code>, <div><strong>{t.payer_name}</strong><small className="block muted">{t.payer_email}</small></div>, roleOf.get(t.user_id ?? '') ?? '—', t.purpose, t.method.replaceAll('_', ' '), `₹ ${Number(t.amount).toLocaleString('en-IN')}`, <Status value={t.status} />, fmtDate(t.created_at)])} />
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
