import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BadgeCheck, Bell, Building2, CheckCheck, CreditCard, Eye, FileCheck, FileText, Heart, LifeBuoy, LockKeyhole, MessageSquare, Upload, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/eliteoz';
import { supabase } from '@/integrations/supabase/client';
import { daysLeft, type useMe } from '@/hooks/use-auth';
import { coverOf, formatINR, toListing, type Listing, type PropertyRow } from '@/lib/eliteoz-data';
import { DobInput } from '@/components/auth-flow';
import { readCompare, writeCompare } from '@/lib/queries';
import { Panel, SectionLink, Stat, Status, Table, Tabs, fmtDate } from '@/components/workspace';

export type Me = NonNullable<ReturnType<typeof useMe>['data']>;
const cols = 'id,ref,title,location,price,area_sqft,beds,baths,property_type,description,image,cover_url,gallery,amenities,featured,status,categories(name)';

function useApproved() { return useQuery({ queryKey: ['approved-properties'], queryFn: async () => { const { data } = await supabase.from('properties').select(cols).eq('status', 'approved').order('featured', { ascending: false }); return ((data ?? []) as unknown as PropertyRow[]).map(toListing); } }); }
function useMyInterests(uid: string) { return useQuery({ queryKey: ['my-interests', uid], queryFn: async () => { const { data } = await supabase.from('interests').select('id,status,message,preferred_time,admin_note,created_at,properties(ref,title,location,price,image,cover_url)').eq('buyer_id', uid).order('created_at', { ascending: false }); return data ?? []; } }); }
function useSellerProps(uid: string) { return useQuery({ queryKey: ['seller-properties', uid], queryFn: async () => { const { data } = await supabase.from('properties').select(cols + ',admin_note,created_at,category_id').eq('seller_id', uid).order('created_at', { ascending: false }); return (data ?? []) as unknown as (PropertyRow & { admin_note: string | null; created_at: string; category_id: string | null })[]; } }); }
function useSellerInterests(uid: string) { return useQuery({ queryKey: ['seller-interests', uid], queryFn: async () => { const { data } = await supabase.from('interests').select('id,status,created_at,preferred_time,properties!inner(ref,title,seller_id)').eq('properties.seller_id', uid).order('created_at', { ascending: false }); return data ?? []; } }); }

export function MemberBody({ role, section, me }: { role: 'buyer' | 'seller'; section: string; me: Me }) {
  if (!section) return role === 'buyer' ? <BuyerOverview me={me} /> : <SellerOverview me={me} />;
  switch (section) {
    case 'explore': return <Explore />;
    case 'compare': return <Compare />;
    case 'interests': return role === 'buyer' ? <BuyerInterests me={me} /> : <SellerInterests me={me} />;
    case 'properties': return <SellerProperties me={me} />;
    case 'add-property': return <ListingForm me={me} />;
    case 'notifications': return <Notifications me={me} />;
    case 'verification': return <Verification me={me} role={role} />;
    case 'payments': return <Payments me={me} />;
    case 'profile': return <Profile me={me} role={role} />;
    case 'security': return <Security />;
    case 'support': return <Support me={me} />;
    default: return null;
  }
}

function VerificationCard({ me, role }: { me: Me; role: 'buyer' | 'seller' }) {
  const p = me.profile; if (!p) return null;
  const v = p.verification_status;
  return <div className="verify-card"><div className="verify-ring" data-state={v}><FileCheck size={22} /></div><div><span className="eyebrow">VERIFICATION</span><h3>{v === 'approved' ? 'You are verified' : v === 'submitted' ? 'Under review' : v === 'rejected' ? 'Action required' : 'Not yet submitted'}</h3><p className="muted">{v === 'approved' ? 'Your identity has been approved by Eliteoz.' : v === 'submitted' ? 'Our team is reviewing your details.' : `Complete within ${daysLeft(p.verification_due_at)} days to keep your account active.`}</p></div>{!['approved', 'submitted'].includes(v) && <Button size="sm" asChild><SectionLink role={role} slug="verification">Verify</SectionLink></Button>}</div>;
}

function BuyerOverview({ me }: { me: Me }) {
  const props = useApproved(); const ints = useMyInterests(me.user.id);
  const [cmp, setCmp] = useState<string[]>([]); useEffect(() => setCmp(readCompare()), []);
  const featured = (props.data ?? []).slice(0, 3);
  return <>
    <div className="stats-grid"><Stat icon={Building2} label="Available properties" value={props.data?.length ?? '—'} /><Stat icon={Heart} label="My interests" value={ints.data?.length ?? '—'} /><Stat icon={SlidersHorizontal} label="In comparison" value={cmp.length} /><Stat icon={BadgeCheck} label="Verification" value={<Status value={me.profile?.verification_status ?? 'not_submitted'} />} /></div>
    <div className="dash-grid"><Panel title="Handpicked for you" action={<Link className="text-link" to="/properties">View all <ArrowUpRight size={14} /></Link>}><div className="property-grid compact">{featured.map((p) => <PropertyCard key={p.id} property={p} />)}</div></Panel>
      <div className="dash-side"><VerificationCard me={me} role="buyer" /><Panel title="Recent interests" action={<SectionLink role="buyer" slug="interests" className="text-link">All</SectionLink>}>{(ints.data ?? []).slice(0, 4).map((i) => <div className="mini-row" key={i.id}><div><strong>{i.properties?.title}</strong><small>{fmtDate(i.created_at)}</small></div><Status value={i.status} /></div>)}{!ints.data?.length && <p className="muted">When you contact the team about a property, it appears here.</p>}</Panel></div></div>
  </>;
}

function Explore() {
  const props = useApproved(); const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  const [cmp, setCmp] = useState<string[]>([]); useEffect(() => setCmp(readCompare()), []);
  const cats = [...new Set((props.data ?? []).map((p) => p.category))];
  const list = (props.data ?? []).filter((p) => (!cat || p.category === cat) && `${p.name} ${p.location}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => { const next = cmp.includes(id) ? cmp.filter((x) => x !== id) : [...cmp, id].slice(-4); writeCompare(next); setCmp(next); };
  return <><div className="toolbar"><input className="field-input" placeholder="Search by name or location" value={q} onChange={(e) => setQ(e.target.value)} /><select className="field-input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>{cmp.length > 0 && <Button asChild variant="outline"><SectionLink role="buyer" slug="compare">Compare ({cmp.length})</SectionLink></Button>}</div>
    <div className="property-grid compact">{list.map((p) => <PropertyCard key={p.id} property={p} compared={cmp.includes(p.id)} onCompare={toggle} />)}</div>{!list.length && !props.isLoading && <div className="empty-state"><p>No properties match your search.</p></div>}</>;
}

function Compare() {
  const props = useApproved(); const [sel, setSel] = useState<string[]>([]);
  useEffect(() => setSel(readCompare()), []);
  const toggle = (id: string) => { const next = sel.includes(id) ? sel.filter((x) => x !== id) : sel.length >= 4 ? (toast('You can compare up to 4 properties.'), sel) : [...sel, id]; writeCompare(next); setSel(next); };
  const chosen = sel.map((id) => props.data?.find((p) => p.id === id)).filter(Boolean) as Listing[];
  const minPrice = Math.min(...chosen.map((c) => c.priceValue)); const maxArea = Math.max(...chosen.map((c) => c.areaValue));
  const rows: [string, (l: Listing) => React.ReactNode][] = [
    ['Price', (l) => <span className={l.priceValue === minPrice && chosen.length > 1 ? 'best' : ''}>{l.price}</span>],
    ['Price / sq.ft', (l) => (l.areaValue ? `₹ ${Math.round(l.priceValue / l.areaValue).toLocaleString('en-IN')}` : '—')],
    ['Area', (l) => <span className={l.areaValue === maxArea && chosen.length > 1 ? 'best' : ''}>{l.area}</span>],
    ['Category', (l) => l.category], ['Type', (l) => l.type], ['Location', (l) => l.location], ['Bedrooms', (l) => l.beds], ['Bathrooms', (l) => l.baths],
    ['Amenities', (l) => l.amenities.length ? <ul className="amen-list">{l.amenities.map((a) => <li key={a}>{a}</li>)}</ul> : '—'],
  ];
  return <>
    <Panel title="Select properties to compare" action={<span className="muted">{sel.length}/4 selected</span>}><div className="pick-grid">{(props.data ?? []).map((p) => <button key={p.id} className={`pick ${sel.includes(p.id) ? 'active' : ''}`} onClick={() => toggle(p.id)}><img src={p.image} alt="" /><div><strong>{p.name}</strong><small>{p.location} · {p.price}</small></div><span className="pick-check">{sel.includes(p.id) ? '✓' : '+'}</span></button>)}</div></Panel>
    {chosen.length < 2 ? <div className="empty-state"><SlidersHorizontal /><h3>Pick at least two properties.</h3><p>Their details will appear side by side here.</p></div>
      : <div className="compare-wrap"><table className="compare-table"><thead><tr><th />{chosen.map((c) => <th key={c.id}><img src={c.image} alt="" /><Link to="/properties/$id" params={{ id: c.id }} className="compare-name">{c.name}</Link><button className="icon-btn" aria-label="Remove" onClick={() => toggle(c.id)}><X size={14} /></button></th>)}</tr></thead><tbody>{rows.map(([l, f]) => <tr key={l}><th>{l}</th>{chosen.map((c) => <td key={c.id}>{f(c)}</td>)}</tr>)}<tr><th /> {chosen.map((c) => <td key={c.id}><Button size="sm" asChild><Link to="/properties/$id" params={{ id: c.id }}>Contact team</Link></Button></td>)}</tr></tbody></table></div>}
  </>;
}

function BuyerInterests({ me }: { me: Me }) {
  const ints = useMyInterests(me.user.id);
  return <Panel title="Properties you have enquired about" action={<Button asChild size="sm" variant="outline"><Link to="/properties">Find more</Link></Button>}>
    {(ints.data ?? []).length ? <div className="interest-list">{ints.data!.map((i) => <article key={i.id} className="interest-item"><img src={coverOf({ image: i.properties?.image ?? 'villa', cover_url: i.properties?.cover_url ?? null })} alt="" /><div className="grow"><div className="flex items-center justify-between gap-3"><Link to="/properties/$id" params={{ id: i.properties?.ref ?? '' }} className="interest-title">{i.properties?.title}</Link><Status value={i.status} /></div><small className="muted">{i.properties?.location} · {formatINR(Number(i.properties?.price ?? 0))} · Sent {fmtDate(i.created_at)}</small>{i.message && <p>“{i.message}”</p>}{i.admin_note && <p className="team-note"><MessageSquare size={14} /> Eliteoz team: {i.admin_note}</p>}</div></article>)}</div>
      : <div className="empty-state"><Heart /><h3>No interests yet.</h3><p>Open any property and fill in the contact form — the Eliteoz team will reach out and it will show here.</p><Button asChild><Link to="/properties">Explore properties</Link></Button></div>}
  </Panel>;
}

function SellerOverview({ me }: { me: Me }) {
  const props = useSellerProps(me.user.id); const ints = useSellerInterests(me.user.id);
  const list = props.data ?? []; const c = (s: string) => list.filter((p) => p.status === s).length;
  return <>
    <div className="stats-grid"><Stat icon={Building2} label="Total properties" value={list.length} /><Stat icon={BadgeCheck} label="Live & approved" value={c('approved')} /><Stat icon={Eye} label="Under review" value={c('pending')} /><Stat icon={Heart} label="Buyer interests" value={ints.data?.length ?? 0} /></div>
    <div className="dash-grid"><Panel title="Your listings" action={<SectionLink role="seller" slug="properties" className="text-link">Manage</SectionLink>}>{list.length ? <div className="listing-rows">{list.slice(0, 5).map((p) => <div className="listing-row" key={p.id}><img src={coverOf(p)} alt="" /><div className="grow"><strong>{p.title}</strong><small>{p.location} · {formatINR(Number(p.price))}</small></div><Status value={p.status} /></div>)}</div> : <div className="empty-state"><p>No properties yet.</p><Button asChild><SectionLink role="seller" slug="add-property">Add your first property</SectionLink></Button></div>}</Panel>
      <div className="dash-side"><VerificationCard me={me} role="seller" /><Panel title="Latest interest">{(ints.data ?? []).slice(0, 4).map((i) => <div className="mini-row" key={i.id}><div><strong>{i.properties?.title}</strong><small>{fmtDate(i.created_at)}</small></div><Status value={i.status} /></div>)}{!ints.data?.length && <p className="muted">Buyer interest in your properties will appear here.</p>}</Panel></div></div>
  </>;
}

function SellerProperties({ me }: { me: Me }) {
  const qc = useQueryClient(); const props = useSellerProps(me.user.id); const [tab, setTab] = useState('all');
  const list = (props.data ?? []).filter((p) => tab === 'all' || p.status === tab);
  const act = async (id: string, patch: { status?: string } | 'delete') => { const { error } = patch === 'delete' ? await supabase.from('properties').delete().eq('id', id) : await supabase.from('properties').update(patch).eq('id', id); if (error) toast.error('Action failed'); else { toast.success(patch === 'delete' ? 'Property deleted' : 'Submitted for review'); qc.invalidateQueries({ queryKey: ['seller-properties'] }); } };
  return <Panel><Tabs value={tab} onChange={setTab} options={[['all', `All (${props.data?.length ?? 0})`], ['draft', 'Drafts'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']]} />
    <Table headers={['Property', 'Category', 'Price', 'Status', 'Added', '']} empty="No properties in this view." rows={list.map((p) => [<div className="cell-prop"><img src={coverOf(p)} alt="" /><div><strong>{p.title}</strong><small>{p.ref} · {p.location}</small>{p.status === 'rejected' && p.admin_note && <small className="danger-text">Reason: {p.admin_note}</small>}</div></div>, p.categories?.name ?? '—', formatINR(Number(p.price)), <Status value={p.status} />, fmtDate(p.created_at), <div className="row-actions">{p.status === 'approved' && <Button size="sm" variant="ghost" asChild><Link to="/properties/$id" params={{ id: p.ref }}>View</Link></Button>}{['draft', 'rejected'].includes(p.status) && <Button size="sm" variant="outline" onClick={() => act(p.id, { status: 'pending' })}>Submit</Button>}<Button size="sm" variant="ghost" aria-label="Delete" onClick={() => confirm('Delete this property?') && act(p.id, 'delete')}><Trash2 size={15} /></Button></div>])} />
  </Panel>;
}

async function uploadFiles(bucket: 'property-media' | 'property-docs', uid: string, files: File[]) {
  const out: string[] = [];
  for (const file of files) {
    const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_').slice(-80)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error;
    if (bucket === 'property-docs') { out.push(path); continue; }
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (data?.signedUrl) out.push(data.signedUrl);
  }
  return out;
}

function FileDrop({ label, hint, accept, multiple, files, onChange, image }: { label: string; hint: string; accept: string; multiple?: boolean; files: File[]; onChange: (f: File[]) => void; image?: boolean }) {
  const previews = useMemo(() => (image ? files.map((f) => URL.createObjectURL(f)) : []), [files, image]);
  return <div className="field full"><label>{label}</label>
    <label className="file-drop"><Upload size={20} /><span><strong>Click to choose {multiple ? 'files' : 'a file'}</strong><small>{hint}</small></span>
      <input type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { const list = Array.from(e.target.files ?? []).filter((f) => f.size <= 10 * 1024 * 1024); if (list.length < (e.target.files?.length ?? 0)) toast.error('Files larger than 10 MB were skipped.'); onChange(multiple ? [...files, ...list].slice(0, 12) : list.slice(0, 1)); e.target.value = ''; }} /></label>
    {files.length > 0 && <div className="file-list">{files.map((f, i) => <div key={i} className="file-chip">{image ? <img src={previews[i]} alt="" /> : <FileText size={16} />}<span>{f.name}</span><button type="button" aria-label="Remove" onClick={() => onChange(files.filter((_, j) => j !== i))}><X size={13} /></button></div>)}</div>}
  </div>;
}

function ListingForm({ me }: { me: Me }) {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ['categories-active'], queryFn: async () => { const { data } = await supabase.from('categories').select('id,name').eq('active', true).order('name'); return data ?? []; } });
  const [cover, setCover] = useState<File[]>([]); const [gallery, setGallery] = useState<File[]>([]); const [docs, setDocs] = useState<File[]>([]);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState('');
  const save = async (form: HTMLFormElement, status: 'draft' | 'pending') => {
    if (status === 'pending') {
      if (!form.reportValidity()) return;
      if (!cover.length) { toast.error('Please add a cover image.'); return; }
      if (!docs.length) { toast.error('Please upload at least one ownership / proof document.'); return; }
    }
    const f = new FormData(form); setBusy(true);
    try {
      const [coverUrl] = await uploadFiles('property-media', me.user.id, cover);
      const galleryUrls = await uploadFiles('property-media', me.user.id, gallery);
      const docPaths = await uploadFiles('property-docs', me.user.id, docs);
      const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
      const { error } = await supabase.from('properties').insert({ seller_id: me.user.id, status, image: 'villa', cover_url: coverUrl ?? null, gallery: galleryUrls, documents: docPaths, title: String(f.get('title') || 'Untitled property').slice(0, 160), location: String(f.get('location') || '—').slice(0, 160), category_id: String(f.get('category') || '') || null, property_type: String(f.get('type') || 'Villa'), price: num('price') ?? 0, area_sqft: num('area'), beds: num('beds'), baths: num('baths'), description: String(f.get('description') ?? '').slice(0, 4000), amenities: String(f.get('amenities') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20) });
      if (error) throw error;
    } catch { setBusy(false); toast.error('Could not save the property. Please try again.'); return; }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ['seller-properties'] }); form.reset(); setCover([]); setGallery([]); setDocs([]); setDone(status);
    toast.success(status === 'draft' ? 'Saved as draft' : 'Submitted for admin review');
  };
  if (done) return <Panel><div className="empty-state"><BadgeCheck /><h3>{done === 'draft' ? 'Draft saved.' : 'Submitted for review.'}</h3><p>{done === 'draft' ? 'You can submit it anytime from My Properties.' : 'The Eliteoz team will check your documents. The property goes live only after approval — you will get a notification.'}</p><div className="form-actions"><Button variant="outline" onClick={() => setDone('')}>Add another</Button><Button asChild><SectionLink role="seller" slug="properties">My properties</SectionLink></Button></div></div></Panel>;
  return <form className="panel listing-form" onSubmit={(e) => { e.preventDefault(); save(e.currentTarget, 'pending'); }}>
    <div className="form-section"><span className="eyebrow">STEP 1</span><h2>Property details</h2></div>
    <div className="form-grid">
      <div className="field full"><label>Property title *</label><input name="title" className="field-input" required maxLength={160} placeholder="e.g. The Solstice Residence" /></div>
      <div className="field"><label>Category *</label><select name="category" className="field-input" required defaultValue=""><option value="" disabled>Select category</option>{(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="field"><label>Property type *</label><select name="type" className="field-input">{['Villa', 'Penthouse', 'Apartment', 'Estate', 'Farmhouse', 'Office', 'Retail', 'Plot', 'Warehouse', 'Hotel'].map((t) => <option key={t}>{t}</option>)}</select></div>
      <div className="field full"><label>Location *</label><input name="location" className="field-input" required placeholder="Area, City, State" /></div>
      <div className="field"><label>Asking price (₹) *</label><input name="price" type="number" min={0} className="field-input" required placeholder="125000000" /></div>
      <div className="field"><label>Area (sq.ft)</label><input name="area" type="number" min={0} className="field-input" /></div>
      <div className="field"><label>Bedrooms</label><input name="beds" type="number" min={0} className="field-input" /></div>
      <div className="field"><label>Bathrooms</label><input name="baths" type="number" min={0} className="field-input" /></div>
      <div className="field full"><label>Description</label><textarea name="description" rows={4} className="field-input" placeholder="What makes this property special?" /></div>
      <div className="field full"><label>Amenities (comma separated)</label><input name="amenities" className="field-input" placeholder="Private pool, Garden, Parking" /></div>
    </div>
    <div className="form-section"><span className="eyebrow">STEP 2</span><h2>Photos</h2><p className="muted">These are shown to buyers once the property is approved.</p></div>
    <div className="form-grid">
      <FileDrop label="Cover image *" hint="JPG or PNG, up to 10 MB. This is the main photo." accept="image/*" files={cover} onChange={setCover} image />
      <FileDrop label="Gallery photos" hint="Up to 12 photos — rooms, views, exterior." accept="image/*" multiple files={gallery} onChange={setGallery} image />
    </div>
    <div className="form-section"><span className="eyebrow">STEP 3</span><h2>Proof of ownership</h2><p className="muted"><LockKeyhole size={13} /> Private — visible only to the Eliteoz Master Admin for verification. Never shown to buyers.</p></div>
    <div className="form-grid"><FileDrop label="Ownership documents *" hint="Sale deed, property tax receipt, title papers — PDF or image, up to 10 MB each." accept="application/pdf,image/*" multiple files={docs} onChange={setDocs} /></div>
    <div className="form-actions"><Button type="button" variant="outline" disabled={busy} onClick={(e) => save(e.currentTarget.form!, 'draft')}>Save as draft</Button><Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Submit for verification'}</Button></div>
  </form>;
}

function SellerInterests({ me }: { me: Me }) {
  const ints = useSellerInterests(me.user.id);
  return <Panel title="Interest in your properties"><p className="muted">Buyer contact details are handled privately by the Eliteoz team, who coordinate next steps with you.</p><Table headers={['Property', 'Preferred time', 'Status', 'Received']} empty="No buyer interest yet." rows={(ints.data ?? []).map((i) => [<strong>{i.properties?.title}</strong>, i.preferred_time ?? '—', <Status value={i.status} />, fmtDate(i.created_at)])} /></Panel>;
}

function Notifications({ me }: { me: Me }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications', me.user.id], queryFn: async () => { const { data } = await supabase.from('notifications').select('*').eq('user_id', me.user.id).order('created_at', { ascending: false }); return data ?? []; } });
  const mark = useMutation({ mutationFn: async (id?: string) => { const b = supabase.from('notifications').update({ read: true }).eq('user_id', me.user.id); await (id ? b.eq('id', id) : b); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread'] }); } });
  return <Panel title="All notifications" action={<Button size="sm" variant="outline" onClick={() => mark.mutate(undefined)}><CheckCheck /> Mark all read</Button>}>
    {(q.data ?? []).length ? <div className="notif-list">{q.data!.map((n) => <article key={n.id} className={`notif ${n.read ? '' : 'unread'}`} onClick={() => !n.read && mark.mutate(n.id)}><span className="notif-dot"><Bell size={15} /></span><div className="grow"><strong>{n.title}</strong><p>{n.body}</p><small>{fmtDate(n.created_at)}</small></div></article>)}</div> : <div className="empty-state"><Bell /><p>You are all caught up.</p></div>}
  </Panel>;
}

function Verification({ me, role }: { me: Me; role: 'buyer' | 'seller' }) {
  const qc = useQueryClient();
  const sub = useQuery({ queryKey: ['my-kyc', me.user.id], queryFn: async () => { const { data } = await supabase.from('kyc_submissions').select('status,admin_note,created_at,pan').eq('user_id', me.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(); return data; } });
  const [busy, setBusy] = useState(false);
  const p = me.profile!; const v = p.verification_status;
  const steps = [['Account created', true], ['Details submitted', ['submitted', 'approved', 'rejected'].includes(v)], ['Team review', ['approved', 'rejected'].includes(v)], ['Verified', v === 'approved']] as const;
  return <>
    <div className="verify-steps">{steps.map(([l, ok], i) => <div key={l} className={ok ? 'ok' : ''}><span>{ok ? '✓' : i + 1}</span>{l}</div>)}</div>
    {v === 'approved' ? <Panel><div className="empty-state"><BadgeCheck /><h3>You are verified.</h3><p>Thank you — your identity has been approved.</p></div></Panel>
      : v === 'submitted' ? <Panel><div className="empty-state"><FileCheck /><h3>Under review.</h3><p>Submitted on {sub.data ? fmtDate(sub.data.created_at) : '—'}. Your account stays active while we review.</p></div></Panel>
        : <form className="panel" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? '').trim().slice(0, 60); setBusy(true);
          const { error } = await supabase.from('kyc_submissions').insert({ user_id: me.user.id, pan: g('pan').toUpperCase(), gov_id: g('gov_id'), gst: g('gst') || null, account_holder: g('holder'), bank_name: g('bank'), account_number: g('acc'), ifsc: g('ifsc').toUpperCase() });
          setBusy(false); if (error) { toast.error('Could not submit. Please check the details.'); return; }
          toast.success('Verification submitted'); qc.invalidateQueries();
        }}>
          <h2>{v === 'rejected' ? 'Resubmit your verification' : 'Complete your verification'}</h2>
          {v === 'rejected' && sub.data?.admin_note && <p className="danger-text">Reason: {sub.data.admin_note}</p>}
          <p className="muted">{v === 'rejected' ? 'Please correct the details below.' : `You have ${daysLeft(p.verification_due_at)} days left. Accounts not verified within 7 days are suspended.`}</p>
          <div className="form-grid">
            <div className="field"><label>PAN number *</label><input name="pan" className="field-input" required pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" placeholder="ABCDE1234F" /></div>
            <div className="field"><label>Government ID number (Aadhaar / Passport) *</label><input name="gov_id" className="field-input" required minLength={6} /></div>
            {role === 'seller' && <div className="field"><label>GST number (if applicable)</label><input name="gst" className="field-input" /></div>}
            <div className="field"><label>Account holder name *</label><input name="holder" className="field-input" required defaultValue={p.full_name} /></div>
            <div className="field"><label>Bank name *</label><input name="bank" className="field-input" required /></div>
            <div className="field"><label>Account number *</label><input name="acc" className="field-input" required pattern="[0-9]{6,20}" /></div>
            <div className="field"><label>IFSC code *</label><input name="ifsc" className="field-input" required pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" placeholder="HDFC0001234" /></div>
          </div>
          <p className="muted small">These details are visible only to you and the Eliteoz admin team.</p>
          <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for verification'}</Button></div>
        </form>}
  </>;
}

function Payments({ me }: { me: Me }) {
  const q = useQuery({ queryKey: ['my-txn', me.user.id], queryFn: async () => { const { data } = await supabase.from('transactions').select('*').eq('user_id', me.user.id).order('created_at', { ascending: false }); return data ?? []; } });
  return <Panel title="Payment history"><Table headers={['Reference', 'Purpose', 'Amount', 'Method', 'Status', 'Date']} empty="No payments yet." rows={(q.data ?? []).map((t) => [<code>{t.reference}</code>, t.purpose, `₹ ${Number(t.amount).toLocaleString('en-IN')}`, t.method.replaceAll('_', ' '), <Status value={t.status} />, fmtDate(t.created_at)])} /><p className="muted small"><CreditCard size={13} /> Payments are currently processed in test mode.</p></Panel>;
}

function Profile({ me, role }: { me: Me; role: 'buyer' | 'seller' }) {
  const qc = useQueryClient(); const p = me.profile!; const [busy, setBusy] = useState(false);
  const keys: [string, string][] = [['full_name', 'Full name'], ['mobile', 'Mobile'], ['gender', 'Gender'], ['country', 'Country'], ['state', 'State'], ['city', 'City'], ['pincode', 'Pincode'], ['address', 'Address']];
  const val = (k: string) => (p as unknown as Record<string, string | null>)[k] ?? '';
  const lockedCompany = role === 'seller' && (!!p.company_name || !!p.business_type);
  return <form className="panel" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? '').trim().slice(0, 300) || null;
    const patch: { full_name: string; mobile: string | null; gender: string | null; country: string | null; state: string | null; city: string | null; pincode: string | null; address: string | null; dob: string | null; company_name?: string | null; business_type?: string | null } = { full_name: g('full_name') ?? p.full_name, mobile: g('mobile'), gender: g('gender'), country: g('country'), state: g('state'), city: g('city'), pincode: g('pincode'), address: g('address'), dob: g('dob') };
    if (role === 'seller' && !lockedCompany) { patch.company_name = g('company_name'); patch.business_type = g('business_type'); }
    setBusy(true); const { error } = await supabase.from('profiles').update(patch).eq('id', me.user.id); setBusy(false);
    if (error) toast.error('Could not save'); else { toast.success('Profile updated'); qc.invalidateQueries({ queryKey: ['me'] }); }
  }}>
    <div className="profile-head"><div className="avatar lg">{p.full_name.slice(0, 2).toUpperCase()}</div><div><h2>{p.full_name}</h2><p className="muted">{p.email} · Member since {fmtDate(p.created_at)}</p></div></div>
    <div className="form-grid">{keys.map(([k, l]) => <div key={k} className={`field ${k === 'address' ? 'full' : ''}`}><label>{l}</label><input name={k} className="field-input" defaultValue={val(k)} /></div>)}
      <div className="field full"><label>Date of birth</label><DobInput name="dob" defaultValue={p.dob} /></div>
      {role === 'seller' && <>
        <div className="field"><label>Company / business name {lockedCompany && <LockKeyhole size={12} />}</label><input name="company_name" className="field-input" defaultValue={val('company_name')} readOnly={lockedCompany} /></div>
        <div className="field"><label>Business type {lockedCompany && <LockKeyhole size={12} />}</label><input name="business_type" className="field-input" defaultValue={val('business_type')} readOnly={lockedCompany} /></div>
        {lockedCompany && <p className="field full muted small">Company details are fixed once saved. To change them, <SectionLink role="seller" slug="support" className="text-link">raise a support ticket</SectionLink> and the Eliteoz team will update them.</p>}
      </>}
    </div>
    <div className="form-actions"><Button type="submit" disabled={busy}>Save changes</Button></div>
  </form>;
}

function Support({ me }: { me: Me }) {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['my-tickets', me.user.id], queryFn: async () => { const { data } = await supabase.from('support_tickets').select('*').eq('user_id', me.user.id).order('created_at', { ascending: false }); return data ?? []; } });
  return <div className="dash-grid"><Panel title="Your tickets">{(q.data ?? []).length ? <div className="notif-list">{q.data!.map((t) => <article key={t.id} className="notif"><span className="notif-dot"><LifeBuoy size={15} /></span><div className="grow"><div className="flex items-center justify-between gap-3"><strong>{t.subject}</strong><Status value={t.status} /></div><p>{t.message}</p>{t.admin_reply && <p className="team-note"><MessageSquare size={14} /> Eliteoz team: {t.admin_reply}</p>}<small>{fmtDate(t.created_at)}</small></div></article>)}</div> : <div className="empty-state"><LifeBuoy /><p>No tickets yet.</p></div>}</Panel>
    <form className="panel" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setBusy(true); const { error } = await supabase.from('support_tickets').insert({ user_id: me.user.id, subject: String(f.get('subject')).slice(0, 120), message: String(f.get('message')).slice(0, 2000) }); setBusy(false); if (error) { toast.error('Could not submit'); return; } toast.success('Ticket raised — the team will respond soon'); form.reset(); qc.invalidateQueries({ queryKey: ['my-tickets'] }); }}>
      <h2>Raise a ticket</h2><p className="muted">Need to change your company name, business type or other locked details? Tell us here.</p>
      <div className="field"><label>Subject</label><select name="subject" className="field-input" required defaultValue=""><option value="" disabled>Select</option><option>Change company name / business type</option><option>Change email or mobile</option><option>Property listing help</option><option>Payment or activation</option><option>Other</option></select></div>
      <div className="field"><label>Details</label><textarea name="message" required rows={5} maxLength={2000} className="field-input" placeholder="Describe what you need changed" /></div>
      <div className="form-actions"><Button type="submit" disabled={busy}>Submit ticket</Button></div></form></div>;
}

function Security() {
  const [busy, setBusy] = useState(false);
  return <form className="panel" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const pw = String(f.get('pw')); if (pw !== String(f.get('pw2'))) { toast.error('Passwords do not match'); return; } setBusy(true); const { error } = await supabase.auth.updateUser({ password: pw, current_password: String(f.get('current')) } as { password: string }); setBusy(false); if (error) toast.error(error.message); else { toast.success('Password changed'); form.reset(); } }}>
    <h2>Change password</h2><div className="form-grid"><div className="field full"><label>Current password</label><input name="current" type="password" required className="field-input" /></div><div className="field"><label>New password</label><input name="pw" type="password" minLength={8} required className="field-input" /></div><div className="field"><label>Confirm new password</label><input name="pw2" type="password" minLength={8} required className="field-input" /></div></div>
    <div className="form-actions"><Button type="submit" disabled={busy}>Update password</Button></div>
  </form>;
}
