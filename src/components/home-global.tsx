import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import indiaImg from '@/assets/property-estate.jpg';
import intlImg from '@/assets/property-penthouse.jpg';

export type Market = '' | 'india' | 'international';

export function goExplore(market: Market, set: (m: Market) => void) {
  set(market);
  document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Subtle gold globe with India marker + worldwide meridians. */
export function GlobeMark() {
  return (
    <svg className="hg-globe" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="88" />
      <ellipse cx="100" cy="100" rx="40" ry="88" />
      <ellipse cx="100" cy="100" rx="70" ry="88" />
      <path d="M12 100h176M24 56h152M24 144h152" />
      <circle className="hg-pin" cx="128" cy="92" r="4" />
      <circle className="hg-ring" cx="128" cy="92" r="10" />
    </svg>
  );
}

export function MarketSplit({ onExplore }: { onExplore: (m: Market) => void }) {
  const sides: [Market, string, string, string, string][] = [
    ['india', 'India', 'IN', "Exceptional properties across India's most prestigious destinations.", indiaImg],
    ['international', 'International', 'GLOBAL', 'Private access to exceptional assets across selected global markets.', intlImg],
  ];
  return (
    <section className="hg-split" aria-label="India and International">
      {sides.map(([m, t, code, d, img]) => (
        <article key={m} className="hg-side" data-reveal>
          <img src={img} alt="" loading="lazy" width={1200} height={800} />
          <div className="hg-side-inner">
            <span className="nx-eyebrow">{t} / {code}</span>
            <h2>{t}</h2>
            <p>{d}</p>
            <button type="button" className="nx-btn-ghost" onClick={() => onExplore(m)}>Explore {t}</button>
          </div>
        </article>
      ))}
    </section>
  );
}

const PRESENCE: [string, number, number][] = [
  ['India', 69, 47], ['UAE', 62, 43], ['United Kingdom', 47, 26], ['Singapore', 77, 58], ['USA', 22, 34], ['Europe', 51, 29], ['Other Global Markets', 85, 72],
];

export function BeyondBorders() {
  return (
    <section className="nx-dark nx-sec hg-borders">
      <div className="nx-wrap">
        <span className="nx-eyebrow">Global Presence</span>
        <h2>Beyond Borders.</h2>
        <p className="nx-muted hg-sub">From India's most distinguished addresses to exceptional properties across the world.</p>
        <div className="hg-map" data-reveal>
          <svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} x1="0" x2="100" y1={8 + i * 8} y2={8 + i * 8} />)}
            {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} y1="0" y2="80" x1={4 + i * 8} x2={4 + i * 8} />)}
            {PRESENCE.slice(1).map(([n, x, y]) => <line key={n} className="hg-arc" x1="69" y1="47" x2={x} y2={y} />)}
          </svg>
          {PRESENCE.map(([n, x, y]) => (
            <span key={n} className={`hg-dot ${n === 'India' ? 'home' : ''}`} style={{ left: `${x}%`, top: `${(y / 80) * 100}%` }}><i /><b>{n}</b></span>
          ))}
        </div>
        <ul className="hg-locs">{PRESENCE.map(([n]) => <li key={n}>{n}</li>)}</ul>
      </div>
    </section>
  );
}

type Prop = { id: string; title: string; market: string; country: string; country_code: string; city: string | null; property_type: string; price: number; currency: string; cover_url: string | null; image: string };

function money(v: number, cur: string) {
  try { return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v); } catch { return `${cur} ${v.toLocaleString()}`; }
}

export function FeaturedDiscovery({ market, setMarket }: { market: Market; setMarket: (m: Market) => void }) {
  const [country, setCountry] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['home-published'],
    queryFn: async () => {
      const { data } = await supabase.from('properties')
        .select('id,title,market,country,country_code,city,property_type,price,currency,cover_url,image')
        .eq('status', 'published').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(24);
      return (data ?? []) as Prop[];
    },
    staleTime: 60_000,
  });
  const countries = useMemo(() => [...new Set(data.filter((p) => p.market === 'international').map((p) => p.country))].sort(), [data]);
  const list = data.filter((p) => (!market || p.market === market) && (market !== 'international' || !country || p.country === country)).slice(0, 6);

  return (
    <section className="nx-ivory nx-sec hg-explore" id="explore">
      <div className="nx-wrap">
        <span className="nx-eyebrow">Discovery</span>
        <h2>Explore Exceptional Properties</h2>
        <div className="hg-tabs" role="tablist">
          {([['', 'All'], ['india', 'India'], ['international', 'International']] as [Market, string][]).map(([v, l]) => (
            <button key={l} type="button" role="tab" aria-selected={market === v} className={market === v ? 'on' : ''} onClick={() => { setMarket(v); setCountry(''); }}>{l}</button>
          ))}
          {market === 'international' && countries.length > 0 && (
            <select aria-label="Country" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All countries</option>
              {countries.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
        </div>
        {isLoading ? <p className="hg-empty">Loading…</p> : list.length === 0 ? (
          <div className="hg-empty">
            <p>Verified mandates in this selection are shared privately with activated members.</p>
            <Link to="/register" className="nx-btn">Become a Member</Link>
          </div>
        ) : (
          <div className="hg-grid">
            {list.map((p) => {
              const src = p.cover_url || (/^(https?:|\/)/.test(p.image) ? p.image : '');
              const intl = p.market === 'international';
              return (
                <article key={p.id} className="hg-card" data-reveal>
                  <div className="hg-img">{src ? <img src={src} alt={p.title} loading="lazy" /> : <span />}<em>{intl ? 'International' : 'India'}</em></div>
                  <div className="hg-body">
                    <span className="hg-loc">{[p.city, p.country].filter(Boolean).join(', ')} · {p.property_type}</span>
                    <h3>{p.title}</h3>
                    <div className="hg-foot"><strong>{money(Number(p.price), p.currency)}</strong><Link to="/properties/$id" params={{ id: p.id }} className="nx-btn-ghost nx-ghost-dark">View Property</Link></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
