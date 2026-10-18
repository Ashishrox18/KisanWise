import React, { useState } from 'react';
import { Calendar, Droplets, CheckCircle, AlertTriangle, AlertCircle, Sparkles, ChevronRight, X, Clock } from 'lucide-react';

export interface SectorCrop {
  name: string;
  suitability: number; // 0-100 (confidence)
  expectedYield?: string;
  revenue?: string;
  duration?: string;
  waterNeed?: string;
  marketDemand?: string;
  riskLevel?: string;
  reasoning?: string;
  priceTrend?: string;
  roadmap?: Array<{
    phase: string;
    timing: string;
    action: string;
    icon?: string;
  }>;
}

interface FieldSectorMapProps {
  totalAcres: number;
  selectedCrops: SectorCrop[];
  onRemoveCrop?: (cropName: string) => void;
  onCropSelect?: (crop: SectorCrop) => void;
}

// Fixed color map for common Indian crops
const CROP_COLOR_MAP: Record<string, { fill: string; border: string; text: string; bg: string; dot: string }> = {
  'Wheat': { fill: '#FEF3C7', border: '#D97706', text: '#92400E', bg: 'bg-amber-50', dot: '#D97706' },
  'Rice': { fill: '#DCFCE7', border: '#16A34A', text: '#166534', bg: 'bg-emerald-50', dot: '#16A34A' },
  'Maize': { fill: '#FEF9C3', border: '#CA8A04', text: '#854D0E', bg: 'bg-yellow-50', dot: '#CA8A04' },
  'Cotton': { fill: '#E0E7FF', border: '#4F46E5', text: '#3730A3', bg: 'bg-indigo-50', dot: '#4F46E5' },
  'Sugarcane': { fill: '#CCFBF1', border: '#0D9488', text: '#115E59', bg: 'bg-teal-50', dot: '#0D9488' },
  'Potato': { fill: '#FFEDD5', border: '#EA580C', text: '#9A3412', bg: 'bg-orange-50', dot: '#EA580C' },
  'Mustard': { fill: '#FEF08A', border: '#EAB308', text: '#713F12', bg: 'bg-yellow-100', dot: '#EAB308' },
  'Chickpea': { fill: '#FCE7F3', border: '#DB2777', text: '#9D174D', bg: 'bg-pink-50', dot: '#DB2777' },
  'Soybean': { fill: '#ECFCCB', border: '#65A30D', text: '#3F6212', bg: 'bg-lime-50', dot: '#65A30D' },
  'Tomato': { fill: '#FEE2E2', border: '#DC2626', text: '#991B1B', bg: 'bg-red-50', dot: '#DC2626' },
  'Onion': { fill: '#EDE9FE', border: '#7C3AED', text: '#5B21B6', bg: 'bg-purple-50', dot: '#7C3AED' },
  'Groundnut': { fill: '#FAE8FF', border: '#9333EA', text: '#6B21A8', bg: 'bg-fuchsia-50', dot: '#9333EA' },
  'Bajra': { fill: '#F5F5F4', border: '#78716C', text: '#44403C', bg: 'bg-stone-50', dot: '#78716C' },
  'Jowar': { fill: '#E2E8F0', border: '#475569', text: '#1E293B', bg: 'bg-slate-50', dot: '#475569' },
  'Lentils': { fill: '#FED7AA', border: '#C2410C', text: '#7C2D12', bg: 'bg-orange-50', dot: '#C2410C' },
  'default': { fill: '#F3F4F6', border: '#6B7280', text: '#1F2937', bg: 'bg-gray-50', dot: '#6B7280' },
};

export function getCropColor(cropName: string) {
  const normalized = Object.keys(CROP_COLOR_MAP).find(k => 
    cropName.toLowerCase().includes(k.toLowerCase())
  );
  return CROP_COLOR_MAP[normalized || 'default'];
}

// Generate default upcoming 2-3 roadmap steps for a crop
export function getCropRoadmap(crop: SectorCrop) {
  if (crop.roadmap && crop.roadmap.length > 0) return crop.roadmap;

  const durationDays = parseInt(crop.duration || '90') || 90;
  const now = new Date();
  
  // Sowing window
  const sowStart = new Date(now.getTime() + 5 * 24 * 3600 * 1000);
  const sowEnd = new Date(now.getTime() + 25 * 24 * 3600 * 1000);
  const sowWindow = `${sowStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${sowEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  // Irrigation window (21-25 days after sowing)
  const irrDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const irrWindow = `${irrDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (Day 20–25)`;

  // Harvest window
  const harvDate = new Date(now.getTime() + (durationDays + 10) * 24 * 3600 * 1000);
  const harvWindow = `${harvDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (~${durationDays} days)`;

  return [
    {
      phase: 'Sowing Window',
      timing: sowWindow,
      action: 'Land preparation with deep tilling; sow certified seeds with treated fungicide.',
      icon: '🌱',
    },
    {
      phase: 'Critical Irrigation',
      timing: irrWindow,
      action: crop.waterNeed === 'High' 
        ? 'First major irrigation required at root initiation stage; keep moisture steady.' 
        : 'Light irrigation at crown root initiation; avoid standing water.',
      icon: '💧',
    },
    {
      phase: 'Expected Harvest Window',
      timing: harvWindow,
      action: `Target harvest at physiological maturity when grain/produce moisture is ~12-14%.`,
      icon: '🌾',
    },
  ];
}

export default function FieldSectorMap({ totalAcres, selectedCrops, onRemoveCrop, onCropSelect }: FieldSectorMapProps) {
  const [activeCropName, setActiveCropName] = useState<string | null>(
    selectedCrops.length > 0 ? selectedCrops[0].name : null
  );

  if (selectedCrops.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/50">
        <p className="text-sm font-medium text-gray-700">No crops selected for field sectoring</p>
        <p className="text-xs text-gray-500 mt-1">
          Select one or more recommended crops or use search below to partition your field into 2D sectors.
        </p>
      </div>
    );
  }

  const numCrops = selectedCrops.length;
  const acresPerSector = (totalAcres / numCrops).toFixed(1);
  const svgWidth = 800;
  const svgHeight = 220;
  const stripWidth = svgWidth / numCrops;

  const activeCrop = selectedCrops.find(c => c.name === activeCropName) || selectedCrops[0];
  const activeRoadmap = activeCrop ? getCropRoadmap(activeCrop) : [];

  return (
    <div className="card space-y-4 border border-emerald-200/80 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <h2 className="text-base font-bold text-gray-900">2D Field Sector Map</h2>
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {totalAcres} Total Acres • {numCrops} {numCrops === 1 ? 'Sector' : 'Sectors'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Field divided into {numCrops} equal {acresPerSector}-acre sectors. Tap any strip to inspect its roadmap and actions.
          </p>
        </div>

        {/* Confidence Legend */}
        <div className="flex items-center gap-3 text-[11px] text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg self-start sm:self-auto">
          <span className="font-semibold text-gray-700">Trust Engine:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> ≥75% High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> 60-74% Med
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> &lt;60% Low
          </span>
        </div>
      </div>

      {/* SVG 2D Field Map */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[500px] rounded-xl select-none"
          style={{ maxHeight: '240px' }}
        >
          {/* Field Boundary Background */}
          <rect
            x="2"
            y="2"
            width={svgWidth - 4}
            height={svgHeight - 4}
            rx="12"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="3"
          />

          {/* Vertical Strips (one per selected crop) */}
          {selectedCrops.map((crop, idx) => {
            const x = idx * stripWidth;
            const colors = getCropColor(crop.name);
            const isSelected = activeCrop?.name === crop.name;
            const confidence = crop.suitability ?? 70;
            const statusColor = confidence >= 75 ? '#10B981' : confidence >= 60 ? '#F59E0B' : '#EF4444';
            const statusLabel = confidence >= 75 ? 'High Confidence' : confidence >= 60 ? 'Moderate' : 'Low Confidence';

            return (
              <g
                key={crop.name}
                onClick={() => {
                  setActiveCropName(crop.name);
                  if (onCropSelect) onCropSelect(crop);
                }}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Sector Strip Rectangle */}
                <rect
                  x={x + 3}
                  y={4}
                  width={stripWidth - 6}
                  height={svgHeight - 8}
                  rx="8"
                  fill={colors.fill}
                  stroke={isSelected ? '#0F172A' : colors.border}
                  strokeWidth={isSelected ? '3.5' : '1.5'}
                  strokeDasharray={isSelected ? 'none' : 'none'}
                  className="hover:opacity-90 transition-opacity"
                />

                {/* Sector Header: Index / Sector Number */}
                <rect
                  x={x + 12}
                  y={14}
                  width={Math.min(90, stripWidth - 24)}
                  height="22"
                  rx="6"
                  fill="rgba(255,255,255,0.85)"
                />
                <text
                  x={x + 18}
                  y={29}
                  fontSize="10"
                  fontWeight="bold"
                  fill="#475569"
                >
                  SECTOR {idx + 1}
                </text>

                {/* Status Dot (Trust Engine confidence) */}
                <circle
                  cx={x + stripWidth - 22}
                  cy={25}
                  r="6"
                  fill={statusColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />

                {/* Crop Name (Centered) */}
                <text
                  x={x + stripWidth / 2}
                  y={svgHeight / 2 - 10}
                  textAnchor="middle"
                  fontSize={stripWidth < 140 ? '12' : '15'}
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {crop.name}
                </text>

                {/* Allocated Acres (Centered) */}
                <text
                  x={x + stripWidth / 2}
                  y={svgHeight / 2 + 14}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="#64748B"
                >
                  {acresPerSector} acres
                </text>

                {/* Match percentage / Confidence Badge */}
                <rect
                  x={x + stripWidth / 2 - 45}
                  y={svgHeight - 44}
                  width="90"
                  height="22"
                  rx="11"
                  fill="rgba(255,255,255,0.9)"
                  stroke={statusColor}
                  strokeWidth="1.5"
                />
                <text
                  x={x + stripWidth / 2}
                  y={svgHeight - 29}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#0F172A"
                >
                  {confidence}% Match
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Crop Detail & Roadmap Strip */}
      {activeCrop && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🌱</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">{activeCrop.name} Sector Plan</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeCrop.suitability >= 75 ? 'bg-emerald-100 text-emerald-800' :
                    activeCrop.suitability >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {activeCrop.suitability}% Confidence
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Allocated: <strong className="text-gray-800">{acresPerSector} acres</strong> • Expected Revenue: <strong className="text-emerald-700">{activeCrop.revenue || 'Market Rate'}</strong>
                </p>
              </div>
            </div>

            {onRemoveCrop && numCrops > 1 && (
              <button
                type="button"
                onClick={() => onRemoveCrop(activeCrop.name)}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition flex items-center gap-1 self-start md:self-auto"
              >
                <X className="w-3.5 h-3.5" /> Remove Sector
              </button>
            )}
          </div>

          {/* Roadmap: Upcoming 2-3 Actions as dated list */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Upcoming Roadmap & Schedule
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {activeRoadmap.map((step, sIdx) => (
                <div
                  key={sIdx}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col justify-between shadow-xs hover:border-emerald-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{step.icon || '📌'}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {step.timing}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 mb-1">{step.phase}</p>
                    <p className="text-[11px] text-gray-600 leading-snug">{step.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reasoning / Trust Engine Notes */}
          {activeCrop.reasoning && (
            <p className="text-xs text-slate-600 mt-3 pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-800">💡 Field Insight: </span>
              {activeCrop.reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
