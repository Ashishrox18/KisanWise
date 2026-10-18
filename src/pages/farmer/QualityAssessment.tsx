import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Sparkles, CheckCircle, AlertCircle, Leaf, TrendingUp, ShieldCheck, Star, RefreshCw, X, Info, FlaskConical } from 'lucide-react'
import { apiService } from '../../services/api'
import { Link } from 'react-router-dom'
import { getGradesForCrop, gradeToTier, type QualityTier } from '../../utils/cropQualityGrades'
import { saveAssessment } from '../../utils/assessmentBridge'

// ── Comprehensive crop list with types ────────────────────────────────────────
export const CROP_CATALOG = [
  // Cereals
  { group: '🌾 Cereals', items: ['Wheat', 'Rice (Basmati)', 'Rice (Non-Basmati)', 'Rice (Sona Masoori)', 'Maize / Corn', 'Bajra / Pearl Millet', 'Jowar / Sorghum', 'Barley', 'Ragi / Finger Millet', 'Oats'] },
  // Pulses
  { group: '🫘 Pulses & Legumes', items: ['Chickpea / Chana', 'Black Gram / Urad Dal', 'Green Gram / Moong Dal', 'Pigeon Pea / Tur Dal', 'Lentils / Masoor Dal', 'Kidney Beans / Rajma', 'Field Peas / Matar', 'Moth Beans', 'Horse Gram / Kulthi'] },
  // Oilseeds
  { group: '🌻 Oilseeds', items: ['Groundnut / Peanut', 'Mustard / Sarson', 'Sunflower', 'Soybean', 'Sesame / Til', 'Linseed / Alsi', 'Safflower', 'Castor'] },
  // Vegetables
  { group: '🥦 Vegetables', items: ['Tomato', 'Potato', 'Onion', 'Garlic', 'Brinjal / Eggplant', 'Okra / Bhindi', 'Cauliflower', 'Cabbage', 'Peas', 'Spinach', 'Carrot', 'Radish', 'Bitter Gourd / Karela', 'Bottle Gourd / Lauki', 'Ridge Gourd', 'Snake Gourd', 'Pumpkin', 'Chilli / Green Pepper', 'Capsicum', 'Sweet Corn', 'Cucumber', 'Broccoli', 'Drumstick / Moringa', 'Yam / Suran', 'Colocasia / Arbi'] },
  // Fruits
  { group: '🍋 Fruits', items: ['Mango (Alphonso)', 'Mango (Kesar)', 'Mango (Dasheri)', 'Banana', 'Papaya', 'Guava', 'Lemon / Nimbu', 'Orange', 'Pomegranate', 'Grapes', 'Watermelon', 'Muskmelon', 'Pineapple', 'Litchi', 'Jamun', 'Amla / Indian Gooseberry', 'Custard Apple / Sitaphal', 'Fig', 'Sapodilla / Chiku'] },
  // Cash crops
  { group: '💰 Cash Crops', items: ['Cotton (BT)', 'Cotton (Desi)', 'Sugarcane', 'Jute', 'Tobacco', 'Rubber', 'Coffee (Arabica)', 'Coffee (Robusta)', 'Tea', 'Cardamom'] },
  // Spices
  { group: '🌶️ Spices & Herbs', items: ['Turmeric / Haldi', 'Ginger / Adrak', 'Coriander / Dhaniya', 'Cumin / Jeera', 'Fenugreek / Methi', 'Black Pepper', 'Clove', 'Cinnamon', 'Nutmeg', 'Fennel / Saunf', 'Ajwain'] },
  // Flowers
  { group: '🌸 Flowers', items: ['Rose', 'Marigold', 'Jasmine', 'Chrysanthemum', 'Gerbera', 'Gladiolus', 'Tuberose', 'Lotus'] },
]

const CROP_STAGES = [
  { value: 'seedling', label: '🌱 Seedling (0-3 weeks)', desc: 'Germination and early growth' },
  { value: 'vegetative', label: '🌿 Vegetative (3-8 weeks)', desc: 'Leaf and stem development' },
  { value: 'flowering', label: '🌸 Flowering', desc: 'Bloom and pollination stage' },
  { value: 'fruiting', label: '🍅 Fruiting / Pod Fill', desc: 'Fruit or grain development' },
  { value: 'pre-harvest', label: '🌾 Pre-Harvest', desc: 'Approaching maturity' },
  { value: 'post-harvest', label: '📦 Post-Harvest / Storage', desc: 'Stored or ready to market' },
]

interface AnalysisResult {
  assessment: {
    labels: { name: string; confidence: number }[]
    qualityIndicators: { freshness: number; damage: number; color: string; overallScore: number }
    defects: string[]
    gradeRecommendation?: string   // legacy field, now carries the crop-specific grade
    qualityGrade?: string          // crop-specific grade label, e.g. "FAQ" / "Class I"
    qualityTier?: QualityTier      // universal tier for cross-crop comparison
    qualityScore?: number
    gradeBasis?: string            // one-line reason for the grade
    validGrades?: string[]         // the crop's full grade vocabulary
    confidence: number
    note: string
  }
  aiAdvice?: string
}

const tierConfig: Record<QualityTier, { color: string; bg: string; label: string; icon: string }> = {
  'Premium': { color: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'Premium Quality', icon: '🏆' },
  'Standard': { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'Standard Quality', icon: '✅' },
  'Fair': { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Fair Quality', icon: '⚠️' },
  'Below Standard': { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Below Standard', icon: '🚩' },
}

export default function FarmerQualityAssessment() {
  const [cropType, setCropType] = useState('')
  const [stage, setStage] = useState('')
  const [variety, setVariety] = useState('')
  const [storageDays, setStorageDays] = useState('')
  const [moisturePct, setMoisturePct] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [loadingAdvice, setLoadingAdvice] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handleImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImagePreview(dataUrl)
      // Strip the data URL prefix to get raw base64
      setImageBase64(dataUrl.split(',')[1])
      setResult(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImage(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleImage(file)
  }

  const analyse = async () => {
    if (!imageBase64) { setError('Please upload or capture an image first'); return }
    if (!cropType) { setError('Please select a crop type'); return }
    if (!stage) { setError('Please select the growth stage'); return }
    setError('')
    setAnalyzing(true)
    setResult(null)

    try {
      const res = await apiService.assessProduceQuality(
        imageBase64, cropType, stage,
        variety || undefined,
        storageDays ? parseInt(storageDays) : undefined,
        moisturePct ? parseFloat(moisturePct) : undefined,
      )
      setResult(res)

      // Save to localStorage so listing forms can pre-fill grade
      const grade = res?.assessment?.qualityGrade || res?.assessment?.gradeRecommendation || ''
      const tier = res?.assessment?.qualityTier || (grade ? gradeToTier(grade, cropType) : 'Standard')
      const score = res?.assessment?.qualityIndicators?.overallScore ?? res?.assessment?.qualityScore ?? 70
      if (grade) {
        saveAssessment({
          cropType, qualityGrade: grade, qualityTier: tier,
          qualityScore: score, gradeBasis: res?.assessment?.gradeBasis || '',
          assessedAt: new Date().toISOString(),
          variety: variety || undefined,
          storageDays: storageDays ? parseInt(storageDays) : undefined,
          moisturePct: moisturePct ? parseFloat(moisturePct) : undefined,
        })
      }

      // Fetch AI advice for next steps
      setLoadingAdvice(true)
      try {
        const gradeText = grade || 'Standard'
        const scoreText = score
        const defectsList = Array.isArray(res?.assessment?.defects)
          ? res.assessment.defects.map((d: any) => (typeof d === 'string' ? d : d?.name || d?.defect || JSON.stringify(d))).join(', ')
          : 'none'

        const adviceRes = await apiService.askAIAssistant(
          `I have ${cropType} at the ${stage} stage. Quality assessment shows: grade ${gradeText}, overall score ${scoreText}/100, defects: ${defectsList}. Give me 3 specific actionable steps for improvement, technical treatment, and optimal selling strategy. Keep each step under 25 words.`
        )
        const adviceText = typeof adviceRes === 'string'
          ? adviceRes
          : (adviceRes?.answer || adviceRes?.response || '')
        setResult(prev => prev ? { ...prev, aiAdvice: adviceText } : prev)
      } catch (adviceErr) {
        console.warn('AI advice fetch error:', adviceErr)
      } finally {
        setLoadingAdvice(false)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const reset = () => {
    setImagePreview(null); setImageBase64(null); setResult(null); setError('')
    setCropType(''); setStage(''); setVariety(''); setStorageDays(''); setMoisturePct('')
  }

  const grade = result?.assessment?.qualityGrade || result?.assessment?.gradeRecommendation || 'Standard'
  const tier: QualityTier = result?.assessment?.qualityTier || gradeToTier(grade, cropType)
  const tc = tierConfig[tier] || tierConfig['Standard']
  const validGrades = result?.assessment?.validGrades || getGradesForCrop(cropType)
  const qi = result?.assessment?.qualityIndicators || {
    freshness: 85,
    damage: 10,
    color: 'Natural',
    overallScore: 80,
  }
  const overallScore = typeof qi.overallScore === 'number' ? qi.overallScore : 80
  const freshness = typeof qi.freshness === 'number' ? qi.freshness : 85
  const damage = typeof qi.damage === 'number' ? qi.damage : 10
  const color = typeof qi.color === 'string' ? qi.color : 'Natural'
  const confidence = typeof result?.assessment?.confidence === 'number' ? result.assessment.confidence : 85
  const note = result?.assessment?.note || 'Standard agricultural produce quality assessment.'
  const defects = Array.isArray(result?.assessment?.defects)
    ? result.assessment.defects.map(d => (typeof d === 'string' ? d : (d as any)?.name || (d as any)?.defect || JSON.stringify(d)))
    : []
  const adviceString = typeof result?.aiAdvice === 'string'
    ? result.aiAdvice
    : (result?.aiAdvice as any)?.answer || ''

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Quality Assessment</h1>
            <p className="text-blue-100 text-sm">Powered by Gemini Vision — upload a crop photo at any stage</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {['Seedling health', 'Disease detection', 'Harvest readiness', 'Market grade', 'Storage fitness'].map(tag => (
            <span key={tag} className="px-2.5 py-1 bg-white/15 rounded-full text-xs font-medium">{tag}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left – Input Panel */}
        <div className="space-y-4">
          {/* Crop + Stage selectors */}
          <div className="bg-white rounded-2xl border border-warm-200 p-5 space-y-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Leaf className="h-4 w-4 text-green-600" /> Crop Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type <span className="text-red-500">*</span></label>
              <select
                value={cropType}
                onChange={e => { setCropType(e.target.value); setResult(null) }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select your crop</option>
                {CROP_CATALOG.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Growth Stage <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {CROP_STAGES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => { setStage(s.value); setResult(null) }}
                    className={`text-left p-2.5 rounded-xl border text-xs transition ${
                      stage === s.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-gray-500 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional context — improves accuracy */}
            <div className="pt-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5 text-blue-500" />
                Extra context (optional — improves accuracy)
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Variety / Cultivar</label>
                  <input
                    type="text"
                    value={variety}
                    onChange={e => { setVariety(e.target.value); setResult(null) }}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g. HD-2967, Basmati 1121, Alphonso"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Storage duration (days)</label>
                    <input
                      type="number"
                      min="0" max="365"
                      value={storageDays}
                      onChange={e => { setStorageDays(e.target.value); setResult(null) }}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="0 = just harvested"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Moisture % (if known)</label>
                    <input
                      type="number"
                      min="0" max="100" step="0.1"
                      value={moisturePct}
                      onChange={e => { setMoisturePct(e.target.value); setResult(null) }}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="e.g. 12.5"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Variety, storage days, and moisture help Gemini Vision pick the right grade within this crop's scale
                  (e.g. Wheat: FAQ/Grade A/B/C; Potato: Large/Medium/Small/Chat; Basmati: Premium 1121/Ordinary).
                </p>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-2xl border border-warm-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3"><Camera className="h-4 w-4 text-blue-600" /> Crop Photo</h2>
            
            {!imagePreview ? (
              <div
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-blue-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Click or drag to upload crop photo</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP • Max 5 MB</p>
                <div className="flex justify-center gap-3 mt-4">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                    onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Photo
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition"
                    onClick={e => { e.stopPropagation(); cameraRef.current?.click() }}
                  >
                    <Camera className="h-3.5 w-3.5" /> Take Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="Crop" className="w-full h-56 object-cover rounded-xl" />
                <button
                  onClick={() => { setImagePreview(null); setImageBase64(null); setResult(null) }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                  {cropType || 'Crop'} · {stage || 'Stage'}
                </div>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={analyse}
            disabled={analyzing || !imageBase64 || !cropType || !stage}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            {analyzing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing with Gemini Vision…</>
            ) : (
              <><Sparkles className="h-5 w-5" /> Analyse Crop Quality</>
            )}
          </button>
        </div>

        {/* Right – Results Panel */}
        <div className="space-y-4">
          {!result && !analyzing && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
                <Sparkles className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Gemini Vision Analysis</h3>
              <p className="text-sm text-gray-500 max-w-xs">Upload a photo of your crop at any stage — from seedling to post-harvest — and get instant AI quality analysis with actionable advice.</p>
              <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-xs">
                {['Disease detection', 'Grade recommendation', 'Price readiness', 'Next steps'].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-blue-700 bg-white/80 rounded-lg p-2">
                    <CheckCircle className="h-3.5 w-3.5 text-blue-500" /> {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analyzing && (
            <div className="bg-white rounded-2xl border border-blue-100 p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Gemini is analysing your crop…</p>
              <p className="text-sm text-gray-400 mt-1">Checking quality, detecting defects, recommending grade</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Grade Banner — crop-specific grade + universal tier */}
              <div className={`rounded-2xl border p-5 ${tc.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tc.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Quality Grade · {cropType || 'Produce'}</p>
                      <p className={`text-xl font-bold ${tc.color}`}>{grade}</p>
                      <p className={`text-xs font-medium ${tc.color}`}>{tc.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Overall Score</p>
                    <p className={`text-3xl font-bold ${tc.color}`}>{overallScore}<span className="text-sm">/100</span></p>
                  </div>
                </div>
                {result?.assessment?.gradeBasis && (
                  <p className="text-sm text-gray-600">{result.assessment.gradeBasis}</p>
                )}
                <p className="text-sm text-gray-600">{note}</p>
                {validGrades.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Valid grades for {cropType || 'this crop'}: {validGrades.join(' · ')}
                  </p>
                )}
              </div>

              {/* Quality Metrics */}
              <div className="bg-white rounded-2xl border border-warm-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" /> Quality Indicators</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Freshness', val: freshness, color: 'bg-green-500' },
                    { label: 'Damage Level', val: damage, color: 'bg-red-400', invert: true },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{m.label}</span>
                        <span className="font-semibold">{m.val}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${m.color} h-2 rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, Math.max(0, m.val))}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-gray-600">Colour</span>
                    <span className="font-medium capitalize text-gray-800">{color}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">AI Confidence</span>
                    <span className="font-medium text-gray-800">{confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Defects */}
              {defects.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <h3 className="font-semibold text-red-700 mb-2 text-sm flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Detected Issues</h3>
                  <ul className="space-y-1">
                    {defects.map((d, i) => (
                      <li key={i} className="text-sm text-red-600 flex items-start gap-1.5">
                        <span className="mt-0.5">•</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Advice */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4">
                <h3 className="font-semibold text-green-800 mb-2 text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> AI Recommendations
                  {loadingAdvice && <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin ml-1" />}
                </h3>
                {adviceString ? (
                  <p className="text-sm text-green-700 whitespace-pre-line leading-relaxed">{adviceString}</p>
                ) : loadingAdvice ? (
                  <p className="text-sm text-green-600 italic">Generating personalised advice…</p>
                ) : (
                  <p className="text-sm text-green-700">Based on your crop grade, consider improving storage conditions and targeted treatment before listing.</p>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <button onClick={reset} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  <RefreshCw className="h-4 w-4" /> Analyse Another
                </button>
                <Link to="/farmer/selling-strategy" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition">
                  <TrendingUp className="h-4 w-4" /> Get Selling Strategy
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
