import { useState } from 'react';
import { Shield, ExternalLink } from 'lucide-react';
import {
  recordGovernanceAck,
  AI_NOTICE_VERSION,
  type GovernanceRecord,
} from '../utils/aiGovernance';

interface Props {
  userId: string;
  onDismiss: (record: GovernanceRecord) => void;
}

/**
 * AI Governance & Reliability Notice — shown once per user account.
 * Minimal, non-intrusive overlay. Requires checkbox + Continue.
 * Displays on first use of the platform, never again once acknowledged.
 */
export default function AIGovernanceModal({ userId, onDismiss }: Props) {
  const [checked, setChecked] = useState(false);

  const handleContinue = () => {
    if (!checked) return;
    const record = recordGovernanceAck(userId);
    onDismiss(record);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-gov-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 id="ai-gov-title" className="text-white font-semibold text-sm">AI Governance & Reliability Notice</h2>
            <p className="text-white/50 text-xs mt-0.5">Notice {AI_NOTICE_VERSION} · KisanWise AI Platform</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            KisanWise uses AI models — including a trained XGBoost price-trend predictor and Gemini generative AI — to assist farmers with planning, pricing, and operational decisions.
          </p>

          <div className="space-y-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="font-semibold text-slate-800">Before you continue, please note:</p>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>Predictions and recommendations are <strong>statistical estimates</strong>, not guarantees. Market prices, weather, and yields are inherently uncertain.</li>
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>The XGBoost price model has a <strong>validation MAE of ~1.2 percentage points</strong> and ~55% 3-class direction accuracy on held-out data. It may be wrong.</li>
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>Gemini AI outputs may contain <strong>inaccuracies or hallucinations</strong>. Always cross-check critical advice with your local agricultural officer or mandi before acting.</li>
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>This tool is an <strong>aid to decision-making</strong>, not a replacement for professional agronomic or financial advice.</li>
              <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>KisanWise is <strong>not liable</strong> for financial losses arising from reliance on AI outputs.</li>
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            You can review this notice at any time from the AI Assistant footer or your account settings.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer flex-shrink-0"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 leading-snug">
              I understand that AI predictions are estimates and may contain errors. I will use this tool as a planning aid and make my own informed decisions.
            </span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!checked}
            className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            I understand &amp; agree — Continue to KisanWise
          </button>

          <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
            <ExternalLink className="h-3 w-3" />
            <a href="/about" className="hover:underline">Learn more about how our AI works</a>
            &nbsp;·&nbsp; Acknowledgement is stored locally and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
