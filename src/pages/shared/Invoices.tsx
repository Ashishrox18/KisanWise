import { useState, useEffect, useMemo } from 'react'
import {
  FileText, Download, Clock, AlertCircle, CheckCircle, Ban, XCircle,
  TrendingUp, Sprout, Star, IndianRupee, BarChart2, PieChart as PieIcon,
  Leaf, Inbox, ShieldCheck,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { apiService } from '../../services/api'
import { gradeToTier } from '../../utils/cropQualityGrades'
import { buildBreakdown } from '../../utils/cropCostEstimator'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) { return `₹${Math.round(n).toLocaleString('en-IN')}` }

function monthKey(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
}

// ── Invoice status ─────────────────────────────────────────────────────────
type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'disputed'

const STATUS_META: Record<InvoiceStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  pending:   { label: 'Pending',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: <Clock      className="h-4 w-4 text-amber-500" /> },
  paid:      { label: 'Paid',      color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  overdue:   { label: 'Overdue',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
  cancelled: { label: 'Cancelled', color: 'text-gray-400',   bg: 'bg-gray-50',   border: 'border-gray-200',  icon: <Ban         className="h-4 w-4 text-gray-400" /> },
  disputed:  { label: 'Disputed',  color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200',icon: <XCircle     className="h-4 w-4 text-purple-500" /> },
}

const NEXT: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
  pending:  ['paid', 'overdue', 'disputed', 'cancelled'],
  overdue:  ['paid', 'disputed', 'cancelled'],
  disputed: ['paid', 'pending', 'cancelled'],
}

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6b7280', '#a855f7']

// ── Tier colour for quality display ─────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  Premium: 'text-green-700 bg-green-50 border-green-200',
  Standard: 'text-blue-700 bg-blue-50 border-blue-200',
  Fair: 'text-amber-700 bg-amber-50 border-amber-200',
  'Below Standard': 'text-red-700 bg-red-50 border-red-200',
}

export default function Invoices() {
  const [invoices, setInvoices]  = useState<any[]>([])
  const [crops, setCrops]        = useState<any[]>([])
  const [loadingInv, setLoadingInv] = useState(true)
  const [loadingCrops, setLoadingCrops] = useState(true)
  const [activeTab, setActiveTab] = useState<'analytics' | 'invoices'>('analytics')
  const [filter, setFilter]      = useState<InvoiceStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [pmMethod, setPmMethod]  = useState('')
  const [pmRef, setPmRef]        = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiService.getInvoices()
        // auto-flag overdue (client-side only — not a payment assumption)
        const now = Date.now()
        setInvoices(
          (res.invoices || []).map((inv: any) =>
            inv.status === 'pending' && new Date(inv.dueDate).getTime() < now
              ? { ...inv, status: 'overdue' }
              : inv,
          ),
        )
      } catch { /* silent */ } finally { setLoadingInv(false) }
    })()
    ;(async () => {
      try {
        const res = await apiService.getCrops()
        setCrops(res.crops || [])
      } catch { /* silent */ } finally { setLoadingCrops(false) }
    })()
  }, [])

  const handleStatusUpdate = async (invoiceId: string, status: InvoiceStatus) => {
    setUpdatingId(invoiceId)
    try {
      await apiService.updateInvoiceStatus(invoiceId, {
        status,
        paymentDate: status === 'paid' ? new Date().toISOString() : undefined,
        paymentMethod: pmMethod || undefined,
        transactionId: pmRef || undefined,
      })
      setPmMethod(''); setPmRef(''); setExpandedId(null)
      const res = await apiService.getInvoices()
      setInvoices(res.invoices || [])
    } catch { alert('Failed to update — please try again.') }
    finally { setUpdatingId(null) }
  }

  // ── SECTION 1: Invoice analytics (payment-neutral) ─────────────────────
  const invAnalytics = useMemo(() => {
    const total    = invoices.length
    const allAmt   = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0)
    const allSub   = invoices.reduce((s, i) => s + (i.subtotal || i.totalAmount || 0), 0)
    const allTax   = invoices.reduce((s, i) => s + (i.tax || 0), 0)
    // Profit estimate from invoices: subtotal − tax across ALL invoices
    // (not just "paid" — we don't assume payment)
    const profitEst = allSub - allTax
    // Tax benefit vs flat 18% GST on same subtotal
    const taxSaving = Math.max(0, allSub * 0.18 - allTax)
    const avgDeal = total ? allAmt / total : 0

    // Count by invoice type
    const byType: Record<string, number> = {}
    invoices.forEach(i => { byType[i.invoiceType || 'other'] = (byType[i.invoiceType || 'other'] || 0) + 1 })

    // Status breakdown
    const byStatus: Record<string, number> = {}
    invoices.forEach(i => { byStatus[i.status || 'pending'] = (byStatus[i.status || 'pending'] || 0) + 1 })

    // Invoice count by month (last 6)
    const buckets: Record<string, number> = {}
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setMonth(d.getMonth() - m)
      buckets[d.toLocaleString('en-IN', { month: 'short', year: '2-digit' })] = 0
    }
    invoices.forEach(i => {
      const k = monthKey(i.createdAt)
      if (k in buckets) buckets[k]++
    })
    const byMonth = Object.entries(buckets).map(([month, count]) => ({ month, count }))

    const statusDist = Object.entries(byStatus).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)

    return { total, allAmt, allSub, allTax, profitEst, taxSaving, avgDeal, byMonth, statusDist, byType }
  }, [invoices])

  // ── SECTION 2: Crops benefited analytics ──────────────────────────────
  const cropAnalytics = useMemo(() => {
    const active   = crops.filter(c => !['sold', 'finished', 'cancelled'].includes(c.status))
    const byStage: Record<string, number> = {}
    active.forEach(c => { const s = c.status || 'growing'; byStage[s] = (byStage[s] || 0) + 1 })

    // Quality tier distribution
    const tierCounts: Record<string, number> = { Premium: 0, Standard: 0, Fair: 0, 'Below Standard': 0 }
    active.forEach(c => {
      const g = c.qualityGrade || ''
      const name = c.name || c.cropType || ''
      const tier = g ? gradeToTier(g, name) : 'Standard'
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
    })
    const tierData = Object.entries(tierCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))

    // Water-need risk distribution
    const waterRisk = { High: 0, Medium: 0, Low: 0 }
    active.forEach(c => {
      const w = (c.waterNeed || 'Medium') as keyof typeof waterRisk
      waterRisk[w] = (waterRisk[w] || 0) + 1
    })

    // Total expected revenue from planted crops
    const expectedRevenue = active.reduce((s, c) => s + (Number(c.expectedRevenue) || 0), 0)

    // Total area under cultivation
    const totalArea = active.reduce((s, c) => s + (Number(c.area) || 0), 0)

    return { total: active.length, byStage, tierCounts, tierData, waterRisk, expectedRevenue, totalArea }
  }, [crops])

  // ── SECTION 3: Cost savings from budget planning ───────────────────────
  const costAnalytics = useMemo(() => {
    let totalTypicalCost = 0
    let totalOptimisedCost = 0
    const perCrop: Array<{ name: string; typical: number; optimised: number; saving: number; area: number }> = []

    crops.filter(c => !['sold', 'finished', 'cancelled'].includes(c.status)).forEach(c => {
      const name = c.name || c.cropType || ''
      const area = Number(c.area) || 1
      const season = c.season || 'rabi'
      const water = c.waterNeed || 'moderate'
      if (!name) return
      const bd = buildBreakdown(name, area, season, water, Number(c.expectedBudget) || 0)
      totalTypicalCost  += bd.totalBase
      totalOptimisedCost += bd.totalLow
      perCrop.push({ name, area, typical: bd.totalBase, optimised: bd.totalLow, saving: bd.totalBase - bd.totalLow })
    })
    const totalSaving = totalTypicalCost - totalOptimisedCost
    const savingPct   = totalTypicalCost ? Math.round((totalSaving / totalTypicalCost) * 100) : 0
    return { totalTypicalCost, totalOptimisedCost, totalSaving, savingPct, perCrop }
  }, [crops])

  const filtered = useMemo(() =>
    filter === 'all' ? invoices : invoices.filter(i => i.status === filter),
  [invoices, filter])

  const loading = loadingInv || loadingCrops

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-green-700 rounded-2xl p-5 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Invoices</h1>
          <p className="text-white/60 text-sm mt-0.5">Crop performance, cost savings, and invoice records</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{crops.filter(c => !['sold','finished','cancelled'].includes(c.status)).length}</p>
          <p className="text-white/60 text-xs">active crops tracked</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['analytics', 'invoices'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'analytics' ? '📊 Analytics' : '🧾 Invoices'}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          ANALYTICS TAB
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {loading && (
            <div className="text-center py-8 text-gray-400 text-sm">Loading analytics…</div>
          )}

          {/* ── A: Crops benefited ─────────────────────────────────── */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Sprout className="h-5 w-5 text-emerald-600" /> Crops benefited
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={<Sprout className="h-5 w-5 text-emerald-600"/>}
                label="Active crops" value={String(cropAnalytics.total)}
                sub="Currently growing or planned"
                color="border-emerald-200 bg-emerald-50"/>
              <Kpi icon={<IndianRupee className="h-5 w-5 text-blue-600"/>}
                label="Expected revenue" value={fmt(cropAnalytics.expectedRevenue)}
                sub="Across all active crops"
                color="border-blue-200 bg-blue-50"/>
              <Kpi icon={<Leaf className="h-5 w-5 text-teal-600"/>}
                label="Total land area" value={`${cropAnalytics.totalArea.toFixed(1)} ac`}
                sub="Under active cultivation"
                color="border-teal-200 bg-teal-50"/>
              <Kpi icon={<Star className="h-5 w-5 text-amber-600"/>}
                label="Premium quality crops"
                value={String(cropAnalytics.tierCounts['Premium'] || 0)}
                sub={`of ${cropAnalytics.total} crops graded`}
                color="border-amber-200 bg-amber-50"/>
            </div>

            {/* Quality tier + growth stage charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Quality tiers donut */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500"/> Quality tier distribution
                </h3>
                {cropAnalytics.tierData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={140}>
                      <PieChart>
                        <Pie data={cropAnalytics.tierData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="value">
                          {cropAnalytics.tierData.map((_, i) => (
                            <Cell key={i} fill={['#22c55e','#3b82f6','#f59e0b','#ef4444'][i % 4]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 flex-1">
                      {cropAnalytics.tierData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{background:['#22c55e','#3b82f6','#f59e0b','#ef4444'][i%4]}}/>
                            {d.name}
                          </span>
                          <span className="font-semibold text-gray-700">{d.value} crop{d.value !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Empty text="No crops with quality grades yet" />
                )}
              </div>

              {/* Growth stage bar */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5 text-emerald-500"/> Crops by growth stage
                </h3>
                {Object.keys(cropAnalytics.byStage).length > 0 ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={Object.entries(cropAnalytics.byStage).map(([stage, count]) => ({ stage, count }))}
                      margin={{top:0,right:0,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="stage" tick={{fontSize:10, fill:'#64748b'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={{fontSize:11, borderRadius:8, border:'1px solid #e2e8f0'}}/>
                      <Bar dataKey="count" name="Crops" fill="#34d399" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty text="No active crops to show" />
                )}
              </div>
            </div>

            {/* Per-crop quality table */}
            {crops.filter(c => c.qualityGrade).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mt-4">
                <h3 className="text-xs font-semibold text-gray-700 mb-3">Crop quality detail</h3>
                <div className="space-y-1">
                  {crops.filter(c => !['sold','finished','cancelled'].includes(c.status)).map(c => {
                    const name  = c.name || c.cropType || '—'
                    const grade = c.qualityGrade || ''
                    const tier  = grade ? gradeToTier(grade, name) : null
                    return (
                      <div key={c.id} className="flex items-center justify-between py-1.5 text-xs border-b border-gray-50 last:border-0">
                        <span className="font-medium text-gray-800">{name} <span className="text-gray-400 font-normal">· {c.area || '?'} ac</span></span>
                        <div className="flex items-center gap-2">
                          {grade && <span className="text-gray-500">{grade}</span>}
                          {tier && (
                            <span className={`px-2 py-0.5 rounded-full font-semibold border ${TIER_COLOR[tier] || ''}`}>
                              {tier}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ── B: Cost saved from budget planning ─────────────────── */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-600"/> Cost savings from budget planning
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Kpi icon={<IndianRupee className="h-5 w-5 text-gray-600"/>}
                label="Typical input cost" value={fmt(costAnalytics.totalTypicalCost)}
                sub="Without subsidies / bulk purchase"
                color="border-gray-200 bg-gray-50"/>
              <Kpi icon={<TrendingUp className="h-5 w-5 text-green-600"/>}
                label="Optimised cost" value={fmt(costAnalytics.totalOptimisedCost)}
                sub="With subsidies &amp; bulk purchase"
                color="border-green-200 bg-green-50"/>
              <Kpi icon={<Star className="h-5 w-5 text-violet-600"/>}
                label="Potential saving" value={`${fmt(costAnalytics.totalSaving)} (${costAnalytics.savingPct}%)`}
                sub="By planning vs unplanned retail"
                color="border-violet-200 bg-violet-50"/>
            </div>

            {costAnalytics.perCrop.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mt-4">
                <h3 className="text-xs font-semibold text-gray-700 mb-3">Saving per crop</h3>
                <div className="space-y-2">
                  {costAnalytics.perCrop.map(c => (
                    <div key={c.name+c.area} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-gray-800">{c.name} <span className="text-gray-400 font-normal">· {c.area} ac</span></span>
                        <span className="text-violet-600 font-semibold">{fmt(c.saving)} saved</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-violet-400 h-1.5 rounded-full" style={{width:`${c.typical ? Math.round((c.saving/c.typical)*100) : 0}%`}}/>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Typical {fmt(c.typical)}</span>
                        <span>Optimised {fmt(c.optimised)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── C: Invoice revenue & profit ────────────────────────── */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600"/> Invoice revenue generated
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Kpi icon={<IndianRupee className="h-5 w-5 text-emerald-600"/>}
                label="Total invoiced" value={fmt(invAnalytics.allAmt)}
                sub={`${invAnalytics.total} invoices generated`}
                color="border-emerald-200 bg-emerald-50"/>
              <Kpi icon={<TrendingUp className="h-5 w-5 text-blue-600"/>}
                label="Net profit estimate" value={fmt(invAnalytics.profitEst)}
                sub="Invoice subtotal minus tax"
                color="border-blue-200 bg-blue-50"/>
              <Kpi icon={<Star className="h-5 w-5 text-teal-600"/>}
                label="Tax savings (agri rate)" value={fmt(invAnalytics.taxSaving)}
                sub="vs standard 18% GST on same revenue"
                color="border-teal-200 bg-teal-50"/>
            </div>

            {/* Invoice-by-month bar + status pie */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5 text-slate-500"/> Invoices generated (last 6 months)
                </h3>
                {invAnalytics.byMonth.some(d => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={invAnalytics.byMonth} margin={{top:0,right:0,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="month" tick={{fontSize:10, fill:'#64748b'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={{fontSize:11, borderRadius:8, border:'1px solid #e2e8f0'}}/>
                      <Bar dataKey="count" name="Invoices" fill="#6366f1" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty text="No invoices yet" />
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <PieIcon className="h-3.5 w-3.5 text-blue-500"/> Invoice status
                </h3>
                {invAnalytics.statusDist.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={140}>
                      <PieChart>
                        <Pie data={invAnalytics.statusDist} cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="value">
                          {invAnalytics.statusDist.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 flex-1">
                      {invAnalytics.statusDist.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                            <span className="capitalize">{d.name}</span>
                          </span>
                          <span className="font-semibold text-gray-700">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Empty text="No invoices yet" />
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          INVOICES TAB
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'paid', 'overdue', 'disputed', 'cancelled'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  filter === s ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s === 'all' ? 'All' : s} ({s === 'all' ? invoices.length : invoices.filter(i => i.status === s).length})
              </button>
            ))}
          </div>

          {loadingInv ? (
            <div className="card text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-3"/>
              <p className="text-gray-500 text-sm">Loading invoices…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3"/>
              <p className="text-gray-500 text-sm">No {filter === 'all' ? '' : filter} invoices found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(invoice => {
                const st  = STATUS_META[invoice.status as InvoiceStatus] || STATUS_META.pending
                const exp = expandedId === invoice.id
                const nxt = NEXT[invoice.status as InvoiceStatus] || []
                return (
                  <div key={invoice.id} className={`bg-white rounded-xl border ${st.border} shadow-sm overflow-hidden`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="font-semibold text-gray-900 text-sm">{invoice.invoiceNumber}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
                              {st.icon} {st.label}
                            </span>
                            <span className="text-[11px] text-gray-400 capitalize">{invoice.invoiceType} invoice</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                            <span><span className="text-gray-400">Total </span><span className="font-semibold text-gray-900">{fmt(invoice.totalAmount)}</span></span>
                            <span><span className="text-gray-400">Subtotal </span>{fmt(invoice.subtotal || invoice.totalAmount)}</span>
                            <span><span className="text-gray-400">Tax </span>{fmt(invoice.tax || 0)}</span>
                            <span><span className="text-gray-400">Due </span>
                              <span className={invoice.status === 'overdue' ? 'text-red-600 font-semibold' : ''}>
                                {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                              </span>
                            </span>
                          </div>
                          {invoice.status === 'paid' && invoice.paymentDate && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Paid {new Date(invoice.paymentDate).toLocaleDateString('en-IN')}
                              {invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ''}
                              {invoice.transactionId ? ` · Ref ${invoice.transactionId}` : ''}
                            </p>
                          )}
                          {invoice.items?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-50 space-y-0.5">
                              {invoice.items.slice(0, 2).map((item: any, i: number) => (
                                <p key={i} className="text-xs text-gray-500">
                                  • {item.description} — {item.quantity} {item.unit} @ {fmt(item.pricePerUnit)}/{item.unit}
                                </p>
                              ))}
                              {invoice.items.length > 2 && <p className="text-xs text-gray-400">+{invoice.items.length - 2} more items</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {nxt.length > 0 && (
                            <button onClick={() => setExpandedId(exp ? null : invoice.id)}
                              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">
                              Update status
                            </button>
                          )}
                          <button className="p-1.5 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg" title="Download">
                            <Download className="h-3.5 w-3.5"/>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Status panel */}
                    {exp && nxt.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-700">Update status — {invoice.invoiceNumber}</p>
                        <div className="flex flex-wrap gap-2">
                          <input value={pmMethod} onChange={e => setPmMethod(e.target.value)}
                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg flex-1 min-w-[140px]"
                            placeholder="Payment method (NEFT / UPI / Cash) — optional"/>
                          <input value={pmRef} onChange={e => setPmRef(e.target.value)}
                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg flex-1 min-w-[140px]"
                            placeholder="Transaction / UTR ID — optional"/>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {nxt.map(next => (
                            <button key={next} disabled={updatingId === invoice.id}
                              onClick={() => handleStatusUpdate(invoice.id, next)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-50 ${
                                next === 'paid' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' :
                                next === 'overdue' ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' :
                                next === 'cancelled' ? 'bg-gray-500 text-white border-gray-500' :
                                'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}>
                              {updatingId === invoice.id ? 'Saving…' : `Mark as ${STATUS_META[next].label}`}
                            </button>
                          ))}
                          <button onClick={() => setExpandedId(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Small reusable sub-components ──────────────────────────────────────────
function Kpi({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center justify-between mb-1.5">{icon}<p className="text-xs font-medium text-gray-600 text-right">{label}</p></div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="h-36 flex flex-col items-center justify-center text-gray-400 gap-2">
      <Inbox className="h-7 w-7 opacity-40"/>
      <p className="text-xs">{text}</p>
    </div>
  )
}
