import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingDown, Info, AlertCircle } from 'lucide-react';
import { buildBreakdown, type CostBreakdown } from '../utils/cropCostEstimator';

interface Props {
  cropName: string;
  landSize: number;
  season: string;
  waterAvailability: string;
  budget: number;
}

const BAR_COLORS = [
  'bg-emerald-400', 'bg-blue-400', 'bg-cyan-400',
  'bg-amber-400',  'bg-violet-400', 'bg-slate-400',
];

export default function CropCostBreakdown({ cropName, landSize, season, waterAvailability, budget }: Props) {
  const [open, setOpen] = useState(false);

  const data: CostBreakdown = buildBreakdown(cropName, landSize, season, waterAvailability, budget);
  const budgetGap = budget > 0 ? budget - data.totalBase : null;

  return (
    <div className="mt-3 border border-emerald-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 transition text-sm font-semibold text-emerald-800"
      >
        <span className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Budget Optimiser · ₹{data.totalBase.toLocaleString('en-IN')} typical · ₹{data.totalLow.toLocaleString('en-IN')} with subsidies
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-white space-y-4">
          {/* Cost bar chart */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Expenditure split (per {data.acreage} acre{data.acreage !== 1 ? 's' : ''})</p>
            <div className="space-y-1.5">
              {data.items.map((item, i) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-gray-700 mb-0.5">
                    <span>{item.icon} {item.label}</span>
                    <span className="font-medium">₹{item.base.toLocaleString('en-IN')} <span className="text-gray-400 font-normal">(opt ₹{item.low.toLocaleString('en-IN')})</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${BAR_COLORS[i % BAR_COLORS.length]} h-2 rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-2 border-t border-gray-100 text-sm font-bold">
              <span>Total (typical)</span>
              <span>₹{data.totalBase.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-700">
              <span>With all subsidies / bulk buy</span>
              <span>₹{data.totalLow.toLocaleString('en-IN')}</span>
            </div>
            {budget > 0 && (
              <div className={`flex justify-between text-xs font-semibold mt-1 ${budgetGap != null && budgetGap < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                <span>Your budget (₹{budget.toLocaleString('en-IN')})</span>
                <span>{budgetGap != null && budgetGap >= 0 ? `+₹${budgetGap.toLocaleString('en-IN')} surplus` : `₹${Math.abs(budgetGap ?? 0).toLocaleString('en-IN')} shortfall`}</span>
              </div>
            )}
          </div>

          {/* Optimisation tips */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center gap-1"><Info className="h-3.5 w-3.5 text-blue-500" /> How to minimise cost</p>
            <ul className="space-y-1.5">
              {data.optimisationTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="text-emerald-500 mt-0.5 font-bold">→</span>{tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Subsidy alerts */}
          {data.subsidyAlerts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> This month's subsidy windows
              </p>
              <ul className="space-y-1">
                {data.subsidyAlerts.map((a, i) => (
                  <li key={i} className="text-xs text-amber-900 flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
