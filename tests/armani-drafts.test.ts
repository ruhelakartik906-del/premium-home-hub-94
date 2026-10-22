import { describe, expect, test } from 'bun:test';
import { armaniDrafts, armaniReport, filterArmaniDrafts } from '../src/lib/armani-drafts';

const expected = [
  ['Armani A-303', 3, 'Type G', 5107, 41000000], ['Armani A-501', 3, 'Type F', 4897, 39500000],
  ['Armani A-502', 3, 'Type E', 4880, 39500000], ['Armani A-503', 3, 'Type D', 4677, 38000000],
  ['Armani A-601', 3, 'Type F', 4898, 39500000], ['Armani A-603', 3, 'Type D', 4676, 38000000],
  ['Armani A-701', 4, 'Type A', 6331, 51000000], ['Armani A-703', 4, 'Type B', 6396, 51500000],
  ['Armani B-201', 3, 'Type H', 5217, 42000000], ['Armani B-202', 2, 'Type A', 2630, 23000000],
  ['Armani B-301', 3, 'Type J', 5724, 46000000], ['Armani B-302', 2, 'Type A', 2630, 23000000],
  ['Armani B-401', 4, 'Type D', 7028, 56500000], ['Armani B-403', 2, 'Type D', 3026, 25000000],
  ['Armani B-502', 2, 'Type A', 2623, 23000000], ['Armani B-602', 5, 'Type B', 8438, 67500000],
  ['Armani C-302', 3, 'Type I', 5427, 43500000], ['Armani C-401', 2, 'Type E', 3141, 27000000],
  ['Armani C-501', 2, 'Type E', 3141, 27000000], ['Armani C-901', 5, 'Presidential Suite 1', 31680, 348500000],
] as const;

describe('Supplied Armani availability report', () => {
  test('contains exactly 20 unique draft units', () => {
    expect(armaniDrafts).toHaveLength(20);
    expect(new Set(armaniDrafts.map((draft) => draft.unit)).size).toBe(20);
    expect(armaniDrafts.every((draft) => draft.status === 'draft')).toBe(true);
  });
  for (const [unit, bedrooms, layout, areaSqft, priceAed] of expected) {
    test(`${unit} preserves its exact reported specifications and AED price`, () => {
      expect(armaniDrafts.find((draft) => draft.unit === unit)).toEqual({ unit, bedrooms, layout, areaSqft, priceAed, status: 'draft' });
    });
  }
  test('completion remains anticipated on 31 December 2027', () => {
    expect(armaniReport.completion).toBe('2027-12-31');
  });
  test('unit and bedroom filters combine correctly', () => {
    expect(filterArmaniDrafts(armaniDrafts, ' b- ', '2').map((draft) => draft.unit)).toEqual(['Armani B-202', 'Armani B-302', 'Armani B-403', 'Armani B-502']);
    expect(filterArmaniDrafts(armaniDrafts, 'C-901', '2')).toHaveLength(0);
  });
});