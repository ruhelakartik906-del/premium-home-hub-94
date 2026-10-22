export const armaniReport = {
  project: 'Armani Beach Residences at Palm Jumeirah',
  reportDate: '5 December 2025',
  completion: '2027-12-31',
  location: 'Palm Jumeirah, Dubai, United Arab Emirates',
} as const;

export type ArmaniDraft = {
  unit: string;
  bedrooms: number;
  layout: string;
  areaSqft: number;
  priceAed: number;
  status: 'draft';
};

// Exact unit-level records transcribed from the supplied two-page availability report.
export const armaniDrafts: ArmaniDraft[] = [
  { unit: 'Armani A-303', bedrooms: 3, layout: 'Type G', areaSqft: 5107, priceAed: 41000000, status: 'draft' },
  { unit: 'Armani A-501', bedrooms: 3, layout: 'Type F', areaSqft: 4897, priceAed: 39500000, status: 'draft' },
  { unit: 'Armani A-502', bedrooms: 3, layout: 'Type E', areaSqft: 4880, priceAed: 39500000, status: 'draft' },
  { unit: 'Armani A-503', bedrooms: 3, layout: 'Type D', areaSqft: 4677, priceAed: 38000000, status: 'draft' },
  { unit: 'Armani A-601', bedrooms: 3, layout: 'Type F', areaSqft: 4898, priceAed: 39500000, status: 'draft' },
  { unit: 'Armani A-603', bedrooms: 3, layout: 'Type D', areaSqft: 4676, priceAed: 38000000, status: 'draft' },
  { unit: 'Armani A-701', bedrooms: 4, layout: 'Type A', areaSqft: 6331, priceAed: 51000000, status: 'draft' },
  { unit: 'Armani A-703', bedrooms: 4, layout: 'Type B', areaSqft: 6396, priceAed: 51500000, status: 'draft' },
  { unit: 'Armani B-201', bedrooms: 3, layout: 'Type H', areaSqft: 5217, priceAed: 42000000, status: 'draft' },
  { unit: 'Armani B-202', bedrooms: 2, layout: 'Type A', areaSqft: 2630, priceAed: 23000000, status: 'draft' },
  { unit: 'Armani B-301', bedrooms: 3, layout: 'Type J', areaSqft: 5724, priceAed: 46000000, status: 'draft' },
  { unit: 'Armani B-302', bedrooms: 2, layout: 'Type A', areaSqft: 2630, priceAed: 23000000, status: 'draft' },
  { unit: 'Armani B-401', bedrooms: 4, layout: 'Type D', areaSqft: 7028, priceAed: 56500000, status: 'draft' },
  { unit: 'Armani B-403', bedrooms: 2, layout: 'Type D', areaSqft: 3026, priceAed: 25000000, status: 'draft' },
  { unit: 'Armani B-502', bedrooms: 2, layout: 'Type A', areaSqft: 2623, priceAed: 23000000, status: 'draft' },
  { unit: 'Armani B-602', bedrooms: 5, layout: 'Type B', areaSqft: 8438, priceAed: 67500000, status: 'draft' },
  { unit: 'Armani C-302', bedrooms: 3, layout: 'Type I', areaSqft: 5427, priceAed: 43500000, status: 'draft' },
  { unit: 'Armani C-401', bedrooms: 2, layout: 'Type E', areaSqft: 3141, priceAed: 27000000, status: 'draft' },
  { unit: 'Armani C-501', bedrooms: 2, layout: 'Type E', areaSqft: 3141, priceAed: 27000000, status: 'draft' },
  { unit: 'Armani C-901', bedrooms: 5, layout: 'Presidential Suite 1', areaSqft: 31680, priceAed: 348500000, status: 'draft' },
];

export function filterArmaniDrafts(drafts: ArmaniDraft[], query: string, bedrooms: string) {
  return drafts.filter((draft) => draft.unit.toLowerCase().includes(query.trim().toLowerCase()) && (!bedrooms || draft.bedrooms === Number(bedrooms)));
}