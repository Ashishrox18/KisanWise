/**
 * assessmentBridge.ts
 * Persists the most recent quality-assessment result per cropType in
 * localStorage so listing forms can pre-fill the grade without the farmer
 * having to re-enter it. Keyed by normalised cropType so it survives
 * navigation between pages.
 */

export interface SavedAssessment {
  cropType: string;
  qualityGrade: string;       // crop-specific grade, e.g. "FAQ", "Class I"
  qualityTier: string;        // Premium / Standard / Fair / Below Standard
  qualityScore: number;       // 0-100
  gradeBasis: string;         // one-line reason from Gemini
  assessedAt: string;         // ISO timestamp
  variety?: string;
  storageDays?: number;
  moisturePct?: number;
}

const KEY = (crop: string) =>
  `kisanwise:lastAssessment:${crop.toLowerCase().replace(/[\s/()]+/g, '_')}`;

export function saveAssessment(data: SavedAssessment): void {
  try {
    localStorage.setItem(KEY(data.cropType), JSON.stringify(data));
  } catch { /* storage full – proceed silently */ }
}

export function loadAssessment(cropType: string): SavedAssessment | null {
  try {
    const raw = localStorage.getItem(KEY(cropType));
    return raw ? (JSON.parse(raw) as SavedAssessment) : null;
  } catch {
    return null;
  }
}

/** Human-readable age of the saved assessment. */
export function assessmentAge(saved: SavedAssessment): string {
  const ms = Date.now() - new Date(saved.assessedAt).getTime();
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
