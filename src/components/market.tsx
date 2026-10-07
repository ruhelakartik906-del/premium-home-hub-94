import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { flagOf } from '@/lib/eliteoz-data';

export type Country = { code: string; name: string; currency: string; inr_rate: number | null; active: boolean };

export function useCountries(all = false) {
  return useQuery({
    queryKey: ['countries', all],
    queryFn: async () => {
      let q = supabase.from('countries').select('code,name,currency,inr_rate,active').order('name');
      if (!all) q = q.eq('active', true);
      const { data } = await q;
      return (data ?? []) as Country[];
    },
    staleTime: 5 * 60_000,
  });
}

/** INDIA / INTERNATIONAL label; international shows flag + country. */
export function MarketBadge({ market, country, code }: { market?: string | undefined; country?: string | undefined; code?: string | undefined }) {
  const intl = market === 'international';
  return (
    <span className={`market-badge ${intl ? 'intl' : ''}`}>
      {intl ? <>{flagOf(code ?? '')} GLOBAL · {country}</> : 'INDIA'}
    </span>
  );
}

export function MarketTabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="market-tabs" role="tablist">
      {[['', 'All'], ['india', 'India'], ['international', 'Global']].map(([v, l]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? 'active' : ''} onClick={() => onChange(v!)}>{l}</button>
      ))}
    </div>
  );
}
