import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { adminUpdateUser, adminSetStatus, adminSetPayment, listStaff, createStaff, updateStaff, PERMISSIONS } from '@/lib/admin-users.functions';
import { Panel, Status, Table, fmtDate } from '@/components/workspace';
import type { Profile } from '@/hooks/use-auth';

export type EditableUser = Profile & { mobile_verified?: boolean; payment_status: string | null; lifecycle: string; last_sign_in_at: string | null };

const F = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => <div className={`field ${full ? 'full' : ''}`}><label>{label}</label>{children}</div>;

export function EditUserDialog({ user, onClose, onDelete }: { user: EditableUser | null; onClose: () => void; onDelete?: (u: EditableUser) => void }) {
  const qc = useQueryClient();
  const save = useServerFn(adminUpdateUser); const setStatus = useServerFn(adminSetStatus); const setPay = useServerFn(adminSetPayment);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!user) return null;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-txns'] }); };
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    setBusy(true); setErr('');
    const r = await fn().catch(() => ({ ok: false, error: 'Something went wrong. Please try again.' }));
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? 'Failed'); return false; }
    toast.success(okMsg); refresh(); return true;
  };
  const onSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? '');
    void run(() => save({ data: { userId: user.id, full_name: g('full_name'), email: g('email'), mobile: g('mobile'), account_type: g('account_type') as 'buyer' | 'seller', verification_status: g('verification_status') as 'approved', mobile_verified: f.get('mobile_verified') === 'on', city: g('city'), state: g('state'), country: g('country'), address: g('address'), pincode: g('pincode'), company_name: g('company_name'), business_type: g('business_type') } }), 'User details saved');
  };
  const onPay = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const mark = String(f.get('mark')) as 'paid' | 'unpaid';
    if (mark === 'unpaid' && !confirm('Mark as unpaid? The member loses dashboard access until payment is recorded again.')) return;
    const amt = String(f.get('amount') ?? '');
    void run(() => setPay({ data: { userId: user.id, mark, amount: amt ? Number(amt) : undefined, reference: String(f.get('reference') ?? '') || undefined, payment_date: String(f.get('payment_date') ?? '') || undefined, notes: String(f.get('notes') ?? '') || undefined } }), mark === 'paid' ? 'Payment recorded — account activated' : 'Marked as unpaid');
  };
  const suspended = user.status === 'suspended' || user.status === 'blocked';
  return <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Edit member</DialogTitle><DialogDescription>{user.email} · joined {fmtDate(user.created_at)} · updated {fmtDate((user as { updated_at?: string }).updated_at ?? user.created_at)}</DialogDescription></DialogHeader>
      <div className="flex flex-wrap gap-2 mb-2"><Status value={user.account_type} /><Status value={user.lifecycle} />{user.payment_status && <Status value={user.payment_status} />}<Status value={user.mobile_verified ? 'mobile_verified' : 'mobile_not_verified'} /></div>
      {err && <p role="alert" className="form-error">{err}</p>}

      <form className="form-grid" onSubmit={onSave}>
        <F label="Full name"><input name="full_name" className="field-input" defaultValue={user.full_name} required /></F>
        <F label="Email"><input name="email" type="email" className="field-input" defaultValue={user.email} required /></F>
        <F label="Mobile"><input name="mobile" className="field-input" defaultValue={user.mobile ?? ''} required /></F>
        <F label="Account type"><select name="account_type" className="field-input" defaultValue={user.account_type}><option value="buyer">Buyer</option><option value="seller">Seller</option></select></F>
        <F label="Verification status"><select name="verification_status" className="field-input" defaultValue={user.verification_status}><option value="not_submitted">Not submitted</option><option value="submitted">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="changes_required">Resubmission required</option></select></F>
        <F label="Mobile OTP"><label className="filter-check"><input type="checkbox" name="mobile_verified" defaultChecked={!!user.mobile_verified} /> Mobile verified</label></F>
        <F label="City"><input name="city" className="field-input" defaultValue={user.city ?? ''} /></F>
        <F label="State"><input name="state" className="field-input" defaultValue={user.state ?? ''} /></F>
        <F label="Country"><input name="country" className="field-input" defaultValue={user.country ?? ''} /></F>
        <F label="Pincode"><input name="pincode" className="field-input" defaultValue={user.pincode ?? ''} /></F>
        <F label="Address" full><input name="address" className="field-input" defaultValue={user.address ?? ''} /></F>
        <F label="Company name"><input name="company_name" className="field-input" defaultValue={user.company_name ?? ''} /></F>
        <F label="Business type"><input name="business_type" className="field-input" defaultValue={user.business_type ?? ''} /></F>
        <div className="form-actions full"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</Button></div>
      </form>

      <h3 className="mt-6">Payment</h3>
      <form className="form-grid" onSubmit={onPay}>
        <F label="Set payment as"><select name="mark" className="field-input" defaultValue={user.status === 'pending_payment' ? 'paid' : 'unpaid'}><option value="paid">Paid (activates account)</option><option value="unpaid">Unpaid (locks dashboard)</option></select></F>
        <F label="Amount (₹)"><input name="amount" type="number" min={0} className="field-input" placeholder="Default activation fee" /></F>
        <F label="Reference / transaction ID"><input name="reference" className="field-input" /></F>
        <F label="Payment date"><input name="payment_date" type="date" className="field-input" /></F>
        <F label="Notes" full><input name="notes" className="field-input" /></F>
        <div className="form-actions full"><Button type="submit" variant="outline" disabled={busy}>Update payment</Button></div>
      </form>

      <h3 className="mt-6">Access</h3>
      <div className="form-actions">
        {suspended
          ? <Button disabled={busy} onClick={() => void run(() => setStatus({ data: { userId: user.id, status: 'active' } }), 'Account reactivated')}>Reactivate account</Button>
          : user.status !== 'pending_payment' && <Button variant="outline" disabled={busy} onClick={() => { const reason = prompt('Reason for suspension (shown to the member):') ?? undefined; if (reason === undefined) return; void run(() => setStatus({ data: { userId: user.id, status: 'suspended', reason } }), 'Account suspended'); }}>Suspend account</Button>}
        {user.status === 'pending_payment' && <p className="muted">Dashboard is locked until payment is recorded.</p>}
      </div>

      {onDelete && <div className="panel mt-6" style={{ borderColor: 'hsl(var(--destructive))' }}>
        <strong>Danger zone</strong>
        <p className="muted">Permanently delete this member, their profile, documents and sessions. This cannot be undone.</p>
        <Button variant="destructive" onClick={() => onDelete(user)}>Delete user permanently</Button>
      </div>}
    </DialogContent>
  </Dialog>;
}

export function StaffSection() {
  const qc = useQueryClient();
  const list = useServerFn(listStaff); const create = useServerFn(createStaff); const update = useServerFn(updateStaff);
  const staff = useQuery({ queryKey: ['admin-staff'], queryFn: () => list() });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const perms = (f: FormData) => PERMISSIONS.map((p) => p[0]).filter((k) => f.get(`perm_${k}`) === 'on');
  const PermGrid = ({ selected }: { selected: string[] }) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 full">{PERMISSIONS.map(([k, l]) => <label key={k} className="filter-check"><input type="checkbox" name={`perm_${k}`} defaultChecked={selected.includes(k)} /> {l}</label>)}</div>;
  if (staff.data && !staff.data.ok) return <Panel><p className="muted">{staff.data.error}</p></Panel>;
  return <>
    {creating && <Panel title="New staff account"><form className="form-grid" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true);
      const r = await create({ data: { full_name: String(f.get('full_name')), email: String(f.get('email')), password: String(f.get('password')), permissions: perms(f) as never } }).catch(() => ({ ok: false as const, error: 'Please check the details.' }));
      setBusy(false); if (!r.ok) { toast.error(r.error); return; } toast.success('Staff account created'); setCreating(false); qc.invalidateQueries({ queryKey: ['admin-staff'] });
    }}>
      <F label="Full name"><input name="full_name" className="field-input" required minLength={2} /></F>
      <F label="Email"><input name="email" type="email" className="field-input" required /></F>
      <F label="Temporary password" full><input name="password" type="password" className="field-input" required minLength={8} /></F>
      <PermGrid selected={['view_users']} />
      <p className="muted full">Permanent deletion is reserved for the Master Admin and cannot be assigned.</p>
      <div className="form-actions full"><Button variant="outline" type="button" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create staff'}</Button></div>
    </form></Panel>}
    <Panel title="Staff & Permissions" action={!creating && <Button onClick={() => setCreating(true)}>Add staff</Button>}>
      <Table headers={['Staff', 'Status', 'Permissions', 'Created', '']} empty="No staff accounts yet." rows={(staff.data?.staff ?? []).flatMap((s) => {
        const row = [<div><strong>{s.full_name}</strong><small className="block muted">{s.email}</small></div>, <Status value={s.active ? 'active' : 'disabled'} />, <small>{s.permissions.length ? s.permissions.map((p: string) => PERMISSIONS.find((x) => x[0] === p)?.[1] ?? p).join(', ') : '—'}</small>, fmtDate(s.created_at), <Button size="sm" variant="ghost" onClick={() => setEditing(editing === s.user_id ? null : s.user_id)}>{editing === s.user_id ? 'Close' : 'Edit'}</Button>];
        if (editing !== s.user_id) return [row];
        return [row, [<form className="form-grid" style={{ gridColumn: '1/-1' }} onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true);
          const r = await update({ data: { userId: s.user_id, active: f.get('active') === 'on', permissions: perms(f) as never } }).catch(() => ({ ok: false as const, error: 'Could not save.' }));
          setBusy(false); if (!r.ok) { toast.error(r.error); return; } toast.success('Staff updated'); setEditing(null); qc.invalidateQueries({ queryKey: ['admin-staff'] });
        }}><label className="filter-check full"><input type="checkbox" name="active" defaultChecked={s.active} /> Account enabled</label><PermGrid selected={s.permissions} /><div className="form-actions full"><Button type="submit" disabled={busy}>Save permissions</Button></div></form>, '', '', '', '']];
      })} />
    </Panel>
  </>;
}

export function WebhooksSection() {
  const events = useQuery({ queryKey: ['webhook-events'], queryFn: async () => { const { data } = await supabase.from('webhook_events').select('*').order('received_at', { ascending: false }).limit(100); return data ?? []; } });
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/api/public/webhooks/n8n`;
  return <>
    <Panel title="n8n webhook endpoint">
      <p className="muted">Send POST requests from n8n (HTTP Request node) to this address:</p>
      <code className="block p-3 my-2 break-all">{url || '/api/public/webhooks/n8n'}</code>
      <p className="muted small">Headers: <code>x-webhook-secret: your shared secret</code>, <code>Content-Type: application/json</code>. Body: <code>{'{"event_id":"unique-id","event":"user.registered","data":{…}}'}</code>. Repeated <code>event_id</code>s are safely ignored.</p>
      <p className="muted small">Supported events: user.registered, user.otp_verified, user.payment_pending, user.payment_success, user.payment_failed, user.login, user.suspended, user.activated, user.deleted.</p>
    </Panel>
    <Panel title="Recent events">
      <Table headers={['Received', 'Event', 'Event ID', 'Source', 'Status']} empty="No events received yet." rows={(events.data ?? []).map((e) => [fmtDate(e.received_at) + ' ' + new Date(e.received_at).toLocaleTimeString('en-IN'), <strong>{e.event_type}</strong>, <small>{e.event_id}</small>, e.source ?? '—', <Status value={e.status} />])} />
    </Panel>
  </>;
}
