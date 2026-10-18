/**
 * aiGovernance.ts — AI Governance & Reliability Notice utilities.
 *
 * The notice is shown ONCE per user account (keyed by userId) and persisted
 * in localStorage so it survives tab closes. We use localStorage (not
 * sessionStorage) intentionally: governance acknowledgement should persist
 * across sessions just like cookie consent. The payload records:
 *   - noticeVersion (bump when material content changes)
 *   - acknowledgedAt (ISO timestamp)
 *   - userId
 */

export const AI_NOTICE_VERSION = 'v1.0';

export interface GovernanceRecord {
  userId: string;
  noticeVersion: string;
  acknowledgedAt: string; // ISO 8601
}

function storageKey(userId: string) {
  return `kisanwise:aiGov:${userId}`;
}

export function getGovernanceRecord(userId: string): GovernanceRecord | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as GovernanceRecord;
  } catch {
    return null;
  }
}

export function recordGovernanceAck(userId: string): GovernanceRecord {
  const record: GovernanceRecord = {
    userId,
    noticeVersion: AI_NOTICE_VERSION,
    acknowledgedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(record));
  } catch { /* storage full — proceed silently */ }
  return record;
}

/** True if the user has already acknowledged the current notice version. */
export function hasAcknowledged(userId: string): boolean {
  const r = getGovernanceRecord(userId);
  return !!r && r.noticeVersion === AI_NOTICE_VERSION;
}

/** Get the currently logged-in userId from sessionStorage (app uses 'user' key). */
export function getCurrentUserId(): string | null {
  try {
    const u = JSON.parse(sessionStorage.getItem('user') || '{}');
    return (u?.id as string) || (u?.email as string) || null;
  } catch {
    return null;
  }
}
