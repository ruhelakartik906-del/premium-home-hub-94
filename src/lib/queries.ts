import { queryOptions } from '@tanstack/react-query';
import { getPublicProperty, listPublicProperties } from '@/lib/public.functions';

export const publicPropertiesQuery = queryOptions({ queryKey: ['public-properties'], queryFn: () => listPublicProperties() });
export const publicPropertyQuery = (ref: string) => queryOptions({ queryKey: ['public-property', ref], queryFn: () => getPublicProperty({ data: { ref } }) });

const KEY = 'eliteoz-compare';
export function readCompare(): string[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } }
export function writeCompare(ids: string[]) { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 4))); }
export function toggleCompare(id: string) { const cur = readCompare(); const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-4); writeCompare(next); return next; }
