import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import { toListing, type PropertyRow } from '@/lib/eliteoz-data';

function publicClient() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization');
        h.set('apikey', key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
import { PROPERTY_COLS } from '@/lib/eliteoz-data';
const cols = PROPERTY_COLS;

export const listPublicProperties = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = publicClient();
  const [{ data: props }, { data: cats }] = await Promise.all([
    sb.from('properties').select(cols).eq('status', 'published').order('featured', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('categories').select('id,name').eq('active', true).order('name'),
  ]);
  return { listings: ((props ?? []) as unknown as PropertyRow[]).map(toListing), categories: (cats ?? []).map((c) => c.name) };
});

export const getPublicProperty = createServerFn({ method: 'GET' })
  .inputValidator((d) => z.object({ ref: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb.from('properties').select(cols).eq('status', 'published').eq('ref', data.ref).maybeSingle();
    const { data: others } = await sb.from('properties').select(cols).eq('status', 'published').neq('ref', data.ref).limit(3);
    return { listing: row ? toListing(row as unknown as PropertyRow) : null, related: ((others ?? []) as unknown as PropertyRow[]).map(toListing) };
  });
