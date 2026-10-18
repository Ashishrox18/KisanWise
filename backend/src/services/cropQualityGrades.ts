/**
 * cropQualityGrades.ts — crop-specific quality-grade vocabularies + a universal
 * quality tier.
 *
 * WHY: agricultural quality grades are NOT a universal A/B/C scale — they differ
 * by crop. Wheat uses FAQ/Grade A/B/C; tomato & most fresh produce use Codex
 * Extra Class/Class I/II; cotton uses staple-length grades; potato by size;
 * onion FAQ/Sorting. So instead of one A/B/C for everything we expose:
 *   - getGradesForCrop(crop): the distinct, crop-specific grade labels (best→worst)
 *   - qualityScore (0-100): the universal, cross-crop comparable metric
 *   - qualityTier: Premium / Standard / Fair / Below Standard — derived from the
 *     score (for cross-crop comparison & filtering), replacing the old A/B/C filter
 *   - gradeToTier(grade, crop): map a crop-specific grade to a tier (by position)
 *   - coerceGrade(grade, crop): force a model/free-text grade into a valid one
 *
 * NOTE: this file is duplicated at src/utils/cropQualityGrades.ts (frontend) so
 * both TS projects share the same vocabulary. Keep the two copies in sync.
 */

export type QualityTier = 'Premium' | 'Standard' | 'Fair' | 'Below Standard';
export const QUALITY_TIERS: QualityTier[] = ['Premium', 'Standard', 'Fair', 'Below Standard'];

/** Crop-specific grade vocabularies, ordered best → worst. Keys are normalised. */
const CROP_GRADES: Record<string, string[]> = {
  // ── Cereals (AGMARK / FCI procurement terms) ──────────────────────────────
  wheat: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  rice: ['Common', 'Grade A', 'Grade B', 'Grade C'],
  paddy: ['Common', 'Grade A', 'Grade B', 'Grade C'],
  basmati: ['Premium (1121 / 1509)', 'Grade A (Ordinary Basmati)', 'Grade B'],
  maize: ['FAQ', 'Grade A', 'Grade B'],
  corn: ['FAQ', 'Grade A', 'Grade B'],
  bajra: ['FAQ', 'Grade A', 'Grade B'],
  'pearl millet': ['FAQ', 'Grade A', 'Grade B'],
  jowar: ['FAQ', 'Grade A', 'Grade B'],
  sorghum: ['FAQ', 'Grade A', 'Grade B'],
  barley: ['FAQ', 'Grade A', 'Grade B'],
  ragi: ['FAQ', 'Grade A', 'Grade B'],
  'finger millet': ['FAQ', 'Grade A', 'Grade B'],
  oats: ['FAQ', 'Grade A', 'Grade B'],
  // ── Pulses & legumes ────────────────────────────────────────────────────────
  chickpea: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  chana: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  'black gram': ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  urad: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  'green gram': ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  moong: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  'pigeon pea': ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  tur: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  lentil: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  masoor: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  'kidney bean': ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  rajma: ['FAQ', 'Grade A', 'Grade B', 'Grade C'],
  // ── Oilseeds ────────────────────────────────────────────────────────────────
  groundnut: ['Bold', 'Java', 'FAQ', 'Splits'],
  peanut: ['Bold', 'Java', 'FAQ', 'Splits'],
  mustard: ['Bold (Raya)', 'Medium', 'Small (Toria)', 'FAQ'],
  sarson: ['Bold (Raya)', 'Medium', 'Small (Toria)', 'FAQ'],
  soybean: ['FAQ', 'Grade A', 'Grade B'],
  soya: ['FAQ', 'Grade A', 'Grade B'],
  sunflower: ['FAQ', 'Grade A', 'Grade B'],
  sesame: ['FAQ', 'Grade A', 'Grade B'],
  til: ['FAQ', 'Grade A', 'Grade B'],
  // ── Vegetables (Codex fresh-produce classes / size) ─────────────────────────
  potato: ['Large', 'Medium', 'Small', 'Chat'],
  onion: ['FAQ (Large)', 'Grade A (Medium)', 'Sorting (Small)'],
  tomato: ['Extra Class', 'Class I', 'Class II'],
  garlic: ['FAQ', 'Grade A', 'Grade B'],
  ginger: ['Large / Wet', 'Medium / Wet', 'Small / Dry', 'FAQ'],
  brinjal: ['Extra Class', 'Class I', 'Class II'],
  eggplant: ['Extra Class', 'Class I', 'Class II'],
  okra: ['Extra Class', 'Class I', 'Class II'],
  bhindi: ['Extra Class', 'Class I', 'Class II'],
  cauliflower: ['Extra Class', 'Class I', 'Class II'],
  cabbage: ['Extra Class', 'Class I', 'Class II'],
  capsicum: ['Extra Class', 'Class I', 'Class II'],
  cucumber: ['Extra Class', 'Class I', 'Class II'],
  carrot: ['Extra Class', 'Class I', 'Class II'],
  radish: ['Extra Class', 'Class I', 'Class II'],
  chilli: ['FAQ', 'Grade A', 'Grade B'],
  'green pepper': ['FAQ', 'Grade A', 'Grade B'],
  // ── Fruits (Codex classes) ─────────────────────────────────────────────────
  mango: ['Extra Class', 'Class I', 'Class II'],
  banana: ['Extra Class', 'Class I', 'Class II'],
  papaya: ['Extra Class', 'Class I', 'Class II'],
  guava: ['Extra Class', 'Class I', 'Class II'],
  lemon: ['Extra Class', 'Class I', 'Class II'],
  orange: ['Extra Class', 'Class I', 'Class II'],
  pomegranate: ['Extra Class', 'Class I', 'Class II'],
  grapes: ['Extra Class', 'Class I', 'Class II'],
  watermelon: ['Extra Class', 'Class I', 'Class II'],
  // ── Cash crops ────────────────────────────────────────────────────────────
  cotton: ['Grade A (Long Staple)', 'Grade B (Medium Staple)', 'Grade C (Short Staple)'],
  sugarcane: ['High Recovery (≥10.5% CCS)', 'Standard Recovery (9–10.5% CCS)', 'Low Recovery (<9% CCS)'],
  jute: ['Grade A (TD-5 / W)', 'Grade B', 'Grade C'],
  // ── Spices ────────────────────────────────────────────────────────────────
  turmeric: ['Finger (High Curcumin)', 'Bulb', 'FAQ'],
  haldi: ['Finger (High Curcumin)', 'Bulb', 'FAQ'],
  coriander: ['FAQ', 'Grade A', 'Grade B'],
  cumin: ['FAQ', 'Grade A', 'Grade B'],
  jeera: ['FAQ', 'Grade A', 'Grade B'],
  'black pepper': ['FAQ', 'Grade A', 'Grade B'],
  local: ['Local', 'FAQ'],
  hybrid: ['Hybrid / Local', 'FAQ'],
};

/** Fallback for uncatalogued crops — descriptive, NOT A/B/C. */
const DEFAULT_GRADES: string[] = ['Premium', 'Standard', 'Fair', 'Below Standard'];

/** Normalise a crop name to a lookup key (lower-case, first token before / or ()). */
export function normalizeCrop(crop?: string): string {
  if (!crop) return '';
  return crop.toLowerCase().split(/[/(]/)[0].trim();
}

/** Distinct, crop-specific grade labels (best → worst). */
export function getGradesForCrop(crop?: string): string[] {
  const key = normalizeCrop(crop);
  return key && CROP_GRADES[key] ? CROP_GRADES[key] : DEFAULT_GRADES;
}

/** Map a 0–100 quality score to a universal, cross-crop tier. */
export function tierFromScore(score: number): QualityTier {
  if (score >= 85) return 'Premium';
  if (score >= 70) return 'Standard';
  if (score >= 55) return 'Fair';
  return 'Below Standard';
}

/** Map a crop-specific grade (by position) or a legacy A/B/C letter to a tier. */
export function gradeToTier(grade: string, crop?: string): QualityTier {
  const g = (grade || '').trim().toLowerCase();
  if (!g) return 'Standard';
  // legacy letter grades first (covers existing A/B/C listing data)
  if (g === 'a' || g === 'grade a') return 'Premium';
  if (g === 'b' || g === 'grade b') return 'Standard';
  if (g === 'c' || g === 'grade c') return 'Fair';
  if (g === 'd' || g === 'below') return 'Below Standard';
  const grades = getGradesForCrop(crop);
  let i = grades.findIndex(x => x.toLowerCase() === g);
  if (i < 0) i = grades.findIndex(x => x.toLowerCase().includes(g) || g.includes(x.toLowerCase()));
  if (i < 0) return 'Standard';
  const n = grades.length;
  const tierIdx = n === 1 ? 1 : Math.round((i / (n - 1)) * (QUALITY_TIERS.length - 1));
  return QUALITY_TIERS[Math.min(tierIdx, QUALITY_TIERS.length - 1)];
}

/** Force a model/free-text grade into a valid crop-specific grade. */
export function coerceGrade(grade: string, crop?: string): string {
  const grades = getGradesForCrop(crop);
  const g = (grade || '').trim();
  if (!g) return grades[Math.floor(grades.length / 2)];
  const exact = grades.find(x => x.toLowerCase() === g.toLowerCase());
  if (exact) return exact;
  const sub = grades.find(x => x.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(x.toLowerCase()));
  if (sub) return sub;
  // legacy letters
  if (/^a/i.test(g)) return grades[0];
  if (/^b/i.test(g)) return grades[Math.min(1, grades.length - 1)];
  if (/^c/i.test(g)) return grades[Math.min(2, grades.length - 1)];
  return grades[Math.floor(grades.length / 2)];
}
