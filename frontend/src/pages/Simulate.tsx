import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Pin } from 'lucide-react'
import { PageHeader, Panel, Empty } from '../components/ui'
import { MaccChart } from '../components/MaccChart'
import { simulate, pinSimulation, getInterventions, getSimulations } from '../lib/api'
import { inr, tonnes } from '../lib/format'
import { DEMO_BASELINE, DEMO_COMPANY, useSession } from '../lib/session'
import type {
  Intervention,
  SensitivityRow,
  Simulation,
  SimulationResponse,
} from '../lib/types'

const BUDGET_MIN = 0.25
const BUDGET_MAX = 5

function formatCrore(v: number) {
  return v >= 1 ? `₹${v.toFixed(2)} Cr` : `₹${(v * 100).toFixed(0)} L`
}

function RangeControl({
  id,
  label,
  valueText,
  min,
  max,
  step,
  value,
  onChange,
  left,
  right,
  big = false,
}: {
  id: string
  label: string
  valueText: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  left?: string
  right?: string
  big?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[12.5px] font-medium text-[#475569]">
          {label}
        </label>
        {!big && (
          <span className="num text-[13px] font-bold text-[#0F172A]">{valueText}</span>
        )}
      </div>
      {big && (
        <div className="num mt-1 text-[26px] font-bold leading-none text-[#0F172A]">
          {valueText}
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-2"
        style={{ '--fill': `${pct}%` } as CSSProperties}
      />
      {(left || right) && (
        <div className="num mt-1 flex justify-between text-[11px] font-semibold text-[#64748B]">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  )
}

export function Simulate() {
  const navigate = useNavigate()
  const { company, baseline, loadDemo } = useSession()

  const activeCompany = company || DEMO_COMPANY
  const activeBaseline = baseline || DEMO_BASELINE

  const [budget, setBudget] = useState(2.2)
  const [paybackCeiling, setPaybackCeiling] = useState(5)
  const [tariff, setTariff] = useState(activeCompany.powerTariff ?? 8)
  const [escalation, setEscalation] = useState(5)
  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  // Applied parameters (currently computed & rendered)
  const [appliedParams, setAppliedParams] = useState({
    budget: 2.2,
    paybackCeiling: 5,
    tariff: activeCompany.powerTariff ?? 8,
    escalation: 5,
    toggles: {} as Record<string, boolean>,
  })

  const [result, setResult] = useState<SimulationResponse | null>(null)
  const [library, setLibrary] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pinned, setPinned] = useState<Simulation[]>([])
  const [savingPin, setSavingPin] = useState(false)
  const [pinSuccess, setPinSuccess] = useState<string | null>(null)

  const seq = useRef(0)
  const initialRan = useRef(false)
  const pinnedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!company) {
      loadDemo()
    } else {
      getSimulations(company._id)
        .then((list) => {
          const pinnedOnly = list.filter((s) => s.pinned)
          if (pinnedOnly.length > 0) setPinned(pinnedOnly)
        })
        .catch(() => {})
    }
  }, [company, loadDemo])

  useEffect(() => {
    getInterventions(activeCompany.sector)
      .then(setLibrary)
      .catch(() => {})
  }, [activeCompany.sector])

  // Execute simulation with explicit 2-second realistic optimization delay
  const executeSimulation = useCallback(
    async (params: typeof appliedParams, withDelay = false) => {
      const mySeq = ++seq.current
      setLoading(true)
      setError(null)

      try {
        if (withDelay) {
          await new Promise((r) => setTimeout(r, 2000))
        }

        const res = await simulate({
          companyId: activeCompany._id,
          baselineId: activeBaseline._id,
          baselineEmissions: activeBaseline.totalEmissions,
          budget: Math.round(params.budget * 1e7),
          paybackCeiling: params.paybackCeiling,
          tariff: params.tariff,
          tariffEscalation: params.escalation,
          sector: activeCompany.sector,
          toggles: params.toggles,
        })
        if (mySeq === seq.current) {
          setResult(res)
          setAppliedParams(params)
        }
      } catch (err) {
        const msg =
          (err as { response?: { data?: { error?: string } } }).response?.data
            ?.error || 'Simulation failed.'
        if (mySeq === seq.current) setError(msg)
      } finally {
        if (mySeq === seq.current) setLoading(false)
      }
    },
    [activeCompany, activeBaseline],
  )

  // Run initial simulation once on mount
  useEffect(() => {
    if (!initialRan.current) {
      initialRan.current = true
      executeSimulation(appliedParams, false)
    }
  }, [executeSimulation, appliedParams])

  const hasPendingChanges =
    budget !== appliedParams.budget ||
    paybackCeiling !== appliedParams.paybackCeiling ||
    tariff !== appliedParams.tariff ||
    escalation !== appliedParams.escalation ||
    JSON.stringify(toggles) !== JSON.stringify(appliedParams.toggles)

  function onRunSimulation() {
    executeSimulation(
      {
        budget,
        paybackCeiling,
        tariff,
        escalation,
        toggles,
      },
      true,
    )
  }

  const sim = result?.simulation
  const all = library.length > 0 ? library : (result?.allInterventions ?? [])
  const selectedIds = sim?.selectedInterventions.map((i) => i.id) ?? []
  const enabledCount = all.filter((i) => toggles[i.id] !== false).length

  async function persistSimulation() {
    const res = await simulate({
      companyId: activeCompany._id,
      baselineId: activeBaseline._id,
      baselineEmissions: activeBaseline.totalEmissions,
      budget: Math.round(budget * 1e7),
      paybackCeiling,
      tariff,
      tariffEscalation: escalation,
      sector: activeCompany.sector,
      toggles,
      persist: true,
    })
    return res
  }

  async function onPin() {
    if (!sim) return
    setSavingPin(true)
    setError(null)
    setPinSuccess(null)
    try {
      const res = await persistSimulation()
      const id = res?.simulation._id
      if (!id) throw new Error('no id')
      const planName = `Plan ${String.fromCharCode(65 + pinned.length)} (${formatCrore(budget)})`
      const saved = await pinSimulation(id, planName)
      setPinned((p) => [saved, ...p])
      setPinSuccess(`Saved as ${planName}!`)

      // Auto-scroll to Pinned Plans section
      setTimeout(() => {
        pinnedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)

      setTimeout(() => setPinSuccess(null), 4000)
    } catch {
      setError('Could not pin this plan.')
    } finally {
      setSavingPin(false)
    }
  }

  async function onBuildReport() {
    if (!sim) return
    setSavingPin(true)
    try {
      const res = await persistSimulation()
      if (res?.simulation._id) {
        sessionStorage.setItem('carbontwin.simulationId', res.simulation._id)
      }
      navigate('/report')
    } catch {
      setError('Could not open the report.')
    } finally {
      setSavingPin(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Investment simulation"
        description="Configure capital and operational constraints. The knapsack decision engine computes the highest-ROI green portfolio."
        action={
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onPin}
                disabled={!sim || savingPin}
                className="btn btn-secondary shadow-sm hover:border-[#2563EB]"
              >
                <Pin size={15} className={savingPin ? 'animate-bounce text-[#2563EB]' : 'text-[#2563EB]'} />
                {savingPin ? 'Pinning…' : 'Pin as plan'}
              </button>
              <button
                onClick={onBuildReport}
                disabled={!sim || savingPin}
                className="btn btn-primary shadow-sm"
              >
                Build report
                <ArrowRight size={15} />
              </button>
            </div>
            {pinSuccess && (
              <span className="flex items-center gap-1.5 rounded-full border border-[#86EFAC] bg-[#F0FDF4] px-2.5 py-0.5 text-[11.5px] font-bold text-[#16A34A] shadow-xs">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                  <path d="M3 8.5 6 11.5 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {pinSuccess}
              </span>
            )}
          </div>
        }
      />

      {/* Top Level: 4 Key Result KPI Cards */}
      {sim && sim.selectedInterventions.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <div className="rounded-[8px] border-2 border-[#93C5FD] bg-[#EFF6FF] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#1E40AF]">
                Capital Deployed
              </span>
              <span className="rounded-full border border-[#93C5FD] bg-white px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">
                Budget {formatCrore(budget)}
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="num text-[28px] font-bold leading-none text-[#1E3A8A]">
                {inr(sim.totalCapex)}
              </span>
            </div>
            <p className="mt-2 text-[12px] font-medium text-[#3B82F6]">
              {Math.round((sim.totalCapex / (budget * 1e7)) * 100)}% budget utilized
            </p>
          </div>

          <div className="rounded-[8px] border-2 border-[#86EFAC] bg-[#F0FDF4] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#166534]">
                CO₂ Abatement
              </span>
              <span className="rounded-full border border-[#86EFAC] bg-white px-2 py-0.5 text-[11px] font-bold text-[#16A34A]">
                Optimal
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="num text-[28px] font-bold leading-none text-[#14532D]">
                {tonnes(sim.totalAbatement)}
              </span>
              <span className="text-[13px] font-bold text-[#16A34A]">tCO₂e/yr</span>
            </div>
            <p className="mt-2 text-[12px] font-medium text-[#15803D]">
              {(
                (sim.totalAbatement / activeBaseline.totalEmissions) *
                100
              ).toFixed(1)}
              % cut from annual baseline
            </p>
          </div>

          <div className="rounded-[8px] border-2 border-[#CBD5E1] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#475569]">
                Annual Savings
              </span>
              <span className="rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-bold text-[#16A34A]">
                Recurring
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="num text-[28px] font-bold leading-none text-[#16A34A]">
                {inr(sim.totalSavings)}
              </span>
              <span className="text-[13px] font-semibold text-[#64748B]">/ year</span>
            </div>
            <p className="mt-2 text-[12px] font-medium text-[#64748B]">
              Power & fuel operating savings
            </p>
          </div>

          <div className="rounded-[8px] border-2 border-[#CBD5E1] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#475569]">
                Blended Payback
              </span>
              <span className="rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-bold text-[#0F172A]">
                Ceiling {paybackCeiling}y
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="num text-[28px] font-bold leading-none text-[#0F172A]">
                {sim.blendedPayback}
              </span>
              <span className="text-[13px] font-semibold text-[#64748B]">years</span>
            </div>
            <p className="mt-2 text-[12px] font-medium text-[#64748B]">
              Total capex amortized by savings
            </p>
          </div>
        </div>
      )}

      {/* Main 2-Column Balanced Workspace */}
      <div className="grid items-start gap-6 xl:grid-cols-[330px_1fr]">
        {/* Left Column: Constraints & Controls */}
        <div className="space-y-4">
          <div className="card overflow-hidden border-2 border-[#CBD5E1]">
            <header className="flex h-11 items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4">
              <h2 className="panel-title">Assumptions & Controls</h2>
              {loading && (
                <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2563EB]">
                  <svg className="h-3.5 w-3.5 animate-spin text-[#2563EB]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Calculating…
                </span>
              )}
            </header>

            <div className="space-y-4 p-4">
              {/* Primary Run Trigger Button */}
              <div className="rounded-[6px] border border-[#CBD5E1] bg-[#F1F5F9] p-2.5">
                <button
                  onClick={onRunSimulation}
                  disabled={loading}
                  className={`btn h-10 w-full text-[13px] font-bold shadow-sm transition-all ${
                    hasPendingChanges
                      ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] ring-2 ring-[#93C5FD] ring-offset-1'
                      : 'bg-[#0F172A] text-white hover:bg-[#1E293B]'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Optimizing (2s)…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                        <polygon points="4,2 14,8 4,14" fill="currentColor" />
                      </svg>
                      {hasPendingChanges ? 'Run simulation with changes' : 'Re-run simulation'}
                    </span>
                  )}
                </button>
                {hasPendingChanges && !loading && (
                  <p className="mt-1.5 text-center text-[11px] font-bold text-[#2563EB]">
                    ● Parameters modified. Click to calculate.
                  </p>
                )}
              </div>

              {/* Sliders */}
              <RangeControl
                id="budget"
                label="Capital budget"
                valueText={formatCrore(budget)}
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={0.05}
                value={budget}
                onChange={setBudget}
                left="₹25 L"
                right="₹5 Cr"
                big
              />

              <div className="h-px bg-line" />

              <RangeControl
                id="payback"
                label="Payback ceiling"
                valueText={`${paybackCeiling} yrs`}
                min={1}
                max={8}
                step={0.5}
                value={paybackCeiling}
                onChange={setPaybackCeiling}
              />

              <RangeControl
                id="tariff"
                label="Power tariff"
                valueText={`₹${tariff.toFixed(1)}/kWh`}
                min={6}
                max={12}
                step={0.1}
                value={tariff}
                onChange={setTariff}
              />

              <RangeControl
                id="esc"
                label="Tariff escalation"
                valueText={`${escalation}%/yr`}
                min={0}
                max={12}
                step={1}
                value={escalation}
                onChange={setEscalation}
              />

              <div className="h-px bg-line" />

              {/* Toggles */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-[12.5px] font-semibold text-[#334155]">
                    Candidate Measures
                  </span>
                  <span className="num text-[12px] font-bold text-[#64748B]">
                    {enabledCount}/{all.length} active
                  </span>
                </div>
                <ul className="divide-y divide-[#F1F5F9] rounded-[6px] border border-[#E2E8F0] bg-white">
                  {all.map((i: Intervention) => {
                    const checked = toggles[i.id] !== false
                    return (
                      <li key={i.id} className="p-2.5">
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setToggles((t) => ({
                                ...t,
                                [i.id]: e.target.checked,
                              }))
                            }
                            className="checkbox mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className={`block text-[12.5px] leading-tight ${
                                checked ? 'font-semibold text-[#0F172A]' : 'text-[#94A3B8]'
                              }`}
                            >
                              {i.name}
                            </span>
                            <span className="num mt-0.5 block text-[11px] text-[#64748B]">
                              {inr(i.capex)} · {i.co2Abated}t · {i.payback}y
                            </span>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* Left Out / Excluded Card */}
          {sim && sim.excludedInterventions.length > 0 && (
            <Panel title="Screened out & Why" flush>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <tbody>
                    {sim.excludedInterventions.map((e) => (
                      <tr key={e.id}>
                        <td className="text-[12.5px] font-semibold text-[#334155]">
                          {e.name}
                        </td>
                        <td className="text-right text-[12px] font-medium text-[#64748B]">
                          {e.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>

        {/* Right Column: Visualization & Structured Tables */}
        <div className="min-w-0 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-[6px] border border-red/30 border-l-[4px] border-l-red bg-red/10 p-3 text-[13px] font-medium text-red"
            >
              {error}
            </div>
          )}

          {/* Upright Graph */}
          <Panel
            title="Abatement potential by measure"
            meta="Annual carbon reduction (tCO₂e) with investment status"
          >
            <MaccChart
              interventions={all}
              selectedIds={selectedIds}
              height={320}
            />
          </Panel>

          {/* Selected Interventions Table */}
          {sim && sim.selectedInterventions.length > 0 ? (
            <Panel
              title="Selected portfolio composition"
              meta={`${sim.selectedInterventions.length} projects recommended`}
              flush
            >
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Intervention</th>
                      <th className="text-right">Capex</th>
                      <th className="text-right">Abatement</th>
                      <th className="text-right">Annual Savings</th>
                      <th className="text-right">Payback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sim.selectedInterventions.map((i) => (
                      <tr key={i.id}>
                        <td className="whitespace-nowrap font-semibold text-[#0F172A]">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                            {i.name}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap text-right font-medium text-[#475569]">
                          {inr(i.capex)}
                        </td>
                        <td className="num whitespace-nowrap text-right font-bold text-[#0F172A]">
                          {tonnes(i.co2Abated)} tCO₂e
                        </td>
                        <td className="num whitespace-nowrap text-right font-bold text-[#16A34A]">
                          {inr(i.annualSavings)}
                        </td>
                        <td className="num whitespace-nowrap text-right font-semibold text-[#475569]">
                          {i.payback} yrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F8FAFC]">
                      <td className="font-bold text-[#0F172A]">Total Portfolio</td>
                      <td className="num text-right font-bold text-[#0F172A]">
                        {inr(sim.totalCapex)}
                      </td>
                      <td className="num text-right font-bold text-[#0F172A]">
                        {tonnes(sim.totalAbatement)} tCO₂e
                      </td>
                      <td className="num text-right font-bold text-[#16A34A]">
                        {inr(sim.totalSavings)}
                      </td>
                      <td className="num text-right font-bold text-[#0F172A]">
                        {sim.blendedPayback} yrs
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Panel>
          ) : (
            <Panel title="Recommended portfolio">
              <Empty
                title="No portfolio fits this budget."
                body="Raise the capital budget or extend the payback ceiling to unlock projects."
              />
            </Panel>
          )}

          {/* 2-Column Grid: 5-Year Projection & Sensitivity Analysis */}
          <div className="grid gap-5 xl:grid-cols-2">
            {sim && sim.projection.length > 0 && (
              <Panel
                title="Five-year projection"
                meta={`${escalation}% tariff escalation`}
                flush
              >
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th className="text-right">Emissions</th>
                        <th className="text-right">Annual Saving</th>
                        <th className="text-right">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.projection.map((p) => (
                        <tr key={p.year}>
                          <td className="num font-semibold text-[#475569]">{p.year}</td>
                          <td className="num text-right font-medium text-[#0F172A]">
                            {tonnes(p.emissions)} t
                          </td>
                          <td className="num text-right font-bold text-[#16A34A]">
                            {inr(p.savings)}
                          </td>
                          <td className="num text-right font-semibold text-[#0F172A]">
                            {inr(p.cumulative)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {result && result.sensitivity.length > 0 && (
              <Panel title="Sensitivity analysis" meta="Payback variance" flush>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Assumption Shift</th>
                        <th className="text-right">Payback</th>
                        <th className="text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sensitivity.map((s: SensitivityRow) => (
                        <tr key={s.assumption}>
                          <td className="text-[12.5px] font-semibold text-[#334155]">
                            {s.assumption}
                          </td>
                          <td className="num text-right font-bold text-[#0F172A]">
                            {s.payback} yrs
                          </td>
                          <td
                            className={`num text-right font-bold ${
                              s.delta > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
                            }`}
                          >
                            {s.delta > 0 ? '+' : ''}
                            {s.delta} yrs
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </div>

          {/* Pinned Plans Section - High-Profile Comparison Hub */}
          <div ref={pinnedRef} className="scroll-mt-6">
            {pinned.length > 0 && (
              <Panel
                title="Pinned Plans & Comparison Hub"
                meta={`${pinned.length} saved portfolio${pinned.length > 1 ? 's' : ''} ready for review`}
                accent
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pinned.map((p) => (
                    <div
                      key={p._id}
                      className="group relative rounded-[8px] border-2 border-[#CBD5E1] bg-white p-4 shadow-sm transition-all hover:border-[#2563EB] hover:shadow-md"
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                        <div className="flex items-center gap-1.5">
                          <Pin size={14} className="text-[#2563EB]" />
                          <span className="text-[13.5px] font-bold text-[#0F172A]">
                            {p.label}
                          </span>
                        </div>
                        <span className="num rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2.5 py-0.5 text-[11.5px] font-bold text-[#2563EB]">
                          {formatCrore(p.budget / 1e7)}
                        </span>
                      </div>
                      <dl className="space-y-2 text-[12.5px]">
                        <div className="flex items-baseline justify-between">
                          <dt className="font-medium text-[#64748B]">Capital deployed</dt>
                          <dd className="num font-bold text-[#0F172A]">{inr(p.totalCapex)}</dd>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <dt className="font-medium text-[#64748B]">CO₂ abated</dt>
                          <dd className="num font-bold text-[#0F172A]">
                            {tonnes(p.totalAbatement)} <span className="text-[11px] font-normal text-[#64748B]">t/yr</span>
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <dt className="font-medium text-[#64748B]">Annual savings</dt>
                          <dd className="num font-bold text-[#16A34A]">{inr(p.totalSavings)}</dd>
                        </div>
                        <div className="flex items-baseline justify-between border-t border-[#F1F5F9] pt-1.5">
                          <dt className="font-medium text-[#64748B]">Blended payback</dt>
                          <dd className="num font-bold text-[#0F172A]">{p.blendedPayback} yrs</dd>
                        </div>
                      </dl>
                      <button
                        onClick={() => {
                          setBudget(p.budget / 1e7)
                          setPaybackCeiling(p.paybackCeiling)
                          setTariff(p.tariffAssumption || tariff)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[5px] border border-[#CBD5E1] bg-[#F8FAFC] py-1.5 text-[12px] font-bold text-[#334155] transition-colors hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                      >
                        Load into simulator
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
