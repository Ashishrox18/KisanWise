/**
 * TC-BL-01 … TC-BL-20  — cropQualityGrades unit tests
 * Tests: getGradesForCrop, gradeToTier, coerceGrade, normalizeCrop
 * No external deps, no mocks needed.
 */
import {
  getGradesForCrop,
  gradeToTier,
  coerceGrade,
  normalizeCrop,
  tierFromScore,
  QUALITY_TIERS,
} from '../services/cropQualityGrades';

// ── normalizeCrop ─────────────────────────────────────────────────────────────
describe('normalizeCrop', () => {
  test('TC-BL-01 lowercases and trims', () => {
    expect(normalizeCrop('  Wheat  ')).toBe('wheat');
  });
  test('TC-BL-02 strips suffix after / or (', () => {
    // normalizeCrop trims the result, so no trailing space
    expect(normalizeCrop('Rice (Basmati)')).toBe('rice');
    expect(normalizeCrop('Mustard / Sarson')).toBe('mustard');
  });
  test('TC-BL-03 returns empty string for undefined', () => {
    expect(normalizeCrop(undefined)).toBe('');
    expect(normalizeCrop('')).toBe('');
  });
});

// ── getGradesForCrop ─────────────────────────────────────────────────────────
describe('getGradesForCrop', () => {
  test('TC-BL-04 wheat returns AGMARK grades', () => {
    const grades = getGradesForCrop('Wheat');
    expect(grades).toContain('FAQ');
    expect(grades[0]).toBe('FAQ');   // best grade is first
    expect(grades.length).toBeGreaterThanOrEqual(3);
  });
  test('TC-BL-05 tomato returns Codex classes', () => {
    const grades = getGradesForCrop('Tomato');
    expect(grades).toContain('Extra Class');
    expect(grades[0]).toBe('Extra Class');
  });
  test('TC-BL-06 potato returns size grades', () => {
    const grades = getGradesForCrop('Potato');
    expect(grades).toEqual(['Large', 'Medium', 'Small', 'Chat']);
  });
  test('TC-BL-07 cotton returns staple-length grades', () => {
    const grades = getGradesForCrop('Cotton');
    expect(grades[0]).toMatch(/Long Staple/);
  });
  test('TC-BL-08 mustard returns Bold/Raya grades', () => {
    const grades = getGradesForCrop('Mustard');
    expect(grades[0]).toMatch(/Bold/);
  });
  test('TC-BL-09 turmeric returns Finger/Bulb grades', () => {
    const grades = getGradesForCrop('Turmeric');
    expect(grades[0]).toMatch(/Finger/);
  });
  test('TC-BL-10 unknown crop returns DEFAULT_GRADES (not A/B/C)', () => {
    const grades = getGradesForCrop('ExoticCrop123');
    expect(grades).toEqual(['Premium', 'Standard', 'Fair', 'Below Standard']);
    expect(grades).not.toContain('A');
    expect(grades).not.toContain('B');
  });
  test('TC-BL-11 undefined crop returns DEFAULT_GRADES', () => {
    const grades = getGradesForCrop(undefined);
    expect(grades).toEqual(['Premium', 'Standard', 'Fair', 'Below Standard']);
  });
});

// ── gradeToTier ───────────────────────────────────────────────────────────────
describe('gradeToTier', () => {
  test('TC-BL-12 legacy "A" maps to Premium', () => {
    expect(gradeToTier('A')).toBe('Premium');
    expect(gradeToTier('Grade A')).toBe('Premium');
    expect(gradeToTier('grade a')).toBe('Premium');
  });
  test('TC-BL-13 legacy "B" maps to Standard', () => {
    expect(gradeToTier('B')).toBe('Standard');
    expect(gradeToTier('Grade B')).toBe('Standard');
  });
  test('TC-BL-14 legacy "C" maps to Fair', () => {
    expect(gradeToTier('C')).toBe('Fair');
  });
  test('TC-BL-15 "FAQ" for wheat maps to Premium (first position)', () => {
    expect(gradeToTier('FAQ', 'Wheat')).toBe('Premium');
  });
  test('TC-BL-16 last potato grade "Chat" maps to Below Standard', () => {
    expect(gradeToTier('Chat', 'Potato')).toBe('Below Standard');
  });
  test('TC-BL-17 empty grade returns Standard', () => {
    expect(gradeToTier('')).toBe('Standard');
  });
  test('TC-BL-18 all returned tiers are valid QualityTier values', () => {
    const grades = getGradesForCrop('Tomato');
    grades.forEach(g => {
      const tier = gradeToTier(g, 'Tomato');
      expect(QUALITY_TIERS).toContain(tier);
    });
  });
});

// ── coerceGrade ───────────────────────────────────────────────────────────────
describe('coerceGrade', () => {
  test('TC-BL-19 exact match returns the grade unchanged', () => {
    expect(coerceGrade('FAQ', 'Wheat')).toBe('FAQ');
    expect(coerceGrade('Large', 'Potato')).toBe('Large');
  });
  test('TC-BL-20 legacy "A" coerces to first wheat grade (FAQ)', () => {
    expect(coerceGrade('A', 'Wheat')).toBe('FAQ');
  });
  test('TC-BL-21 "B" coerces to "Grade B" (substring match wins)', () => {
    // coerceGrade tries substring match before the legacy-letter fallback.
    // 'b'.includes('grade b') is false, but 'grade b'.includes('b') is true,
    // so 'Grade B' is matched directly → correct crop-specific grade returned.
    expect(coerceGrade('B', 'Wheat')).toBe('Grade B');
  });
  test('TC-BL-22 empty grade returns midpoint grade', () => {
    const grades = getGradesForCrop('Potato');
    const mid = grades[Math.floor(grades.length / 2)];
    expect(coerceGrade('', 'Potato')).toBe(mid);
  });
  test('TC-BL-23 gibberish grade returns midpoint grade', () => {
    const grades = getGradesForCrop('Wheat');
    const mid = grades[Math.floor(grades.length / 2)];
    expect(coerceGrade('ZZZ9999', 'Wheat')).toBe(mid);
  });
});

// ── tierFromScore ─────────────────────────────────────────────────────────────
describe('tierFromScore', () => {
  test('TC-BL-24 score>=85 is Premium', () => expect(tierFromScore(90)).toBe('Premium'));
  test('TC-BL-25 score>=70 is Standard', () => expect(tierFromScore(75)).toBe('Standard'));
  test('TC-BL-26 score>=55 is Fair',     () => expect(tierFromScore(60)).toBe('Fair'));
  test('TC-BL-27 score<55 is Below Standard', () => expect(tierFromScore(40)).toBe('Below Standard'));
  test('TC-BL-28 boundary 85 is Premium', () => expect(tierFromScore(85)).toBe('Premium'));
  test('TC-BL-29 boundary 70 is Standard', () => expect(tierFromScore(70)).toBe('Standard'));
});
