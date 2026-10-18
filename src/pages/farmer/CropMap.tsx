import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sun, CloudRain, Wind, Droplets, Thermometer, Calendar, TrendingUp, TrendingDown,
  Sprout, CheckCircle, MapPin, Leaf, Flame, Clock, Flag, Beaker, CloudSun, Minus,
} from 'lucide-react';
import { apiService } from '../../services/api';
import PlotMap, { type PlotCrop } from '../../components/PlotMap';

const DEFAULT_LOC = { lat: 28.6139, lon: 77.2090 }; // New Delhi fallback

interface DailyEntry {
  date: string;
  temp?: number;
  tempMin?: number;
  rainfall?: number;
  rainfallProb?: number;
  wind?: number;
  humidity?: number;
  solar?: number;
  et0?: number;
  waterRequired?: number;
  fertilizer?: string;
  progress?: number;
  actions?: string[];
}

const TERMINAL = new Set(['finished', 'sold']);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function stageLabel(p: number) {
  if (p >= 90) return 'Ready';
  if (p >= 65) return 'Fruiting';
  if (p >= 40) return 'Flowering';
  if (p >= 15) return 'Vegetative';
  return 'Seedling';
}

function computeProgress(crop: any): number {
  if (!crop?.plantingDate) return 0;
  const dur = Number(crop.duration) || 90;
  const elapsed = (Date.now() - new Date(crop.plantingDate).getTime()) / 86400000;
  return Math.max(0, Math.min(100, (elapsed / dur) * 100));
}

function waterFactor(need?: string): number {
  const n = (need || '').toLowerCase();
  if (n === 'high') return 1.0;
  if (n === 'low') return 0.5;
  return 0.75; // medium / unknown
}

function waterRequired(et0: number, rainfall: number, need?: string): number {
  return Math.max(0, Math.round(((et0 || 0) * waterFactor(need) - (rainfall || 0)) * 10) / 10);
}

function fertilizerForStage(stage: string): string {
  switch (stage) {
    case 'Seedling': return 'Light starter dose (DAP); protect young stands.';
    case 'Vegetative': return 'Top-dress Nitrogen (urea) — active growth phase.';
    case 'Flowering': return 'Apply Potash & micronutrients; hold Nitrogen.';
    case 'Fruiting': return 'Reduce fertilizer; monitor for pest & disease.';
    default: return 'Minimal input; plan harvest & post-harvest care.';
  }
}

function actionPoints(crop: any, w: any, waterReq: number): string[] {
  const pts: string[] = [];
  const temp = w?.temperature;
  const rain = w?.rainfall ?? 0;
  const wind = w?.windSpeed ?? 0;
  const stage = stageLabel(computeProgress(crop));

  if (rain < 2 && waterReq > 0) pts.push(`Irrigate ~${waterReq} mm today (ET0 ${w?.et0?.toFixed(1) || '?'} mm, rain ${rain} mm).`);
  else if (rain >= 5) pts.push('Rain sufficient — skip irrigation; check field drainage.');

  if (temp != null && temp >= 38) pts.push('Heat-stress risk — mulch and irrigate early morning.');
  else if (temp != null && temp <= 8) pts.push('Cold spell — watch for frost; delay irrigation.');

  pts.push(`Fertilizer: ${fertilizerForStage(stage)}`);
  if (wind >= 35) pts.push('High wind — stake tall crops, delay spraying.');
  pts.push('Scout for pests; record today’s field observation.');
  return pts.slice(0, 5);
}

function loadLog(cropId: string): DailyEntry[] {
  try {
    return JSON.parse(localStorage.getItem(`cropmap:daily:${cropId}`) || '[]');
  } catch {
    return [];
  }
}
function saveLog(cropId: string, entries: DailyEntry[]) {
  try {
    localStorage.setItem(`cropmap:daily:${cropId}`, JSON.stringify(entries.slice(-30)));
  } catch { /* ignore */ }
}

function ensureToday(crop: any, weather: any): DailyEntry[] {
  const entries = loadLog(crop.id);
  const t = todayStr();
  if (entries.length && entries[entries.length - 1].date === t) return entries;
  const w = weather?.current || {};
  const progress = Math.round(computeProgress(crop));
  const wr = waterRequired(w.et0 ?? 0, w.rainfall ?? 0, crop.waterNeed);
  const entry: DailyEntry = {
    date: t,
    temp: w.temperature,
    tempMin: w.tempMin,
    rainfall: w.rainfall,
    rainfallProb: w.rainfallProbability,
    wind: w.windSpeed,
    humidity: w.humidity,
    solar: w.solarRadiation,
    et0: w.et0,
    waterRequired: wr,
    fertilizer: fertilizerForStage(stageLabel(progress)),
    progress,
    actions: actionPoints(crop, w, wr),
  };
  entries.push(entry);
  saveLog(crop.id, entries);
  return entries;
}

function getFarmLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(DEFAULT_LOC);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(DEFAULT_LOC),
      { timeout: 6000, maximumAge: 600000 },
    );
  });
}

export default function CropMap() {
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [price, setPrice] = useState<any>(null);
  const [logs, setLogs] = useState<Record<string, DailyEntry[]>>({});
  const [ending, setEnding] = useState(false);
  const [endYield, setEndYield] = useState('');
  const [endNotes, setEndNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const activeCrops = useMemo(() => crops.filter((c) => !TERMINAL.has(c.status)), [crops]);
  const plotCrops: PlotCrop[] = useMemo(
    () => activeCrops.map((c) => ({
      id: c.id,
      name: c.name || c.cropType || 'Crop',
      area: Number(c.area) || undefined,
      progress: computeProgress(c),
      stage: stageLabel(computeProgress(c)),
      status: c.status,
      waterNeed: c.waterNeed,
    })),
    [activeCrops],
  );

  const selected = useMemo(
    () => activeCrops.find((c) => c.id === selectedId) || activeCrops[0] || null,
    [activeCrops, selectedId],
  );

  const todayEntry = selected ? (logs[selected.id] || []).slice(-1)[0] : undefined;

  const fetchCrops = useCallback(async () => {
    try {
      const res = await apiService.getCrops();
      setCrops(res.crops || []);
    } catch (e) {
      console.error('fetchCrops', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load: crops + weather
  useEffect(() => {
    fetchCrops();
    (async () => {
      setWeatherLoading(true);
      try {
        const { lat, lon } = await getFarmLocation();
        const w = await apiService.getWeather(lat, lon);
        setWeather(w);
      } catch (e) {
        console.error('weather', e);
      } finally {
        setWeatherLoading(false);
      }
    })();
  }, [fetchCrops]);

  // when weather arrives (or crops change), ensure today's log entry for every active crop
  useEffect(() => {
    if (!weather || activeCrops.length === 0) return;
    const next: Record<string, DailyEntry[]> = {};
    activeCrops.forEach((c) => { next[c.id] = ensureToday(c, weather); });
    setLogs((prev) => ({ ...prev, ...next }));
  }, [weather, activeCrops]);

  // when selection changes, fetch its market price
  useEffect(() => {
    if (!selected) { setPrice(null); return; }
    const name = selected.name || selected.cropType;
    if (!name) return;
    let alive = true;
    (async () => {
      try {
        const res = await apiService.getMarketPrices(name);
        if (alive) setPrice(res?.prices?.[name.toLowerCase()] || null);
      } catch (e) { console.error('price', e); }
    })();
    return () => { alive = false; };
  }, [selected]);

  const handleEndCycle = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await apiService.updateCrop(selected.id, {
        status: 'finished',
        actualYield: endYield ? parseFloat(endYield) : undefined,
        yieldUnit: 'quintals',
        harvestDate: todayStr(),
        notes: endNotes || `Crop cycle ended via Crop Map on ${todayStr()}.`,
      });
      setEnding(false); setEndYield(''); setEndNotes('');
      await fetchCrops();
    } catch (e) {
      console.error('end cycle', e);
      alert('Failed to end crop cycle. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const w = weather?.current || {};
  const heatStress = useMemo(() => {
    const t = w.temperature ?? 28;
    const h = w.humidity ?? 60;
    const score = Math.max(0, Math.min(100, Math.round((t - 20) * 2.2 + (h < 40 ? 15 : 0) + (h > 85 ? 10 : 0))));
    return score;
  }, [w]);
  const heatColor = heatStress < 35 ? '#22c55e' : heatStress < 65 ? '#f59e0b' : '#ef4444';

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><MapPin className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold">Crop Map</h1>
            <p className="text-emerald-100 text-sm">Live 2D plot · daily weather, water & harvest tracking till you finish the cycle</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-emerald-100">Today</p>
          <p className="font-semibold">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          {weather?.location?.city && <p className="text-xs text-emerald-100 mt-0.5 flex items-center gap-1 justify-end"><MapPin className="h-3 w-3" />{weather.location.city}</p>}
        </div>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-gray-500">Loading your plot…</div>
      ) : activeCrops.length === 0 ? (
        <div className="card p-10 text-center">
          <Sprout className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">No active crops on your plot</h2>
          <p className="text-gray-500 text-sm mt-1">Plant a crop from Crop Planning and it will appear here as a sector.</p>
          <Link to="/farmer/crop-planning" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
            <Sprout className="h-4 w-4" /> Go to Crop Planning
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── LEFT: weather / water / sunlight / actions ── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><CloudSun className="h-4 w-4 text-amber-500" /> Today’s Field Readings</h3>
              {weatherLoading ? (
                <p className="text-sm text-gray-400">Fetching weather…</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <Row icon={<Thermometer className="h-4 w-4 text-orange-500" />} label="Temperature" value={`${w.temperature ?? '—'}°C`} sub={w.tempMin != null ? `min ${Math.round(w.tempMin)}°C` : undefined} />
                  <Row icon={<Droplets className="h-4 w-4 text-blue-500" />} label="Rainfall" value={`${w.rainfall ?? 0} mm`} sub={w.rainfallProbability != null ? `${w.rainfallProbability}% prob` : undefined} />
                  <Row icon={<Wind className="h-4 w-4 text-slate-500" />} label="Wind" value={`${w.windSpeed ?? 0} km/h`} />
                  <Row icon={<Droplets className="h-4 w-4 text-cyan-500" />} label="Humidity" value={`${w.humidity ?? '—'}%`} />
                  <Row icon={<Sun className="h-4 w-4 text-yellow-500" />} label="Sunlight" value={w.solarRadiation != null ? `${Math.round(w.solarRadiation)} W/m²` : '—'} />
                  <Row icon={<Beaker className="h-4 w-4 text-teal-500" />} label="ET0 (water demand)" value={w.et0 != null ? `${w.et0.toFixed(1)} mm` : '—'} />
                </div>
              )}
            </div>

            {/* Heat / stress map */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Flame className="h-4 w-4 text-red-500" /> Heat / Stress Map</h3>
              <div className="h-3 rounded-full overflow-hidden flex">
                {[0,1,2,3,4].map((i) => (
                  <div key={i} className="flex-1" style={{ background: ['#22c55e','#a3e635','#facc15','#f97316','#ef4444'][i], opacity: (heatStress >= i*20 && heatStress < (i+1)*20) ? 1 : 0.35 }} />
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: heatColor }}>
                {heatStress < 35 ? 'Low stress — favourable conditions.' : heatStress < 65 ? 'Moderate stress — monitor heat & moisture.' : 'High stress — irrigate & protect crops now.'}
              </p>
            </div>

            {/* Water & fertilizer required */}
            <div className="card p-4 space-y-2">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-500" /> Water & Fertilizer</h3>
              {selected ? (
                <>
                  <Row icon={<Droplets className="h-4 w-4 text-blue-500" />} label="Irrigation needed" value={`${todayEntry?.waterRequired ?? waterRequired(w.et0 ?? 0, w.rainfall ?? 0, selected.waterNeed)} mm`} />
                  <Row icon={<Beaker className="h-4 w-4 text-teal-500" />} label="Fertilizer" value={todayEntry?.fertilizer || fertilizerForStage(stageLabel(computeProgress(selected)))} small />
                </>
              ) : <p className="text-xs text-gray-400">Select a crop.</p>}
            </div>

            {/* Action points for the day */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Today’s Action Points</h3>
              {selected ? (
                <ul className="space-y-1.5 text-sm text-gray-700">
                  {(todayEntry?.actions || actionPoints(selected, w, todayEntry?.waterRequired ?? waterRequired(w.et0 ?? 0, w.rainfall ?? 0, selected.waterNeed))).map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">•</span>{a}</li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-400">Select a crop.</p>}
            </div>
          </div>

          {/* ── CENTER: 2D plot map ── */}
          <div className="lg:col-span-6">
            <div className="card p-4">
              <PlotMap
                crops={plotCrops}
                weather={{ weatherCode: w.weatherCode, windSpeed: w.windSpeed, sunrise: w.sunrise, sunset: w.sunset }}
                selectedCropId={selected?.id}
                onSelectCrop={(id) => setSelectedId(id)}
              />
            </div>
            {selected && (
              <div className="card p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Leaf className="h-4 w-4 text-green-600" /> {selected.name} · Progress</h3>
                  <span className="text-xs text-gray-500">Planted {selected.plantingDate?.slice(0,10)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-600" style={{ width: `${Math.round(computeProgress(selected))}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{stageLabel(computeProgress(selected))} · {Math.round(computeProgress(selected))}% of cycle complete</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: crop trend + monetary + harvest tracking ── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Crop trend */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-600" /> Crop Trend</h3>
              {selected ? (price ? (
                <div className="space-y-1.5 text-sm">
                  <Row label="Current mandi price" value={`₹${Math.round(price.current).toLocaleString('en-IN')}/${price.unit || 'quintal'}`} />
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Trend</span>
                    {price.trend === 'rising' ? <TrendingUp className="h-4 w-4 text-green-600" /> : price.trend === 'falling' ? <TrendingDown className="h-4 w-4 text-red-600" /> : <Minus className="h-4 w-4 text-gray-400" />}
                    <span className="font-medium capitalize">{price.trend}</span>
                    <span className="text-gray-500">({price.change})</span>
                  </div>
                  <Row label="Price range" value={`₹${Math.round(price.min).toLocaleString('en-IN')} – ₹${Math.round(price.max).toLocaleString('en-IN')}`} small />
                </div>
              ) : <p className="text-xs text-gray-400">Loading price…</p>) : <p className="text-xs text-gray-400">Select a crop.</p>}
            </div>

            {/* Monetary + harvest tracking */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-blue-600" /> Harvest Tracking</h3>
              {selected ? (() => {
                const dur = Number(selected.duration) || 90;
                const planting = new Date(selected.plantingDate || Date.now());
                const harvestDate = new Date(planting.getTime() + dur * 86400000);
                const daysLeft = Math.max(0, Math.ceil((harvestDate.getTime() - Date.now()) / 86400000));
                const readiness = Math.round(computeProgress(selected));
                return (
                  <div className="space-y-1.5 text-sm">
                    <Row label="Expected harvest" value={harvestDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                    <Row label="Days to harvest" value={`${daysLeft} days`} />
                    <Row label="Readiness" value={`${readiness}%`} />
                    <Row label="Expected yield" value={selected.expectedYield ? `${selected.expectedYield} ${selected.yieldUnit || ''}` : '—'} />
                    <Row label="Expected revenue" value={selected.expectedRevenue ? `₹${Number(selected.expectedRevenue).toLocaleString('en-IN')}` : '—'} />
                    <div className="pt-1">
                      <span className="text-gray-600">Status: </span>
                      <span className="font-medium capitalize">{selected.status || 'growing'}</span>
                    </div>
                  </div>
                );
              })() : <p className="text-xs text-gray-400">Select a crop.</p>}
            </div>

            {/* End cycle */}
            {selected && !ending ? (
              <button onClick={() => setEnding(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-red-200 text-red-700 bg-red-50 rounded-xl text-sm font-medium hover:bg-red-100 transition">
                <Flag className="h-4 w-4" /> Finish / End Crop Cycle
              </button>
            ) : ending && selected ? (
              <div className="card p-4 border border-red-200">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Flag className="h-4 w-4 text-red-600" /> End Cycle — {selected.name}</h3>
                <p className="text-xs text-gray-500 mb-3">This archives the crop off your live plot. You can record the final yield & notes.</p>
                <label className="block text-xs font-medium text-gray-600 mb-1">Actual yield (optional)</label>
                <input type="number" value={endYield} onChange={(e) => setEndYield(e.target.value)} className="input-field mb-2" placeholder="e.g. 120" />
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea value={endNotes} onChange={(e) => setEndNotes(e.target.value)} rows={2} className="input-field mb-3" placeholder="Closing remarks…" />
                <div className="flex gap-2">
                  <button onClick={() => setEnding(false)} disabled={busy} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  <button onClick={handleEndCycle} disabled={busy} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">{busy ? 'Ending…' : 'Confirm End'}</button>
                </div>
              </div>
            ) : null}

            {/* Daily history timeline */}
            {selected && (logs[selected.id] || []).length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /> Daily Log</h3>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {(logs[selected.id] || []).slice(-8).reverse().map((e, i) => (
                    <div key={i} className="text-xs border-l-2 border-emerald-300 pl-2 py-0.5">
                      <div className="flex justify-between"><span className="font-medium text-gray-700">{e.date}</span><span className="text-gray-500">{e.progress ?? 0}% grown</span></div>
                      <div className="text-gray-500">{e.temp != null ? `${e.temp}°C` : ''}{e.rainfall != null ? ` · ${e.rainfall}mm rain` : ''} · irrig ~{e.waterRequired ?? 0}mm</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value, sub, small }: { icon?: React.ReactNode; label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-right">
        <span className={`font-medium text-gray-800 ${small ? 'text-xs' : ''}`}>{value}</span>
        {sub && <span className="block text-[11px] text-gray-400">{sub}</span>}
      </span>
    </div>
  );
}
