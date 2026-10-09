import { Link, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, LockKeyhole, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Notice, PageShell } from '@/components/eliteoz';
import { hero } from '@/lib/eliteoz-data';
import { registerMember, ACTIVATION_FEE } from '@/lib/members.functions';
import { sendOtp, verifyOtp } from '@/lib/otp.functions';
import { recordAuthEvent } from '@/lib/admin-users.functions';
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

  const [dup, setDup] = useState<false | 'active' | 'pending'>(false);
  const send = useServerFn(sendOtp);
  const verify = useServerFn(verifyOtp);
  const [masked, setMasked] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const [otpToken, setOtpToken] = useState('');
  const [info, setInfo] = useState('');
  useEffect(() => { if (step !== 1) return; setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [step]);
  const secsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const requestOtp = async (mobile: string, email: string) => {
    setBusy(true); setError(''); setInfo(''); setDup(false);
    const r = await send({ data: { mobile, email } }).catch(() => ({ ok: false as const, error: 'Please enter a valid 10-digit Indian mobile number.' }));
    setBusy(false);
    if (!r.ok) { setError(r.error); if ('duplicate' in r && r.duplicate) setDup(r.duplicate); if ('retryAfter' in r && r.retryAfter) setResendAt(Date.now() + r.retryAfter * 1000); return false; }
    setMasked(r.masked); setOtp(['', '', '', '', '', '']); setOtpToken('');
    setExpiresAt(Date.now() + r.expiresIn * 1000); setResendAt(Date.now() + r.resendIn * 1000); setNow(Date.now());
    setInfo(`OTP sent successfully to ${r.masked}`);
    return true;
  };
  const finish = async (tokenArg?: string) => {
    if (!role) return;
    const token = tokenArg ?? otpToken;
    if (!token) { setError('Please verify your mobile number first.'); return; }
    setBusy(true); setError(''); setDup(false);
    const res = await register({ data: { otpToken: token, role, full_name: details['full_name'] ?? '', email: details['email'] ?? '', password: details['password'] ?? '', mobile: details['mobile'] ?? '', dob: details['dob'] ?? '', gender: details['gender'], country: details['country'], state: details['state'], city: details['city'], address: details['address'], pincode: details['pincode'], company_name: details['company_name'], business_type: details['business_type'] } }).catch(() => ({ ok: false as const, error: 'Please check your details and try again.' }));
    if (!res.ok) { setBusy(false); setError(res.error); setDup('duplicate' in res && res.duplicate ? res.duplicate : false); if ('reverify' in res) { setOtpToken(''); setOtp(['', '', '', '', '', '']); } return; }
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: details['email'] ?? '', password: details['password'] ?? '' });
    setBusy(false);
    if (signErr) { toast.error('Account created. Please log in to complete payment.'); navigate({ to: '/login' }); return; }
    toast.success('Mobile verified — one last step: activation payment');
    navigate({ to: '/activate', replace: true });
  };
  const afterOtp = async (code?: string) => {
    const c = code ?? otp.join('');
    if (busy || c.length !== 6) return;
    setBusy(true); setError(''); setInfo('');
    const r = await verify({ data: { mobile: details['mobile'] ?? '', otp: c } }).catch(() => ({ ok: false as const, error: 'Could not verify the OTP. Please try again.' }));
    setBusy(false);
    if (!r.ok) { setError(r.error); setOtp(['', '', '', '', '', '']); if ('expired' in r && r.expired) setExpiresAt(0); return; }
    setOtpToken(r.token);
    await finish(r.token);
  };

  return <PageShell><div className="auth-wrap"><aside className="auth-image"><img src={hero} alt="Luxury residence" /><div className="auth-caption">A more considered<br />way to move.</div></aside><main className="auth-main"><div className="auth-panel">
    <span className="eyebrow">ELITEOZ MEMBERSHIP</span>
    {!role ? <><h1 className="auth-hero-title">Welcome to Eliteoz</h1><p>Membership opens a private dashboard for you. Choose how you'd like to use Eliteoz — Buyer or Seller. You can switch later with our team's help.</p><div className="role-grid">
      <button className="role-card" onClick={() => setRole('buyer')}><UserRound size={27} /><strong>Buyer</strong><span>Explore verified high-value assets, compare and save the ones you like, and send your interest — our team will contact you.</span></button>
      <button className="role-card" onClick={() => setRole('seller')}><BriefcaseBusiness size={27} /><strong>Seller</strong><span>Present high-value assets to a considered audience, and manage your listings and documents from one dashboard.</span></button>
    </div></> : <>
      <h1 className={step === 0 ? 'auth-hero-title' : ''}>{step === 0 ? <>Welcome to Eliteoz</> : step === 1 ? 'Verify your mobile' : 'Activate your membership'}</h1>
      <p>{step === 0 ? 'Personal, address and business details are collected later in Verification.' : step === 1 ? `Enter the 6-digit code sent to ${masked || 'your mobile'}.` : 'One final step and your dashboard opens automatically.'}</p>
      <div className="steps">{steps.map((x, i) => <div className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} key={x}><span>{i < step ? '✓' : i + 1}</span>{x}</div>)}</div>

      {step === 0 && <form id="details-form" className="form-grid" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const d: Record<string, string> = {}; f.forEach((v, k) => { d[k] = String(v); }); if ((d['password'] ?? '').length < 8) { setError('Password must be at least 8 characters.'); return; } if (!/^[6-9]\d{9}$/.test((d['mobile'] ?? '').replace(/\D/g, '').slice(-10))) { setError('Please enter a valid 10-digit Indian mobile number.'); return; } setDetails(d as Details); setError(''); void requestOtp(d['mobile'] ?? '', d['email'] ?? '').then((ok) => { if (ok) setStep(1); }); }}>
        {fields.filter((x) => !x.seller || role === 'seller').map((x) => <div key={x.key} className={`field ${x.full || x.key === 'dob' ? 'full' : ''}`}><label htmlFor={x.key}>{x.label}{x.required && ' *'}</label>
          {x.key === 'gender' ? <select id={x.key} name={x.key} className="field-input" defaultValue={details[x.key] ?? ''}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
            : x.key === 'dob' ? <DobInput name="dob" defaultValue={details['dob']} />
            : <input id={x.key} name={x.key} className="field-input" type={x.type ?? 'text'} required={x.required} defaultValue={details[x.key] ?? ''} minLength={x.key === 'password' ? 8 : undefined} placeholder={x.label} />}
          {x.seller && <small className="muted">Set once. Later changes are handled by the Eliteoz team via a support ticket.</small>}</div>)}
      </form>}

      {step === 1 && <>{info && <Notice>{info}</Notice>}
        <OtpInput value={otp} onChange={setOtp} onComplete={(code) => { void afterOtp(code); }} />
        <p className="muted">{secsLeft > 0 ? `Code expires in ${String(Math.floor(secsLeft / 60)).padStart(2, '0')}:${String(secsLeft % 60).padStart(2, '0')}` : 'Code expired — please request a new OTP.'}</p>
        <div className="flex gap-2"><Button variant="link" disabled={busy || resendLeft > 0} onClick={() => { void requestOtp(details['mobile'] ?? '', details['email'] ?? ''); }}>{resendLeft > 0 ? `Resend OTP in ${resendLeft}s` : 'Resend OTP'}</Button><Button variant="link" onClick={() => { setStep(0); setInfo(''); setError(''); }}>Change number</Button></div></>}

      {step === 2 && gateway && <><div className="panel pay-panel"><div className="pay-head"><div><span className="eyebrow">ACTIVATION FEE</span><div className="payment-total">₹{fee.toLocaleString('en-IN')}</div></div><span className="status pending">{pay?.mode === 'live' ? 'RAZORPAY' : 'TEST MODE'}</span></div>
        <p className="muted">You'll pay securely via Razorpay (card, UPI or net banking). Your account activates only after Razorpay confirms the payment.</p>
        <label className="filter-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to the activation terms and <Link className="text-link" to="/payment-policy">payment policy</Link>.</label></div>
        {pay?.mode !== 'live' && <div className="preview-warning"><strong>Razorpay test mode.</strong> Use Razorpay test cards — no real money is charged.</div>}</>}

      {busy && step === 1 && <p className="muted">Please wait…</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      {dup && <Button onClick={() => navigate({ to: '/login' })}>{dup === 'pending' ? 'Login & Continue' : 'Login'} <ArrowRight /></Button>}
      <div className="form-actions">
        <Button variant="outline" disabled={busy} onClick={() => { setError(''); if (step === 0) setRole(null); else setStep(step - 1); }}><ArrowLeft /> Back</Button>
        {step === 0 && <Button type="submit" form="details-form" disabled={busy}>{busy ? 'Sending OTP…' : <>Send OTP <ArrowRight /></>}</Button>}
        {step === 1 && <Button disabled={busy || otp.join('').length !== 6 || secsLeft === 0} onClick={() => { void afterOtp(); }}>{busy ? 'Please wait…' : <>Verify & continue to payment <ArrowRight /></>}</Button>}
        {step === 2 && <Button disabled={busy} onClick={() => { void finish(); }}>{busy ? 'Processing…' : <>Pay ₹{fee.toLocaleString('en-IN')} <LockKeyhole /></>}</Button>}
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
  const recordAuth = useServerFn(recordAuthEvent);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setMsg('');
    const email = String(f.get('email') ?? ''); const password = String(f.get('password') ?? '');
    if (kind === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setBusy(false); setMsg('Incorrect email or password.'); return; }
      void recordAuth({ data: { event: 'login' } }).catch(() => null);
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
