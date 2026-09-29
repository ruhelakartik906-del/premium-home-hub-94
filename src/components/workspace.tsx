import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, Bell, BookOpen, Building2, CreditCard, FileCheck, Heart, LayoutDashboard, LifeBuoy, LockKeyhole, Wallet, LogOut, Menu, MessageSquare, Plug, Plus, Search, Send, SlidersHorizontal, Users, X , Bookmark, Settings, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '@/components/eliteoz';
import { supabase } from '@/integrations/supabase/client';
import { daysLeft, effectiveStatus, useMe } from '@/hooks/use-auth';
import { MemberBody } from '@/components/workspace-member';
import { AdminBody } from '@/components/workspace-admin';

import { ActivationBanner } from '@/components/activation-banner';
export type Role = 'buyer' | 'seller' | 'admin';
type NavItem = { label: string; slug: string; icon: typeof Heart; group?: string };
const buyer: NavItem[] = [{ label: 'Dashboard', slug: '', icon: LayoutDashboard }, { label: 'Explore Properties', slug: 'explore', icon: Search }, { label: 'Compare', slug: 'compare', icon: SlidersHorizontal }, { label: 'My Interests', slug: 'interests', icon: Heart }, { label: 'Saved', slug: 'saved', icon: Bookmark }, { label: 'Notifications', slug: 'notifications', icon: Bell, group: 'ACCOUNT' }, { label: 'Verification', slug: 'verification', icon: FileCheck }, { label: 'Payments', slug: 'payments', icon: CreditCard }, { label: 'Profile', slug: 'profile', icon: Users }, { label: 'Security', slug: 'security', icon: LockKeyhole }, { label: 'Support Tickets', slug: 'support', icon: LifeBuoy }];
const seller: NavItem[] = [{ label: 'Dashboard', slug: '', icon: LayoutDashboard }, { label: 'My Properties', slug: 'properties', icon: Building2 }, { label: 'Add Property', slug: 'add-property', icon: Plus }, { label: 'Buyer Interests', slug: 'interests', icon: MessageSquare }, { label: 'Notifications', slug: 'notifications', icon: Bell, group: 'ACCOUNT' }, { label: 'Verification', slug: 'verification', icon: FileCheck }, { label: 'Payments', slug: 'payments', icon: CreditCard }, { label: 'Profile', slug: 'profile', icon: Users }, { label: 'Security', slug: 'security', icon: LockKeyhole }, { label: 'Support Tickets', slug: 'support', icon: LifeBuoy }];
const admin: NavItem[] = [{ label: 'Dashboard', slug: '', icon: LayoutDashboard }, { label: 'All Users', slug: 'users', icon: Users, group: 'PEOPLE' }, { label: 'KYC Verification', slug: 'kyc', icon: FileCheck }, { label: 'Properties', slug: 'properties', icon: Building2, group: 'LISTINGS' }, { label: 'Categories', slug: 'categories', icon: BookOpen }, { label: 'Buyer Interests', slug: 'leads', icon: Heart }, { label: 'Transactions', slug: 'payments', icon: CreditCard, group: 'OPERATIONS' }, { label: 'Send Notification', slug: 'notifications', icon: Send }, { label: 'Support Tickets', slug: 'tickets', icon: LifeBuoy }, { label: 'Payment Gateway', slug: 'gateway', icon: Wallet, group: 'SETTINGS' }, { label: 'Integrations', slug: 'integrations', icon: Plug }, { label: 'Platform Settings', slug: 'settings', icon: Settings }, { label: 'Activity Log', slug: 'audit', icon: History }];
export const menu = { buyer, seller, admin };
export const workspaceSections: Record<Role, string[]> = { buyer: buyer.map((x) => x.slug).filter(Boolean), seller: seller.map((x) => x.slug).filter(Boolean), admin: admin.map((x) => x.slug).filter(Boolean) };

const STATUS_LABELS: Record<string, string> = { submitted: 'Pending', changes_required: 'Resubmission required', not_submitted: 'Not submitted' };
export function Status({ value }: { value: string }) { return <span className={`status ${value.toLowerCase().replaceAll(' ', '-').replaceAll('_', '-')}`}>{STATUS_LABELS[value] ?? value.replaceAll('_', ' ')}</span>; }
export function Table({ headers, rows, empty = 'Nothing here yet.' }: { headers: string[]; rows: ReactNode[][]; empty?: string }) { if (!rows.length) return <div className="empty-state"><p>{empty}</p></div>; return <div className="data-table-wrap"><table className="data-table"><thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>; }
export function Stat({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: string; icon?: typeof Heart }) { return <div className="stat-card">{Icon && <span className="stat-icon"><Icon size={17} /></span>}<span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>; }
export function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) { return <section className="panel">{(title || action) && <div className="panel-head">{title && <h2>{title}</h2>}{action}</div>}{children}</section>; }
export function Tabs({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) { return <div className="tabs" role="tablist">{options.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'active' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>; }
export const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function SectionLink({ role, slug, children, className, onClick }: { role: Role; slug: string; children: ReactNode; className?: string; onClick?: () => void }) {
  if (!slug) return role === 'buyer' ? <Link to="/buyer" className={className} onClick={onClick}>{children}</Link> : role === 'seller' ? <Link to="/seller" className={className} onClick={onClick}>{children}</Link> : <Link to="/admin" className={className} onClick={onClick}>{children}</Link>;
  return role === 'buyer' ? <Link to="/buyer/$section" params={{ section: slug }} className={className} onClick={onClick}>{children}</Link> : role === 'seller' ? <Link to="/seller/$section" params={{ section: slug }} className={className} onClick={onClick}>{children}</Link> : <Link to="/admin/$section" params={{ section: slug }} className={className} onClick={onClick}>{children}</Link>;
}

function useUnread(userId?: string) {
  return useQuery({ queryKey: ['unread', userId], enabled: !!userId, queryFn: async () => { const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId!).eq('read', false); return count ?? 0; } });
}

export function Workspace({ role, section = '' }: { role: Role; section?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { data: me, isLoading } = useMe();
  const unread = useUnread(me?.user.id);
  if (isLoading) return <div className="workspace-loading"><Brand /><p>Loading your workspace…</p></div>;
  if (!me) return <div className="workspace-loading"><p>Please log in.</p><Button asChild><Link to="/login">Log in</Link></Button></div>;
  if (!me.roles.includes(role)) {
    const own: Role = me.roles.includes('admin') ? 'admin' : me.roles.includes('seller') ? 'seller' : 'buyer';
    return <div className="workspace-loading"><LockKeyhole /><h2>This workspace is not available for your account.</h2><Button asChild><SectionLink role={own} slug="">Go to my dashboard</SectionLink></Button></div>;
  }
  const item = menu[role].find((x) => x.slug === section);
  const label = item?.label ?? 'Dashboard';
  const title = role === 'admin' ? 'Master Admin' : role === 'buyer' ? 'Buyer Portal' : 'Seller Portal';
  const p = me.profile;
  const name = p?.full_name || me.user.email || 'Member';
  const initials = name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const status = p && role !== 'admin' ? effectiveStatus(p) : 'active';
  const needsKyc = p && role !== 'admin' && !['submitted', 'approved'].includes(p.verification_status);
  const locked = status === 'pending_payment' ? !['payments', 'profile', 'notifications', 'security', 'support'].includes(section) : (status === 'suspended' || status === 'blocked') && !['verification', 'payments', 'profile', 'notifications', 'security', 'support'].includes(section);
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: '/login' }); };
  const hrefFor = (slug: string) => (slug ? `/${role}/${slug}` : `/${role}`);

  return <div className="workspace">
    <aside className={`workspace-sidebar ${open ? 'open' : ''}`}>
      <div><Brand light /><div className="workspace-role">{title.toUpperCase()}</div></div>
      <nav className="sidebar-nav">{menu[role].map((x) => { const Icon = x.icon; return <div key={x.slug}>{x.group && <div className="sidebar-group">{x.group}</div>}<SectionLink role={role} slug={x.slug} onClick={() => setOpen(false)} className={path === hrefFor(x.slug) ? 'active' : ''}><Icon size={15} />{x.label}{x.slug === 'notifications' && role !== 'admin' && (unread.data ?? 0) > 0 && <em className="nav-badge">{unread.data}</em>}</SectionLink></div>; })}
        <button className="sidebar-signout" onClick={signOut}><LogOut size={15} />Sign out</button></nav>
      <div className="sidebar-card"><span>{role === 'admin' ? 'Signed in as' : 'Membership'}</span><strong>{role === 'admin' ? 'Master Admin' : status === 'blocked' ? 'Blocked' : status === 'pending_payment' ? 'Payment pending' : status === 'suspended' ? 'Suspended' : p?.verification_status === 'approved' ? 'Verified member' : 'Active member'}</strong></div>
    </aside>
    {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
    <div className="workspace-main">
      <header className="workspace-header"><div className="flex min-w-0 items-center gap-2"><Button variant="ghost" size="icon" className="workspace-mobile-bar shrink-0" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</Button><span className="crumb">{title} &nbsp;/&nbsp; {label}</span></div>
        <div className="right">{role !== 'admin' && <SectionLink role={role} slug="notifications" className="bell"><Bell size={17} />{(unread.data ?? 0) > 0 && <i>{unread.data}</i>}</SectionLink>}<div className="avatar">{initials}</div><span className="hidden text-xs sm:block">{name}</span></div></header>
      <main className="workspace-content">
        {role !== 'admin' && status === 'blocked' && <div className="alert-band danger"><AlertTriangle size={18} /><div><strong>Account blocked.</strong> Your access has been restricted by Eliteoz. Please raise a support ticket.</div></div>}
        {role !== 'admin' && status === 'pending_payment' && <ActivationBanner />}
        {role !== 'admin' && status === 'suspended' && <div className="alert-band danger"><AlertTriangle size={18} /><div><strong>Account suspended.</strong> Verification was not completed within 7 days. Submit your verification to request reactivation.</div><Button size="sm" asChild><SectionLink role={role} slug="verification">Complete verification</SectionLink></Button></div>}
        {role !== 'admin' && status === 'active' && needsKyc && p && <div className="alert-band"><Activity size={18} /><div><strong>{daysLeft(p.verification_due_at)} day{daysLeft(p.verification_due_at) === 1 ? '' : 's'} left to verify.</strong> Complete your verification within 7 days of activation, otherwise your account will be suspended.</div><Button size="sm" variant="outline" asChild><SectionLink role={role} slug="verification">Verify now</SectionLink></Button></div>}
        <div className="workspace-top"><div><span className="eyebrow">{role === 'admin' ? 'PLATFORM OVERVIEW' : role === 'buyer' ? 'YOUR PRIVATE SPACE' : 'YOUR PROPERTY SPACE'}</span><h1>{section ? label : `Welcome back, ${name.split(' ')[0]}.`}</h1></div>
          {role === 'seller' && section !== 'add-property' && !locked && <Button asChild><SectionLink role="seller" slug="add-property"><Plus /> Add property</SectionLink></Button>}
          {role === 'buyer' && !section && <Button asChild variant="outline"><Link to="/properties">Browse collection</Link></Button>}</div>
        {locked ? <Panel title="Access paused"><p className="muted">Your dashboard features are paused until verification is submitted. Once submitted, access is restored automatically.</p><Button asChild><SectionLink role={role} slug="verification">Go to verification</SectionLink></Button></Panel>
          : role === 'admin' ? <AdminBody section={section} me={me} /> : <MemberBody role={role} section={section} me={me} />}
      </main>
    </div>
  </div>;
}
