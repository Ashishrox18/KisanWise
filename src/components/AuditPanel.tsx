import { useState } from 'react';
import { X, Info, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/api';

interface AuditPanelProps {
  decisionId: string;
  onClose: () => void;
}

export default function AuditPanel({ decisionId, onClose }: AuditPanelProps) {
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    if (audit || loading) return;
    setLoading(true);
    try {
      const resp = await apiService.get(`/ai/audit/${decisionId}`);
      setAudit(resp.audit);
    } catch {
      setError('Could not load audit data.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on mount
  if (!audit && !loading && !error) load();

  const confidence = audit?.confidence_score ?? 0;
  const confidenceClass = confidence >= 70 ? 'confidence-high' : confidence >= 50 ? 'confidence-medium' : 'confidence-low';
  const barColor = confidence >= 70 ? 'bg-primary-600' : confidence >= 50 ? 'bg-accent-400' : 'bg-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-100 bg-primary-700">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-accent-400" />
            <h2 className="text-base font-semibold text-white">Why this answer?</h2>
          </div>
          <button onClick={onClose} className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {audit && (
            <>
              {/* Confidence score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-warm-700">Confidence Score</span>
                  <span className={`text-lg font-bold ${confidenceClass}`}>{confidence.toFixed(0)}%</span>
                </div>
                <div className="confidence-bar">
                  <div className={`confidence-bar-fill ${barColor}`} style={{ width: `${confidence}%` }} />
                </div>
                {confidence < 60 && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Low confidence — review this recommendation carefully
                  </p>
                )}
              </div>

              {/* Decision type + model */}
              <div className="flex gap-2 flex-wrap">
                <span className="badge-green capitalize">{audit.decision_type?.replace(/_/g, ' ')}</span>
                <span className="badge-warm">{audit.model_version || 'gemini-1.5-flash'}</span>
              </div>

              {/* Signals agreed */}
              {audit.signals_agreed?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-warm-600 uppercase tracking-wider">Signals in agreement</p>
                  {audit.signals_agreed.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-warm-700">
                      <CheckCircle className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Signals disagreed */}
              {audit.signals_disagreed?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-warm-600 uppercase tracking-wider">Conflicting signals</p>
                  {audit.signals_disagreed.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-warm-700">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Raw inputs toggle */}
              <div>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-warm-500 hover:text-warm-700 transition-colors py-1"
                >
                  <span>Show raw inputs</span>
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {expanded && (
                  <pre className="mt-2 p-3 bg-warm-50 rounded-lg text-xs text-warm-700 overflow-auto max-h-40 border border-warm-200">
                    {JSON.stringify(
                      typeof audit.inputs_json === 'string' ? JSON.parse(audit.inputs_json) : audit.inputs_json,
                      null, 2,
                    )}
                  </pre>
                )}
              </div>

              <p className="text-xs text-warm-400">
                Decision ID: <span className="font-mono">{decisionId}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
