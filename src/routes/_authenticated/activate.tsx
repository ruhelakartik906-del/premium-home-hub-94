import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LockKeyhole, LogOut, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/eliteoz';
import { usePayActivation } from '@/components/activation-banner';
import { supabase } from '@/integrations/supabase/client';
import { accountAccess } from '@/lib/access';
import { useServerFn } from '@tanstack/react-start';
import { getActivationOptions, skipActivationPayment, getTermsStatus, acceptTerms } from '@/lib/payments.functions';
import { TermsPanel } from '@/components/terms-panel';
import { TERMS_CHECKBOX_LABEL, TERMS_REQUIRED_MSG } from '@/lib/terms';

export const Route = createFileRoute('/_authenticated/activate')({
  beforeLoad: async () => {
    const a = await accountAccess();
    if (!a) throw redirect({ to: '/login' });
    if (!a.pending) throw redirect({ to: a.dest });
  },
  head: () => ({ meta: [
    { title: 'Complete Activation Payment | ELITEOZ' },
    { name: 'description', content: 'Complete your Eliteoz membership activation payment to open your dashboard.' },
    { property: 'og:title', content: 'Complete Activation Payment | ELITEOZ' },
    { property: 'og:description', content: 'Complete your Eliteoz membership activation payment to open your dashboard.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ActivatePage,
});

function ActivatePage() {
  const navigate = useNavigate();
  const pay = usePayActivation();
  const [cfg, setCfg] = useState<{ enabled: boolean; fee: number } | null>(null);
  const getOpts = useServerFn(getActivationOptions); const skip = useServerFn(skipActivationPayment);
  const [bypass, setBypass] = useState(false);
  const termsStatus = useServerFn(getTermsStatus); const saveTerms = useServerFn(acceptTerms);
  const [agreed, setAgreed] = useState(false); const [termsSaved, setTermsSaved] = useState(false);
  useEffect(() => { termsStatus().then((t) => { if (t.accepted) { setTermsSaved(true); setAgreed(true); } }).catch(() => undefined); }, [termsStatus]);
  const ensureTerms = async () => {
    if (termsSaved) return true;
    if (!agreed) { setErr(TERMS_REQUIRED_MSG); return false; }
    const r = await saveTerms({ data: { accepted: true } }).catch(() => ({ ok: false as const, error: 'Could not save your acceptance. Please try again.' }));
    if (!r.ok) { setErr(r.error); return false; }
    setTermsSaved(true); return true;
  };
  useEffect(() => { getOpts().then((o) => setBypass(o.bypassAllowed)).catch(() => setBypass(false)); }, [getOpts]);
  const doSkip = async () => {
    setBusy(true); setErr('');
    if (!(await ensureTerms())) { setBusy(false); return; }
    const r = await skip().catch(() => ({ ok: false as const, error: 'Could not activate. Please try again.' }));
    if (r.ok) { const a = await accountAccess(); if (a && !a.pending) { toast.success('Test activation done — payment bypassed'); navigate({ to: a.dest, replace: true }); return; } }
    setErr(r.ok ? 'Activated. Please refresh.' : r.error); setBusy(false);
  };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    supabase.from('payment_settings').select('enabled,activation_fee').eq('id', 1).maybeSingle()
      .then(({ data }) => setCfg({ enabled: !!data?.enabled, fee: Number(data?.activation_fee ?? 50000) }));
  }, []);
  const go = async () => {
    setBusy(true); setErr('');
    if (!(await ensureTerms())) { setBusy(false); return; }
    const r = await pay();
    if (r.status === 'paid') {
      const a = await accountAccess();
      if (a && !a.pending) { toast.success('Payment confirmed — your account is active'); navigate({ to: a.dest, replace: true }); return; }
      setErr('Payment received. Confirmation is still processing — refresh in a moment.');
    } else setErr(r.reason);
    setBusy(false);
  };
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: '/login', replace: true }); };

  return <PageShell><main className="auth-main" style={{ minHeight: '70vh' }}><div className="auth-panel">
    <span className="eyebrow">MEMBERSHIP ACTIVATION</span>
    <h1>Complete your activation payment.</h1>
    <div className="alert-band danger"><LockKeyhole size={18} /><div>Your registration is complete, but your membership activation payment is pending. Complete the payment to access your dashboard.</div></div>
    <div className="panel pay-panel"><div className="pay-head"><div><span className="eyebrow">ACTIVATION FEE</span>
      <div className="payment-total">{cfg ? `₹${cfg.fee.toLocaleString('en-IN')}` : '—'}</div></div></div>
      <p className="muted">Your account opens only after the payment is confirmed securely by the payment provider. Your details are saved — you can close this page and return any time by logging in.</p></div>
    <TermsPanel />
    <label className="flex items-start gap-3" style={{ cursor: 'pointer' }}>
      <input type="checkbox" checked={agreed} disabled={termsSaved} onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setErr(''); }} style={{ marginTop: 4, width: 18, height: 18 }} />
      <span>{TERMS_CHECKBOX_LABEL}</span>
    </label>
    {bypass && <div className="preview-warning"><strong>Testing Mode — Payment gateway is currently unavailable.</strong> You can skip payment for testing. This is recorded as a test activation, not a real payment.</div>}
    {cfg && !cfg.enabled && !bypass && <div className="preview-warning"><strong>Online payment is not connected yet.</strong> The Eliteoz team will share payment instructions, or you can <Link className="text-link" to="/contact">contact us</Link>. Your account stays saved.</div>}
    {err && <p role="alert" className="form-error">{err}</p>}
    <div className="form-actions">
      <Button variant="outline" onClick={signOut}><LogOut /> Log out</Button>
      {bypass && <Button variant="outline" disabled={busy} onClick={doSkip}>Skip Payment (Testing)</Button>}
      <Button disabled={busy || !cfg?.enabled} onClick={go}><Wallet /> {busy ? 'Processing…' : 'Complete payment'}</Button>
    </div>
  </div></main></PageShell>;
}
