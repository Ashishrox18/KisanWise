import { useState, useEffect } from 'react';
import { hasAcknowledged, getCurrentUserId, type GovernanceRecord } from '../utils/aiGovernance';

/**
 * Returns whether the governance modal should be shown for the current user.
 * Call dismiss() after the user acknowledges.
 */
export function useAIGovernance() {
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setUserId(uid);
    if (!hasAcknowledged(uid)) setShowModal(true);
  }, []);

  const dismiss = (_record: GovernanceRecord) => setShowModal(false);

  return { showModal, userId: userId ?? 'anonymous', dismiss };
}
