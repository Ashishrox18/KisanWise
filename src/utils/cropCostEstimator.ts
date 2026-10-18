/**
 * cropCostEstimator.ts
 *
 * Pure client-side computation of per-acre input cost breakdown for common
 * Indian crops, using representative average 2024–25 market rates. Returns an
 * itemised split (seeds, fertilizer, irrigation, pesticides, labour, misc) plus
 * optimisation tips keyed to the current season, government subsidy windows, and
 * market/weather signals. No backend call required.
 *
 * All costs are in ₹ per acre. Multiply by landSize for total.
 */

export interface CostLineItem {
  label: string;
  low: number;   // ₹/acre optimistic (with subsidies / bulk purchase)
  base: number;  // ₹/acre typical
  pct: number;   // % of total base cost (filled by buildBreakdown)
  icon: string;
}

export interface CostBreakdown {
  cropName: string;
  acreage: number;
  totalLow: number;
  totalBase: number;
  totalHigh: number;
  items: CostLineItem[];
  optimisationTips: string[];
  subsidyAlerts: string[];
}

// ── Per-acre base cost tables (₹) ────────────────────────────────────────────
// Sources: ICAR advisory ranges, Kisan Call Centre published estimates, 2024-25.
const BASE: Record<string, {
  seeds: [number, number];     // [low, base]
  fertilizer: [number, number];
  irrigation: [number, number];
  pesticides: [number, number];
  labour: [number, number];
  misc: [number, number];      // land prep, packaging, transport
}> = {
  'Wheat':        { seeds:[800,1200],  fertilizer:[2500,3500], irrigation:[1500,2500], pesticides:[800,1200],  labour:[3500,5000], misc:[1200,2000] },
  'Rice':         { seeds:[900,1400],  fertilizer:[3000,4200], irrigation:[2500,3800], pesticides:[1200,1800], labour:[5000,7000], misc:[1500,2500] },
  'Maize':        { seeds:[1200,1800], fertilizer:[2800,3800], irrigation:[1200,2000], pesticides:[800,1200],  labour:[3000,4500], misc:[1000,1800] },
  'Cotton':       { seeds:[2500,3500], fertilizer:[3500,5000], irrigation:[2000,3500], pesticides:[3000,4500], labour:[6000,9000], misc:[2000,3500] },
  'Sugarcane':    { seeds:[6000,9000], fertilizer:[4000,6000], irrigation:[3500,5000], pesticides:[2000,3000], labour:[8000,12000],misc:[3000,5000] },
  'Potato':       { seeds:[8000,12000],fertilizer:[4000,6000], irrigation:[2500,4000], pesticides:[2500,4000], labour:[7000,10000],misc:[3000,5000] },
  'Onion':        { seeds:[1500,2500], fertilizer:[3000,4500], irrigation:[2500,4000], pesticides:[2000,3500], labour:[6000,9000], misc:[2000,3500] },
  'Tomato':       { seeds:[1800,2800], fertilizer:[4000,6000], irrigation:[3000,5000], pesticides:[3000,5000], labour:[8000,12000],misc:[3000,5000] },
  'Soybean':      { seeds:[1200,1800], fertilizer:[2000,3000], irrigation:[800,1500],  pesticides:[1000,1800], labour:[3000,4500], misc:[1000,1800] },
  'Groundnut':    { seeds:[3000,4500], fertilizer:[2000,3200], irrigation:[1200,2000], pesticides:[1200,2000], labour:[4000,6000], misc:[1500,2500] },
  'Mustard':      { seeds:[600,1000],  fertilizer:[2200,3200], irrigation:[800,1500],  pesticides:[600,1000],  labour:[2500,4000], misc:[800,1500]  },
  'Sunflower':    { seeds:[1000,1600], fertilizer:[2200,3200], irrigation:[1000,2000], pesticides:[800,1500],  labour:[3000,4500], misc:[1000,1800] },
  'Chickpea':     { seeds:[1500,2200], fertilizer:[1800,2800], irrigation:[600,1200],  pesticides:[600,1000],  labour:[2500,4000], misc:[800,1500]  },
  'Lentils':      { seeds:[1200,1800], fertilizer:[1600,2500], irrigation:[500,1000],  pesticides:[600,1000],  labour:[2500,4000], misc:[800,1500]  },
  'Bajra':        { seeds:[500,900],   fertilizer:[1800,2800], irrigation:[600,1200],  pesticides:[500,900],   labour:[2000,3500], misc:[700,1300]  },
  'Jowar':        { seeds:[600,1000],  fertilizer:[2000,3000], irrigation:[700,1300],  pesticides:[600,1000],  labour:[2200,3500], misc:[800,1400]  },
  'Barley':       { seeds:[700,1200],  fertilizer:[1800,2800], irrigation:[700,1300],  pesticides:[500,900],   labour:[2500,3800], misc:[800,1400]  },
  'Green Gram':   { seeds:[1000,1600], fertilizer:[1500,2500], irrigation:[500,900],   pesticides:[600,1000],  labour:[2500,4000], misc:[700,1300]  },
  'Black Gram':   { seeds:[1000,1600], fertilizer:[1500,2500], irrigation:[500,900],   pesticides:[600,1000],  labour:[2500,4000], misc:[700,1300]  },
  'Millet':       { seeds:[500,900],   fertilizer:[1600,2500], irrigation:[500,900],   pesticides:[500,900],   labour:[2000,3500], misc:[700,1200]  },
};

const FALLBACK = {
  seeds:      [1200, 1800] as [number, number],
  fertilizer: [2500, 3500] as [number, number],
  irrigation: [1500, 2500] as [number, number],
  pesticides: [1000, 1800] as [number, number],
  labour:     [4000, 6000] as [number, number],
  misc:       [1500, 2500] as [number, number],
};

function lookup(name: string) {
  const key = Object.keys(BASE).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? BASE[key] : FALLBACK;
}

// ── Subsidy calendar (month-indexed, 0=Jan) ────────────────────────────────
const MONTHLY_SUBSIDY_ALERTS: Record<number, string[]> = {
  0:  ['PM-KISAN instalment (Feb window): register/verify KYC now.',
       'Rabi fertilizer subsidy active — buy urea at ₹242/bag.'],
  1:  ['PM-KISAN Feb instalment being disbursed — check pmkisan.gov.in.',
       'PMFBY Rabi crop insurance last dates in most states.'],
  2:  ['Kisan Credit Card (KCC) renewal cycle: negotiate lower interest.',
       'NHM vegetable seed subsidy active for spring planting.'],
  3:  ['Post-harvest warehouse receipt loan: pledge produce, free capital.',
       'FPO bulk input procurement drive — reduces seed cost 15-25%.'],
  4:  ['PM-KISAN April instalment window.',
       'RKVY mechanisation subsidy open: apply for subsidised inter-tillers.'],
  5:  ['Kharif season: certified paddy/maize seeds at 50% subsidy in many states.',
       'PMFBY Kharif enrolment open — insure by month-end.'],
  6:  ['Urea at MRP ₹242/bag (neem-coated, subsidised) available at PACs.',
       'Micro-irrigation drip/sprinkler subsidy: up to 55% for small farmers.'],
  7:  ['Monsoon advisory: check PMFBY mid-season loss claims online.',
       'PM-KISAN August instalment — e-KYC required if not done.'],
  8:  ['Kharif harvest approaching: pre-register at e-NAM mandi portal.',
       'FCI/NAFED procurement for Soybean/Groundnut MSP — register early.'],
  9:  ['Rabi season begins: government certified wheat/mustard seeds at discount.',
       'PM-KISAN Oct instalment disbursal.'],
  10: ['PMFBY Rabi enrolment — mandatory for loanee farmers.',
      'Cold storage subsidy (NHM/MIDH): apply before Dec for potato/onion growers.'],
  11: ['Rabi fertilizer stocking: buy DAP/MOP in bulk before Jan price review.',
      'PM-KISAN Dec instalment window — verify Aadhaar link.'],
};

// ── Optimisation tips per water availability ──────────────────────────────
function waterTips(water: string): string[] {
  const w = water.toLowerCase();
  if (w === 'scarce' || w === 'limited')
    return ['Drip irrigation can cut water + fertilizer cost by 30-40% (NHM subsidy up to 55%).',
            'Choose drought-tolerant varieties: reduce irrigation cost per acre by ₹800-1,200.'];
  if (w === 'abundant')
    return ['Avoid over-irrigation — excess water leaches nitrogen and raises input cost.',
            'Laser land levelling (subsidy available) can cut irrigation cost by 20%.'];
  return ['Schedule irrigations by crop growth stage; skip unnecessary pre-sowing irrigation.'];
}

// ── Build the full breakdown ──────────────────────────────────────────────
export function buildBreakdown(
  cropName: string,
  landSize: number,
  season: string,
  waterAvailability: string,
  budget: number,
): CostBreakdown {
  const t = lookup(cropName);
  const ac = Math.max(0.5, landSize);
  const m = new Date().getMonth();

  const rawItems: Array<[string, string, [number, number]]> = [
    ['Seeds / Planting material', '🌱', t.seeds],
    ['Fertilizer (N-P-K + micro)', '🧪', t.fertilizer],
    ['Irrigation & water charges', '💧', t.irrigation],
    ['Pesticide / bio-protection', '🛡️', t.pesticides],
    ['Labour (sowing → harvest)', '👐', t.labour],
    ['Misc (land prep, packaging)', '📦', t.misc],
  ];

  const total = rawItems.reduce((s, [,,[,b]]) => s + b, 0) * ac;
  const totalLow = rawItems.reduce((s, [,,[l]]) => s + l, 0) * ac;
  const totalHigh = Math.round(total * 1.15); // 15% overrun buffer

  const items: CostLineItem[] = rawItems.map(([label, icon, [l, b]]) => ({
    label,
    icon,
    low: Math.round(l * ac),
    base: Math.round(b * ac),
    pct: Math.round((b / rawItems.reduce((s, [,,[,b2]]) => s + b2, 0)) * 100),
  }));

  const optimisationTips: string[] = [
    `Your estimated total: ₹${Math.round(total).toLocaleString('en-IN')} (typical) / ₹${Math.round(totalLow).toLocaleString('en-IN')} (with subsidies & bulk buy).`,
  ];

  if (budget > 0 && budget < totalLow) {
    optimisationTips.push(`Budget is ₹${Math.round(totalLow - budget).toLocaleString('en-IN')} short of the optimistic estimate — consider a KCC loan at 4% net interest.`);
  } else if (budget > 0 && budget < total) {
    optimisationTips.push(`Budget covers subsidised inputs but may need ₹${Math.round(total - budget).toLocaleString('en-IN')} top-up — use FPO bulk purchase to close gap.`);
  } else if (budget > 0) {
    optimisationTips.push(`Budget is sufficient. Allocate the surplus (₹${Math.round(budget - total).toLocaleString('en-IN')}) to post-harvest storage or insurance premium.`);
  }

  // Labour optimisation
  optimisationTips.push('Hire labour in off-peak months (2-3 weeks before peak demand) to reduce daily wage by ₹50-100/worker.');
  // Fertilizer
  optimisationTips.push('Soil testing + site-specific fertilizer recommendation (STCR) can cut fertilizer spend by 20-30%.');
  waterTips(waterAvailability).forEach(t => optimisationTips.push(t));
  // FPO
  optimisationTips.push('Join an FPO or SHG for bulk seed/fertilizer procurement — typically 12-20% cheaper than retail.');

  const subsidyAlerts = MONTHLY_SUBSIDY_ALERTS[m] || [];

  return {
    cropName,
    acreage: ac,
    totalLow: Math.round(totalLow),
    totalBase: Math.round(total),
    totalHigh,
    items,
    optimisationTips,
    subsidyAlerts,
  };
}
