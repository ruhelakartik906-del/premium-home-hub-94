import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FileText, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export const DOC_TYPES: { key: string; label: string; hint: string; required: boolean; seller?: boolean }[] = [
  { key: 'pan_card', label: 'PAN card', hint: 'Clear photo or scan of your PAN card', required: true },
  { key: 'identity', label: 'Government ID (Aadhaar / Passport)', hint: 'Front side, all details readable', required: true },
  { key: 'address_proof', label: 'Address proof', hint: 'Utility bill, bank statement or rent agreement (last 3 months)', required: true },
  { key: 'photo', label: 'Your photograph', hint: 'Recent passport-style photo, face clearly visible', required: true },
  { key: 'gst_certificate', label: 'GST certificate', hint: 'If your business is GST registered', required: false, seller: true },
];
export const DOC_LABELS: Record<string, string> = Object.fromEntries([...DOC_TYPES.map((d) => [d.key, d.label]), ['other', 'Other document']]);
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX = 10 * 1024 * 1024;

export type KycDoc = { id: string; doc_type: string; file_path: string; file_name: string; mime_type: string; size_bytes: number; submission_id: string | null; created_at: string };

function uploadWithProgress(path: string, file: File, token: string, onProgress: (n: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${import.meta.env['VITE_SUPABASE_URL']}/storage/v1/object/kyc-docs/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY']);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

export async function openKycDoc(path: string) {
  const { data, error } = await supabase.storage.from('kyc-docs').createSignedUrl(path, 120);
  if (error || !data) { toast.error('Could not open the document'); return; }
  window.open(data.signedUrl, '_blank', 'noopener');
}

/** Member-side uploader. `required` = doc keys the admin flagged (others are locked) or null when everything is editable. */
export function KycDocumentsUploader({ userId, role, required, onReadyChange }: { userId: string; role: 'buyer' | 'seller'; required: string[] | null; onReadyChange?: (ready: boolean) => void }) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<Record<string, number>>({});
  const q = useQuery({ queryKey: ['my-kyc-docs', userId], queryFn: async () => {
    const { data: drafts } = await supabase.from('kyc_documents').select('*').eq('user_id', userId).is('submission_id', null).order('created_at', { ascending: false });
    const { data: last } = await supabase.from('kyc_submissions').select('id').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data: prev } = last ? await supabase.from('kyc_documents').select('*').eq('submission_id', last.id) : { data: [] };
    return { drafts: (drafts ?? []) as KycDoc[], prev: (prev ?? []) as KycDoc[] };
  } });
  const types = DOC_TYPES.filter((d) => !d.seller || role === 'seller');
  const draftOf = (k: string) => q.data?.drafts.find((d) => d.doc_type === k);
  const prevOf = (k: string) => q.data?.prev.find((d) => d.doc_type === k);
  const ready = !!q.data && types.every((t) => {
    if (!t.required && !required?.includes(t.key)) return true;
    if (required?.includes(t.key)) return !!draftOf(t.key);
    return !!draftOf(t.key) || !!prevOf(t.key);
  });
  useEffect(() => { onReadyChange?.(ready); }, [ready, onReadyChange]);

  const upload = async (docType: string, file: File) => {
    if (!ALLOWED.includes(file.type)) { toast.error('Only JPG, PNG, WEBP or PDF files are allowed'); return; }
    if (file.size > MAX) { toast.error('File must be under 10 MB'); return; }
    const { data: s } = await supabase.auth.getSession(); const token = s.session?.access_token;
    if (!token) { toast.error('Please sign in again'); return; }
    const safe = file.name.replace(/[^\w.-]/g, '_').slice(-80);
    const path = `${userId}/${docType}/${Date.now()}-${safe}`;
    setProgress((p) => ({ ...p, [docType]: 0 }));
    try {
      await uploadWithProgress(path, file, token, (n) => setProgress((p) => ({ ...p, [docType]: n })));
      const old = draftOf(docType);
      const { error } = await supabase.from('kyc_documents').insert({ user_id: userId, doc_type: docType, file_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size });
      if (error) { await supabase.storage.from('kyc-docs').remove([path]); throw error; }
      if (old) { await supabase.from('kyc_documents').delete().eq('id', old.id); await supabase.storage.from('kyc-docs').remove([old.file_path]); }
      toast.success(`${DOC_LABELS[docType]} uploaded`);
    } catch (e) { console.error(e); toast.error('Upload failed. Please try again.'); }
    finally { setProgress((p) => { const n = { ...p }; delete n[docType]; return n; }); qc.invalidateQueries({ queryKey: ['my-kyc-docs', userId] }); }
  };
  const remove = async (d: KycDoc) => {
    const { error } = await supabase.from('kyc_documents').delete().eq('id', d.id);
    if (error) { toast.error('Could not delete'); return; }
    await supabase.storage.from('kyc-docs').remove([d.file_path]);
    toast.success('Document removed'); qc.invalidateQueries({ queryKey: ['my-kyc-docs', userId] });
  };

  return <div className="form-grid" style={{ marginTop: 8 }}>
    {types.map((t) => {
      const d = draftOf(t.key); const p = prevOf(t.key); const pct = progress[t.key];
      const locked = !!required && !required.includes(t.key); const flagged = !!required?.includes(t.key);
      return <div className="field" key={t.key} style={flagged ? { outline: '1px solid var(--destructive)', borderRadius: 8, padding: 8 } : undefined}>
        <label>{t.label}{t.required ? ' *' : ''}{flagged && <small className="danger-text"> — upload a new file</small>}{locked && <small className="muted"> — locked</small>}</label>
        <small className="muted">{t.hint}. JPG, PNG, WEBP or PDF, up to 10 MB.</small>
        {d ? <div className="row-actions" style={{ marginTop: 6 }}><button type="button" className="text-link" onClick={() => openKycDoc(d.file_path)}><FileText size={13} /> {d.file_name}</button><small className="muted">{(d.size_bytes / 1024 / 1024).toFixed(1)} MB</small>{!locked && <Button type="button" size="sm" variant="ghost" aria-label="Delete" onClick={() => remove(d)}><Trash2 size={14} /></Button>}</div>
          : p ? <div className="row-actions" style={{ marginTop: 6 }}><button type="button" className="text-link" onClick={() => openKycDoc(p.file_path)}><FileText size={13} /> {p.file_name}</button><small className="muted">{flagged ? 'previous file, needs replacing' : 'on file'}</small></div> : null}
        {pct !== undefined ? <div style={{ marginTop: 6 }}><div style={{ height: 6, borderRadius: 3, background: 'var(--muted)' }}><div style={{ width: `${pct}%`, height: 6, borderRadius: 3, background: 'var(--primary)', transition: 'width .2s' }} /></div><small className="muted">Uploading… {pct}%</small></div>
          : !locked && <label className="text-link" style={{ marginTop: 6, cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Upload size={14} /> {d || p ? 'Replace file' : 'Upload file'}<input type="file" accept={ALLOWED.join(',')} hidden aria-label={`Upload ${t.label}`} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(t.key, f); }} /></label>}
      </div>;
    })}
  </div>;
}

/** Admin viewer for one submission. */
export function KycDocsViewer({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['kyc-docs-sub', submissionId], enabled: open, queryFn: async () => ((await supabase.from('kyc_documents').select('*').eq('submission_id', submissionId)).data ?? []) as KycDoc[] });
  return <><Button size="sm" variant="outline" onClick={() => setOpen(!open)}><FileText size={14} /> Documents</Button>
    {open && <div className="doc-pop"><div className="panel-head"><strong>Verification documents</strong><Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close"><X /></Button></div>
      {q.isLoading ? <p className="muted">Loading…</p> : q.data?.length ? q.data.map((d) => <button key={d.id} type="button" className="text-link block" onClick={() => openKycDoc(d.file_path)}><FileText size={13} /> {DOC_LABELS[d.doc_type] ?? d.doc_type}: {d.file_name}</button>) : <p className="muted">No documents attached.</p>}
      <small className="muted">Opens a private link that expires in 2 minutes. Visible only to the member and Master Admin.</small></div>}</>;
}
