import { Link, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, LockKeyhole, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Notice, PageShell } from '@/components/eliteoz';
import { hero } from '@/lib/eliteoz-data';
import { registerMember, ACTIVATION_FEE } from '@/lib/members.functions';
import { createFirstAdmin } from '@/lib/admin-setup.functions';
import { supabase } from '@/integrations/supabase/client';
import { accountAccess } from '@/lib/access';

type Role = 'buyer' | 'seller';
type FieldKey = 'full_name' | 'email' | 'password' | 'mobile' | 'dob' | 'gender' | 'country' | 'state' | 'city' | 'address' | 'pincode' | 'company_name' | 'business_type';
type Details = Partial<Record<FieldKey, string>>;
const fields: { key: FieldKey; label: string; type?: string; required?: boolean; full?: boolean; seller?: boolean }[] = [
  { key: 'full_name', label: 'Full name', required: true },
  { key: 'email', label: 'Email address', type: 'email', required: true },
  { key: 'mobile', label: 'Mobile number', type: 'tel', required: true },
  { key: 'password', label: 'Create password (min 8 characters)', type: 'password', required: true },
  { key: 'dob', label: 'Date of birth', type: 'date' },
  { key: 'gender', label: 'Gender' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'pincode', label: 'Pincode' },
  { key: 'address', label: 'Full address', full: true },
  { key: 'company_name', label: 'Company / business name', seller: true },
  { key: 'business_type', label: 'Business type', seller: true },
];

export function OtpInput({ value, onChange, onComplete }: { value: string[]; onChange: (v: string[]) => void; onComplete?: (code: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (next: string[]) => { onChange(next); if (next.every((d) => d) && onComplete) onComplete(next.join('')); };
  return <div className="otp-inputs" onPaste={(e) => { const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split(''); if (!digits.length) return; e.preventDefault(); const next = [...value]; digits.forEach((d, i) => { next[i] = d; }); set(next); refs.current[Math.min(digits.length, 5)]?.focus(); }}>
    {value.map((digit, i) => <input key={i} ref={(el) => { refs.current[i] = el; }} aria-label={`OTP digit ${i + 1}`} inputMode="numeric" autoComplete="one-time-code" maxLength={1} value={digit} autoFocus={i === 0}
      onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(-1); const next = value.map((x, j) => (j === i ? d : x)); set(next); if (d && i < 5) refs.current[i + 1]?.focus(); }}
      onKeyDown={(e) => { if (e.key === 'Backspace' && !value[i] && i > 0) { refs.current[i - 1]?.focus(); onChange(value.map((x, j) => (j === i - 1 ? '' : x))); } if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus(); if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus(); }} />)}
  </div>;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Date of birth as three simple pickers (DD / Month / YYYY). Submits ISO yyyy-mm-dd via a hidden input. */
export function DobInput({ name, defaultValue, required }: { name: string; defaultValue?: string | null | undefined; required?: boolean }) {
  const [y0, m0, d0] = (defaultValue ?? '').split('-');
  const [d, setD] = useState(d0 ?? ''); const [m, setM] = useState(m0 ?? ''); const [y, setY] = useState(y0 ?? '');
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 83 }, (_, i) => String(thisYear - 18 - i));
  const maxDay = y && m ? new Date(Number(y), Number(m), 0).getDate() : 31;
  const day = d && Number(d) > maxDay ? String(maxDay).padStart(2, '0') : d;
  const value = day && m && y ? `${y}-${m}-${day}` : '';
  return <div className="dob-input">
    <select aria-label="Day" className="field-input" value={day} required={required} onChange={(e) => setD(e.target.value)}><option value="">DD</option>{Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0')).map((x) => <option key={x} value={x}>{x}</option>)}</select>
    <select aria-label="Month" className="field-input" value={m} required={required} onChange={(e) => setM(e.target.value)}><option value="">Month</option>{MONTHS.map((x, i) => <option key={x} value={String(i + 1).padStart(2, '0')}>{x}</option>)}</select>
    <select aria-label="Year" className="field-input" value={y} required={required} onChange={(e) => setY(e.target.value)}><option value="">YYYY</option>{years.map((x) => <option key={x}>{x}</option>)}</select>
    <input type="hidden" name={name} value={value} />
    {value && <small className="dob-preview">{day}/{m}/{y}</small>}
  </div>;
}

type PaySettings = { enabled: boolean; activation_fee: number; provider: string; mode: string };

import { usePayActivation } from '@/components/activation-banner';
export function RegisterFlow({ initialRole }: { initialRole?: string }) {
  const navigate = useNavigate();
  const register = useServerFn(registerMember);
  const [role, setRole] = useState<Role | null>(initialRole === 'buyer' || initialRole === 'seller' ? initialRole : null);
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<Details>({});
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const payActivation = usePayActivation();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pay, setPay] = useState<PaySettings | null>(null);
  useEffect(() => { supabase.from('payment_settings').select('enabled,activation_fee,provider,mode').eq('id', 1).maybeSingle().then(({ data }) => setPay(data ? { ...data, activation_fee: Number(data.activation_fee) } : { enabled: false, activation_fee: ACTIVATION_FEE, provider: '', mode: 'test' })); }, []);
  const gateway = !!pay?.enabled;
  const fee = pay?.activation_fee ?? ACTIVATION_FEE;
  const steps = ['Your details', 'Verify mobile', 'Activation payment'];

  const [dup, setDup] = useState(false);
  const finish = async () => {
    if (!role) return;
    setBusy(true); setError(''); setDup(false);
    const res = await register({ data: { role, full_name: details['full_name'] ?? '', email: details['email'] ?? '', password: details['password'] ?? '', mobile: details['mobile'] ?? '', dob: details['dob'] ?? '', gender: details['gender'], country: details['country'], state: details['state'], city: details['city'], address: details['address'], pincode: details['pincode'], company_name: details['company_name'], business_type: details['business_type'] } }).catch(() => ({ ok: false as const, error: 'Please check your details and try again.' }));
    if (!res.ok) { setBusy(false); setError(res.error); setDup('duplicate' in res && !!res.duplicate); return; }
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: details['email'] ?? '', password: details['password'] ?? '' });
    setBusy(false);
    if (signErr) { toast.error('Account created. Please log in to complete payment.'); navigate({ to: '/login' }); return; }
    toast.success('Registration complete — one last step: activation payment');
    navigate({ to: '/activate', replace: true });
  };
  const afterOtp = () => { void finish(); };

  return <PageShell><div className="auth-wrap"><aside className="auth-image"><img src={hero} alt="Luxury residence" /><div className="auth-caption">A more considered<br />way to move.</div></aside><main className="auth-main"><div className="auth-panel">
    <span className="eyebrow">ELITEOZ MEMBERSHIP</span>
    {!role ? <><h1>Choose your account type.</h1><p>Your journey starts with the right perspective.</p><div className="role-grid">
      <button className="role-card" onClick={() => setRole('buyer')}><UserRound size={27} /><strong>Buyer</strong><span>Discover verified high-value properties and manage your interests privately.</span></button>
      <button className="role-card" onClick={() => setRole('seller')}><BriefcaseBusiness size={27} /><strong>Seller</strong><span>Present and manage high-value properties for a considered audience.</span></button>
    </div></> : <>
      <h1>{step === 0 ? `${role === 'buyer' ? 'Buyer' : 'Seller'} registration` : step === 1 ? 'Verify your mobile' : 'Activate your membership'}</h1>
      <p>{step === 0 ? 'Tell us a little about yourself. Identity documents are collected later in Verification.' : step === 1 ? `Enter the 6-digit code sent to ${details['mobile'] ?? 'your mobile'}.` : 'One final step and your dashboard opens automatically.'}</p>
      <div className="steps">{steps.map((x, i) => <div className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} key={x}><span>{i < step ? '✓' : i + 1}</span>{x}</div>)}</div>

      {step === 0 && <form id="details-form" className="form-grid" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const d: Record<string, string> = {}; f.forEach((v, k) => { d[k] = String(v); }); if ((d['password'] ?? '').length < 8) { setError('Password must be at least 8 characters.'); return; } setDetails(d as Details); setError(''); setStep(1); }}>
        {fields.filter((x) => !x.seller || role === 'seller').map((x) => <div key={x.key} className={`field ${x.full || x.key === 'dob' ? 'full' : ''}`}><label htmlFor={x.key}>{x.label}{x.required && ' *'}</label>
          {x.key === 'gender' ? <select id={x.key} name={x.key} className="field-input" defaultValue={details[x.key] ?? ''}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
            : x.key === 'dob' ? <DobInput name="dob" defaultValue={details['dob']} />
            : <input id={x.key} name={x.key} className="field-input" type={x.type ?? 'text'} required={x.required} defaultValue={details[x.key] ?? ''} minLength={x.key === 'password' ? 8 : undefined} placeholder={x.label} />}
          {x.seller && <small className="muted">Set once. Later changes are handled by the Eliteoz team via a support ticket.</small>}</div>)}
      </form>}

      {step === 1 && <><Notice>Demo mode: SMS is not sent yet. Enter any 6 digits — the cursor moves automatically and you continue once all digits are filled.</Notice>
        <OtpInput value={otp} onChange={setOtp} onComplete={() => { setTimeout(afterOtp, 350); }} />
        <div className="flex gap-2"><Button variant="link" onClick={() => { setOtp(['', '', '', '', '', '']); toast('A new code would be sent here once SMS is connected.'); }}>Resend OTP</Button><Button variant="link" onClick={() => setStep(0)}>Change number</Button></div></>}

      {step === 2 && gateway && <><div className="panel pay-panel"><div className="pay-head"><div><span className="eyebrow">ACTIVATION FEE</span><div className="payment-total">₹{fee.toLocaleString('en-IN')}</div></div><span className="status pending">{pay?.mode === 'live' ? 'RAZORPAY' : 'TEST MODE'}</span></div>
        <p className="muted">You'll pay securely via Razorpay (card, UPI or net banking). Your account activates only after Razorpay confirms the payment.</p>
        <label className="filter-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to the activation terms and <Link className="text-link" to="/payment-policy">payment policy</Link>.</label></div>
        {pay?.mode !== 'live' && <div className="preview-warning"><strong>Razorpay test mode.</strong> Use Razorpay test cards — no real money is charged.</div>}</>}

      {busy && step === 1 && <p className="muted">Creating your account…</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      {dup && <Button onClick={() => navigate({ to: '/login' })}>Go to login <ArrowRight /></Button>}
      <div className="form-actions">
        <Button variant="outline" disabled={busy} onClick={() => { setError(''); if (step === 0) setRole(null); else setStep(step - 1); }}><ArrowLeft /> Back</Button>
        {step === 0 && <Button type="submit" form="details-form">Continue <ArrowRight /></Button>}
        {step === 1 && <Button disabled={busy || otp.join('').length !== 6} onClick={afterOtp}>{busy ? 'Please wait…' : <>Verify & continue to payment <ArrowRight /></>}</Button>}
        {step === 2 && <Button disabled={busy} onClick={finish}>{busy ? 'Processing…' : <>Pay ₹{fee.toLocaleString('en-IN')} <LockKeyhole /></>}</Button>}
      </div>
    </>}
    <p className="auth-note">Already a member? <Link className="text-link" to="/login">Log in</Link></p>
  </div></main></div></PageShell>;
}

export async function routeForUser() {
  return (await accountAccess())?.dest ?? null;
}

export function LoginPage({ kind }: { kind: 'login' | 'forgot-password' | 'reset-password' }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setMsg('');
    const email = String(f.get('email') ?? ''); const password = String(f.get('password') ?? '');
    if (kind === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setBusy(false); setMsg('Incorrect email or password.'); return; }
      const nextParam = new URLSearchParams(window.location.search).get('next');
      if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) { window.location.href = nextParam; return; }
      const to = await routeForUser(); setBusy(false); navigate({ to: to ?? '/' });
    } else if (kind === 'forgot-password') {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false); setMsg('If an account exists for this email, a reset link has been sent.');
    } else {
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false); if (error) { setMsg('This reset link is invalid or has expired.'); return; }
      toast.success('Password updated'); const to = await routeForUser(); navigate({ to: to ?? '/login' });
    }
  };
  return <PageShell><div className="auth-wrap"><aside className="auth-image"><img src={hero} alt="Luxury residence" /><div className="auth-caption">Your next move<br />starts here.</div></aside><main className="auth-main"><div className="auth-panel">
    <span className="eyebrow">MEMBER ACCESS</span>
    <h1>{kind === 'login' ? 'Welcome back.' : kind === 'forgot-password' ? 'Reset your password.' : 'Choose a new password.'}</h1>
    <p>{kind === 'login' ? 'Access your private Eliteoz workspace. You will be taken to the right dashboard automatically.' : kind === 'forgot-password' ? 'We will email you a secure reset link.' : 'Enter a new password for your account.'}</p>
    <form className="form-grid" onSubmit={submit}>
      {kind !== 'reset-password' && <div className="field full"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" className="field-input" required placeholder="you@example.com" /></div>}
      {kind !== 'forgot-password' && <div className="field full"><label htmlFor="password">{kind === 'login' ? 'Password' : 'New password'}</label><input id="password" name="password" type="password" minLength={kind === 'login' ? undefined : 8} className="field-input" required placeholder="Enter password" /></div>}
      <div className="field full"><Button type="submit" disabled={busy}>{busy ? 'Please wait…' : kind === 'login' ? 'Log in' : 'Continue'} <ArrowRight /></Button></div>
    </form>
    {msg && <p role="alert" className="form-error">{msg}</p>}
    <p className="auth-note"><Link className="text-link" to="/forgot-password">Forgot password?</Link> · New here? <Link className="text-link" to="/register">Create an account</Link></p>
  </div></main></div></PageShell>;
}

export function AdminSetup({ available }: { available: boolean }) {
  const navigate = useNavigate();
  const create = useServerFn(createFirstAdmin);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return <PageShell><div className="auth-wrap"><aside className="auth-image"><img src={hero} alt="" /><div className="auth-caption">Master Admin<br />setup.</div></aside><main className="auth-main"><div className="auth-panel">
    <span className="eyebrow">ONE-TIME SETUP</span><h1>Create the Master Admin.</h1>
    {!available ? <><p>A Master Admin already exists. Please log in.</p><Button asChild><Link to="/login">Log in</Link></Button></> : <form className="form-grid" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setErr('');
      const d = { full_name: String(f.get('full_name')), email: String(f.get('email')), password: String(f.get('password')) };
      const res = await create({ data: d }).catch(() => ({ ok: false as const, error: 'Please check the details.' }));
      if (!res.ok) { setBusy(false); setErr(res.error); return; }
      await supabase.auth.signInWithPassword({ email: d.email, password: d.password }); setBusy(false); navigate({ to: '/admin' });
    }}>
      <div className="field full"><label>Full name</label><input name="full_name" className="field-input" required /></div>
      <div className="field full"><label>Email</label><input name="email" type="email" className="field-input" required /></div>
      <div className="field full"><label>Password (min 8)</label><input name="password" type="password" minLength={8} className="field-input" required /></div>
      <div className="field full"><Button type="submit" disabled={busy}><CheckCircle2 /> {busy ? 'Creating…' : 'Create Master Admin'}</Button></div>
      {err && <p className="form-error">{err}</p>}
    </form>}
  </div></main></div></PageShell>;
}
