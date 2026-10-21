// PLACEHOLDER catalog. Costs are the research estimates (retail less 20%, divided by units per box);
// weights, PV/BV and tags are guesses. All UNVERIFIED until the owner fills wayfinder/owner-catalog-sheet.csv
// and runs `npm run import:catalog`. Tags stay hidden from shoppers (tagsVerified=false) until the owner checks labels.
import { unitPriceCents } from './pricing.ts';
import type { ItemRow, ItemTags, StarterBag } from './types.ts';

export const SHELVES = [
  'Energy & Fitness',
  'Everyday Wellness',
  'Warm Drinks & Tea',
  'Pantry & Treats',
  'Home & Kitchen',
  'Personal Care',
  'Cozy extras',
] as const;

let sort = 0;
function mk(
  id: string,
  shelf: string,
  name: string,
  kind: 'amway' | 'other',
  costCents: number,
  retailCents: number | null,
  weightLb: number,
  boxSize: number,
  tags: ItemTags = {},
): ItemRow {
  return {
    id, shelf, name, kind, costCents, retailCents,
    pv: null, bv: null, weightLb, boxSize, tags, tagsVerified: false,
    individuallyWrapped: true, stock: null, soldOut: false, active: true,
    sort: ++sort,
    unitPriceCents: unitPriceCents(costCents, retailCents),
  };
}

export const SEED_ITEMS: ItemRow[] = [
  mk('xs-energy-can', 'Energy & Fitness', 'XS Energy 12 oz can', 'amway', 247, 308, 0.9, 12, { caffeineMg: 114, sugarFree: true }),
  mk('xs-pre-workout', 'Energy & Fitness', 'Pre-Workout Boost stick', 'amway', 220, 275, 0.1, 12, { caffeineMg: 115 }),
  mk('xs-post-workout', 'Energy & Fitness', 'Post-Workout Recovery stick', 'amway', 220, 275, 0.1, 12),
  mk('xs-protein-bar', 'Energy & Fitness', 'Protein bar', 'amway', 280, 350, 0.2, 12, { allergens: ['milk', 'may contain nuts'] }),
  mk('xs-protein-crisps', 'Energy & Fitness', 'Protein Crisps bag', 'amway', 260, 325, 0.2, 12, { allergens: ['milk'] }),
  mk('xs-whey-sachet', 'Energy & Fitness', 'Grass-Fed Whey sachet', 'amway', 408, 510, 0.1, 10, { allergens: ['milk'] }),
  mk('twist-tube', 'Everyday Wellness', 'Twist Tubes 2GO tube', 'amway', 96, 120, 0.1, 20),
  mk('xs-cocowater', 'Everyday Wellness', 'CocoWater packet', 'amway', 187, 233, 0.1, 12),
  mk('immunity-pack', 'Everyday Wellness', 'Immunity Pack packet', 'amway', 132, 165, 0.1, 20),
  mk('fiber-stick', 'Everyday Wellness', 'Fiber Powder stick', 'amway', 83, 103, 0.1, 30),
  mk('ginger-mint-tea', 'Warm Drinks & Tea', 'Ginger Mint tea bag', 'amway', 68, 85, 0.05, 20, { organic: true, caffeineMg: 0 }),
  mk('chamomile-tea', 'Warm Drinks & Tea', 'Chamomile tea bag', 'amway', 68, 85, 0.05, 20),
  mk('hot-cocoa', 'Warm Drinks & Tea', 'Instant hot cocoa packet', 'other', 45, null, 0.1, 1, { allergens: ['milk'] }),
  mk('apple-cider', 'Warm Drinks & Tea', 'Apple cider packet', 'other', 45, null, 0.1, 1),
  mk('honey-stick', 'Pantry & Treats', 'Honey stick', 'other', 20, null, 0.05, 1),
  mk('seasonal-treat', 'Pantry & Treats', 'Cranberry/pumpkin treat', 'other', 120, null, 0.2, 1, { allergens: ['may contain nuts'] }),
  mk('dish-drops', 'Home & Kitchen', 'Dish Drops dishwashing liquid, 1 L', 'amway', 1280, 1600, 2.3, 1),
  mk('loc-cleaner', 'Home & Kitchen', 'L.O.C. multi-purpose cleaner, 1 L', 'amway', 1000, 1250, 2.3, 1),
  mk('satinique-2in1', 'Personal Care', 'Satinique 2-in-1 shampoo & conditioner', 'amway', 1120, 1400, 1.2, 1),
  mk('glister-toothpaste', 'Personal Care', 'Glister toothpaste tube', 'amway', 580, 725, 0.6, 1),
  mk('hand-warmer', 'Cozy extras', 'Hand warmer', 'other', 55, null, 0.1, 1),
];

export const SEED_STARTERS: StarterBag[] = [
  { id: 'gym-bro', name: 'Gym Bro', blurb: 'Fuel for the lifters', sort: 1,
    items: { 'xs-energy-can': 2, 'xs-pre-workout': 1, 'xs-protein-bar': 1, 'xs-protein-crisps': 1 } },
  { id: 'busy-mom', name: 'Busy Mom', blurb: 'Quick wins between everything', sort: 2,
    items: { 'twist-tube': 2, 'xs-cocowater': 1, 'immunity-pack': 1, 'chamomile-tea': 1, 'hot-cocoa': 1 } },
  { id: 'golden-years', name: 'Golden Years', blurb: 'Gentle, low caffeine', sort: 3,
    items: { 'ginger-mint-tea': 2, 'fiber-stick': 1, 'honey-stick': 2, 'hand-warmer': 1, 'hot-cocoa': 1 } },
  { id: 'thanksgiving-table', name: 'Thanksgiving Table', blurb: 'Warm and festive', sort: 4,
    items: { 'apple-cider': 2, 'hot-cocoa': 1, 'seasonal-treat': 1, 'ginger-mint-tea': 1, 'xs-cocowater': 1 } },
];

/** PLACEHOLDER delivery allowlist around Johnston, IA. The owner must verify the near (about 25 mi) / far (to 1 hr) split. */
const NEAR_ZIPS = ['50131', '50322', '50325', '50266', '50265', '50263', '50111', '50021', '50023', '50309', '50310', '50311',
  '50312', '50313', '50314', '50315', '50316', '50317', '50320', '50321', '50327', '50035'];
const FAR_ZIPS = ['50010', '50014', '50036', '50201', '50208', '50125', '50228', '50138', '50139', '50054', '50052', '50022'];

export const SEED_ZIPS: { zip: string; zone: 'near' | 'far' }[] = [
  ...NEAR_ZIPS.map((zip) => ({ zip, zone: 'near' as const })),
  ...FAR_ZIPS.map((zip) => ({ zip, zone: 'far' as const })),
];
