import { useMemo } from 'react';
import { getCropColor } from './FieldSectorMap';

export interface PlotCrop {
  id: string;
  name: string;
  area?: number;
  progress?: number;      // 0-100 growth
  stage?: string;         // label override
  status?: string;
  waterNeed?: string;      // High | Medium | Low
}

interface PlotMapProps {
  crops: PlotCrop[];
  weather?: {
    weatherCode?: number;
    windSpeed?: number;
    sunrise?: string;
    sunset?: string;
  };
  selectedCropId?: string | null;
  onSelectCrop?: (id: string) => void;
}

const VW = 800;
const VH = 460;
const PX = 40;        // plot left
const PY = 40;        // plot top
const PW = VW - 80;   // plot width
const PH = 360;       // plot height

function stageFromProgress(p: number): { label: string; icon: string } {
  if (p >= 90) return { label: 'Ready', icon: '🌾' };
  if (p >= 65) return { label: 'Fruiting', icon: '🍅' };
  if (p >= 40) return { label: 'Flowering', icon: '🌸' };
  if (p >= 15) return { label: 'Vegetative', icon: '🌿' };
  return { label: 'Seedling', icon: '🌱' };
}

const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);

function isDaytime(sunrise?: string, sunset?: string): boolean {
  if (!sunrise || !sunset) {
    const h = new Date().getHours();
    return h >= 6 && h < 18;
  }
  const now = Date.now();
  return now >= new Date(sunrise).getTime() && now < new Date(sunset).getTime();
}

export default function PlotMap({ crops, weather, selectedCropId, onSelectCrop }: PlotMapProps) {
  const raining = weather?.weatherCode ? RAIN_CODES.has(weather.weatherCode) : false;
  const windy = (weather?.windSpeed ?? 0) >= 20;
  const daytime = isDaytime(weather?.sunrise, weather?.sunset);

  const n = Math.max(crops.length, 1);
  const stripW = PW / n;

  const rainDrops = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ x: PX + (i * 19) % PW, d: (i % 6) * 0.25 })),
    [],
  );

  if (crops.length === 0) {
    return (
      <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-10 text-center bg-emerald-50/40">
        <p className="text-2xl mb-2">🗺️</p>
        <p className="text-sm font-semibold text-gray-700">No active crops on your plot yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Plant a crop from <span className="font-medium">Crop Planning</span> and it will appear here as a sector on your 2D field.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto select-none" style={{ maxHeight: 460 }}>
        <defs>
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b08968" />
            <stop offset="100%" stopColor="#7f5539" />
          </linearGradient>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={daytime ? '#bfdbfe' : '#1e293b'} />
            <stop offset="100%" stopColor={daytime ? '#e0f2fe' : '#334155'} />
          </linearGradient>
          <style>{`
            @keyframes pmSway { 0%,100%{ transform: rotate(-4deg);} 50%{ transform: rotate(4deg);} }
            @keyframes pmRain { 0%{ transform: translateY(-10px); opacity:0;} 20%{opacity:.7;} 100%{ transform: translateY(360px); opacity:0;} }
            @keyframes pmSun { 0%,100%{ opacity:.85;} 50%{ opacity:1;} }
            @keyframes pmTwinkle { 0%,100%{ opacity:.3;} 50%{ opacity:1;} }
            .pm-plant { transform-box: fill-box; transform-origin: bottom center; animation: pmSway ${windy ? 1.1 : 3.2}s ease-in-out infinite; }
            .pm-rain { animation: pmRain linear infinite; }
            .pm-sun { transform-origin: center; animation: pmSun 3s ease-in-out infinite; }
            .pm-star { animation: pmTwinkle 2.4s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Sky backdrop */}
        <rect x="0" y="0" width={VW} height={VH} rx="14" fill="url(#sky)" />

        {/* Sun / Moon */}
        {daytime ? (
          <g className="pm-sun" style={{ transformOrigin: '720px 70px' }}>
            <circle cx="720" cy="70" r="22" fill="#fbbf24" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * 45) * Math.PI / 180;
              return <line key={i} x1={720 + Math.cos(a) * 28} y1={70 + Math.sin(a) * 28} x2={720 + Math.cos(a) * 38} y2={70 + Math.sin(a) * 38} stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />;
            })}
          </g>
        ) : (
          <g>
            <circle cx="720" cy="70" r="18" fill="#e2e8f0" />
            <circle cx="727" cy="66" r="18" fill={daytime ? '#bfdbfe' : '#1e293b'} />
            {[[690, 40], [760, 50], [680, 90], [750, 100], [700, 120]].map(([x, y], i) => (
              <circle key={i} className="pm-star" cx={x} cy={y} r="1.6" fill="#fde68a" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}
          </g>
        )}

        {/* Plot boundary (rounded field) */}
        <rect x={PX} y={PY} width={PW} height={PH} rx="16" fill="url(#soil)" stroke="#5b3a29" strokeWidth="3" />

        {/* Crop patches */}
        {crops.map((crop, idx) => {
          const x = PX + idx * stripW;
          const colors = getCropColor(crop.name);
          const progress = Math.max(0, Math.min(100, crop.progress ?? 0));
          const st = stageFromProgress(progress);
          const selected = selectedCropId === crop.id;
          const areaLabel = crop.area ? `${crop.area} ac` : '';

          return (
            <g key={crop.id} onClick={() => onSelectCrop?.(crop.id)} style={{ cursor: 'pointer' }}>
              {/* patch fill */}
              <rect
                x={x + 4} y={PY + 4} width={stripW - 8} height={PH - 8} rx="10"
                fill={colors.fill} fillOpacity={0.55}
                stroke={selected ? '#0f172a' : colors.border} strokeWidth={selected ? 3.5 : 1.5}
              />
              {/* furrows */}
              {Array.from({ length: 9 }).map((_, r) => (
                <line key={r} x1={x + 10} y1={PY + 30 + r * 36} x2={x + stripW - 10} y2={PY + 30 + r * 36}
                  stroke={colors.border} strokeOpacity={0.25} strokeWidth="1.4" />
              ))}
              {/* sector tag */}
              <rect x={x + 10} y={PY + 10} width={Math.min(86, stripW - 20)} height="20" rx="6" fill="rgba(255,255,255,0.85)" />
              <text x={x + 16} y={PY + 24} fontSize="10" fontWeight="700" fill="#475569">SECTOR {idx + 1}</text>
              {/* swaying plant */}
              <g className="pm-plant" style={{ transformOrigin: `${x + stripW / 2}px ${PY + 210}px` }}>
                <text x={x + stripW / 2} y={PY + 215} textAnchor="middle" fontSize={stripW < 130 ? 30 : 40}>{st.icon}</text>
              </g>
              {/* crop name */}
              <text x={x + stripW / 2} y={PY + 250} textAnchor="middle" fontSize={stripW < 130 ? 12 : 14} fontWeight="700" fill={colors.text}>{crop.name}</text>
              {areaLabel && <text x={x + stripW / 2} y={PY + 268} textAnchor="middle" fontSize="11" fill="#64748b">{areaLabel}</text>}
              {/* stage pill */}
              <rect x={x + stripW / 2 - 42} y={PY + 278} width="84" height="20" rx="10" fill="rgba(255,255,255,0.9)" stroke={colors.border} strokeWidth="1" />
              <text x={x + stripW / 2} y={PY + 292} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{crop.stage || st.label}</text>
              {/* progress bar */}
              <rect x={x + stripW / 2 - 48} y={PY + 312} width="96" height="9" rx="4.5" fill="#e5e7eb" />
              <rect x={x + stripW / 2 - 48} y={PY + 312} width={Math.round(96 * (progress / 100))} height="9" rx="4.5" fill={colors.border} />
              <text x={x + stripW / 2} y={PY + 340} textAnchor="middle" fontSize="10" fill="#64748b">{Math.round(progress)}% grown</text>
            </g>
          );
        })}

        {/* Rain overlay */}
        {raining && rainDrops.map((d, i) => (
          <line key={i} className="pm-rain" x1={d.x} y1={PY - 10} x2={d.x - 6} y2={PY + 14}
            stroke="#bae6fd" strokeWidth="2" strokeLinecap="round"
            style={{ animationDuration: `${0.8 + d.d}s`, animationDelay: `${d.d}s` }} />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500 justify-center">
        <span>🗺️ Plot sectors = your planted crops</span>
        <span>•</span>
        <span>{windy ? '💨 Windy (crops swaying)' : '🍃 Light breeze'}</span>
        <span>•</span>
        <span>{raining ? '🌧️ Rain' : daytime ? '☀️ Day' : '🌙 Night'}</span>
      </div>
    </div>
  );
}
