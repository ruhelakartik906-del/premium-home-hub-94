import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LockKeyhole, LogOut, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/eliteoz';
import { usePayActivation } from '@/components/activation-banner';
import { supabase } from '@/integrations/supabase/client';
import { accountAccess } from '@/lib/access';

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    supabase.from('payment_settings').select('enabled,activation_fee').eq('id', 1).maybeSingle()
      .then(({ data }) => setCfg({ enabled: !!data?.enabled, fee: Number(data?.activation_fee ?? 50000) }));
  }, []);
  const go = async () => {
    setBusy(true); setErr('');
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
    {cfg && !cfg.enabled && <div className="preview-warning"><strong>Online payment is not connected yet.</strong> The Eliteoz team will share payment instructions, or you can <Link className="text-link" to="/contact">contact us</Link>. Your account stays saved.</div>}
    {err && <p role="alert" className="form-error">{err}</p>}
    <div className="form-actions">
      <Button variant="outline" onClick={signOut}><LogOut /> Log out</Button>
      <Button disabled={busy || !cfg?.enabled} onClick={go}><Wallet /> {busy ? 'Processing…' : 'Complete payment'}</Button>
    </div>
  </div></main></PageShell>;
}
