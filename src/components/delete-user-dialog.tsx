import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminDeleteUserPermanently } from '@/lib/delete-user.functions';

export type DeleteTarget = { id: string; full_name: string; email: string; mobile: string | null; role: string; status: string; payment_status: string | null };
const REASONS = ['Duplicate account', 'User requested deletion', 'Fraud/security issue', 'Incorrect registration', 'Administrative cleanup', 'Other'];

export function DeleteUserDialog({ user, onClose }: { user: DeleteTarget | null; onClose: () => void }) {
  const del = useServerFn(adminDeleteUserPermanently); const qc = useQueryClient();
  const [typed, setTyped] = useState(''); const [reason, setReason] = useState(''); const [other, setOther] = useState(''); const [busy, setBusy] = useState(false);
  const close = () => { if (busy) return; setTyped(''); setReason(''); setOther(''); onClose(); };
  const run = async () => {
    if (!user || typed !== 'DELETE') return; setBusy(true);
    const r = await del({ data: { userId: user.id, confirm: 'DELETE', reason: reason === 'Other' ? other || 'Other' : reason || undefined } }).catch(() => ({ ok: false as const, error: 'Could not delete the user.' }));
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    qc.setQueryData(['admin-users'], (old: { id: string }[] | undefined) => old?.filter((x) => x.id !== user.id));
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    toast.success('User permanently deleted.'); setTyped(''); setReason(''); setOther(''); onClose();
  };
  const rows: [string, string | null][] = user ? [['Name', user.full_name], ['Email', user.email], ['Mobile', user.mobile], ['Role', user.role], ['Account status', user.status], ['Payment status', user.payment_status], ['User ID', user.id]] : [];
  return <Dialog open={!!user} onOpenChange={(o) => !o && close()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle size={18} /> Permanently Delete This User?</DialogTitle>
        <DialogDescription>This action permanently deletes the user's account and associated records and cannot be undone.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1 text-sm">{rows.map(([l, v]) => <div key={l} className="flex justify-between gap-4"><span className="text-muted-foreground">{l}</span><strong className="break-all text-right">{v || '—'}</strong></div>)}</div>
      <p className="text-xs text-muted-foreground">Payment records are kept for accounting with personal details removed. Seller listings are taken offline, not deleted.</p>
      <label className="grid gap-1 text-sm">Deletion reason (optional)
        <select className="field-input" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Select a reason</option>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
      </label>
      {reason === 'Other' && <input className="field-input" maxLength={300} placeholder="Describe the reason" value={other} onChange={(e) => setOther(e.target.value)} />}
      <label className="grid gap-1 text-sm">Type <strong>DELETE</strong> to confirm
        <input className="field-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
        <Button variant="destructive" disabled={typed !== 'DELETE' || busy} onClick={run}>{busy ? 'Deleting…' : 'Delete permanently'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
