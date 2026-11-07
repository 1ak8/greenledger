import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Check,
  Leaf,
  PiggyBank,
  Pin,
  Play,
  Timer,
  Wallet,
} from 'lucide-react'
import { PageHeader, Panel, Empty, Stat, Bar } from '../components/ui'
import { MaccChart } from '../components/MaccChart'
import {
  simulate,
  pinSimulation,
  getInterventions,
  getSimulations,
} from '../lib/api'
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

const CATEGORY_DOT: Record<string, string> = {
  energy_efficiency: 'bg-jade',
  renewable: 'bg-[#0284c7]',
  material: 'bg-[#d97706]',
  process: 'bg-[#7c3aed]',
}

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
        <label
          htmlFor={id}
          className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#52627a]"
        >
          {label}
        </label>
        {!big && (
          <span className="num text-[12px] font-semibold text-fg">
            {valueText}
          </span>
        )}
      </div>
      {big && (
        <div className="figure mt-1 text-[27px] leading-none text-fg">
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
        className="range mt-2.5"
        style={{ '--fill': `${pct}%` } as CSSProperties}
      />
      {(left || right) && (
        <div className="num mt-0.5 flex justify-between text-[10px] font-medium text-[#64748b]">
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
  const budgetPct = sim
    ? Math.min(100, Math.round((sim.totalCapex / (budget * 1e7)) * 100))
    : 0

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
      setPinSuccess(`Saved as ${planName}`)

      // Auto-scroll to Pinned Plans section
      setTimeout(() => {
        pinnedRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
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
        description="Set capital and operating constraints. The knapsack engine returns the portfolio that abates the most within them."
        action={
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onPin}
                disabled={!sim || savingPin}
                className="btn btn-secondary"
              >
                <Pin size={14} className="text-forge" />
                {savingPin ? 'Pinning…' : 'Pin as plan'}
              </button>
              <button
                onClick={onBuildReport}
                disabled={!sim || savingPin}
                className="btn btn-primary"
              >
                Build report
                <ArrowRight size={15} />
              </button>
            </div>
            {pinSuccess && (
              <span className="flex items-center gap-1.5 rounded-full border border-[#cbe6d5] bg-[#f2fbf5] px-2.5 py-1 text-[11px] font-bold text-jade shadow-[0_1px_2px_rgba(10,18,34,0.04)]">
                <Check size={12} strokeWidth={2.6} />
                {pinSuccess}
              </span>
            )}
          </div>
        }
      />

      {/* Key result cards */}
      {sim && sim.selectedInterventions.length > 0 && (
        <div
          key={`${sim.totalCapex}-${sim.totalAbatement}-${sim.selectedInterventions.length}`}
          className="results-in mb-5 grid grid-cols-1 gap-3.5 min-[440px]:grid-cols-2 xl:grid-cols-4"
        >
          <Stat
            label="Capital deployed"
            value={inr(sim.totalCapex)}
            hint={`${budgetPct}% of ${formatCrore(budget)} budget`}
            tone="accent"
            icon={<Wallet size={14} />}
            bar={budgetPct}
            barTone="forge"
          />
          <Stat
            label="CO₂ abatement"
            value={tonnes(sim.totalAbatement)}
            unit="tCO₂e / yr"
            hint={`${(
              (sim.totalAbatement / activeBaseline.totalEmissions) *
              100
            ).toFixed(1)}% cut from annual baseline`}
            tone="positive"
            icon={<Leaf size={14} />}
          />
          <Stat
            label="Annual savings"
            value={inr(sim.totalSavings)}
            unit="/ year"
            hint="Power and fuel operating savings"
            tone="muted"
            icon={<PiggyBank size={14} />}
          />
          <Stat
            label="Blended payback"
            value={`${sim.blendedPayback}`}
            unit="years"
            hint={`Ceiling ${paybackCeiling} yrs · capex amortised by savings`}
            tone="muted"
            icon={<Timer size={14} />}
          />
        </div>
      )}

      {/* Main workspace */}
      <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Controls */}
        <div className="space-y-4">
          <Panel
            title="Assumptions"
            meta="0/1 knapsack"
            accent
            action={
              loading ? (
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-forge">
                  <svg
                    className="h-3.5 w-3.5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Calculating
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#5b6b82]">
                  <span className="h-1.5 w-1.5 rounded-full bg-jade" />
                  Ready
                </span>
              )
            }
          >
            <div className="space-y-4">
              {/* Primary run trigger */}
              <div className="rounded-[9px] border border-line bg-[#fbfcfe] p-2.5">
                <button
                  onClick={onRunSimulation}
                  disabled={loading}
                  className={`btn h-11 w-full text-[13px] font-bold ${
                    hasPendingChanges
                      ? 'bg-forge text-white shadow-[0_2px_8px_rgba(37,99,235,0.24)] hover:bg-forge-bright'
                      : 'btn-primary'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Optimising portfolio…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Play size={13} fill="currentColor" />
                      {hasPendingChanges ? 'Run with changes' : 'Re-run simulation'}
                    </span>
                  )}
                </button>
                <p
                  className={`mt-2 flex items-center justify-center gap-1.5 text-center text-[10.5px] font-semibold ${
                    hasPendingChanges && !loading
                      ? 'text-forge'
                      : 'text-[#5b6b82]'
                  }`}
                >
                  {hasPendingChanges && !loading ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-forge" />
                      Parameters changed — recalculate
                    </>
                  ) : loading ? (
                    'Infeasible combinations are excluded first'
                  ) : (
                    <>
                      <Check size={11} strokeWidth={2.6} />
                      Results match current assumptions
                    </>
                  )}
                </p>
              </div>

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

              <div>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#52627a]">
                    Candidate measures
                  </span>
                  <span className="num text-[11px] font-semibold text-[#5b6b82]">
                    {enabledCount}/{all.length} active
                  </span>
                </div>
                <ul className="overflow-hidden rounded-[9px] border border-line bg-white">
                  {all.map((i: Intervention) => {
                    const checked = toggles[i.id] !== false
                    return (
                      <li
                        key={i.id}
                        className="border-b border-[#eff2f7] last:border-b-0"
                      >
                        <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#fbfcfe]">
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
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  CATEGORY_DOT[i.category] ?? 'bg-[#94a3b8]'
                                }`}
                              />
                              <span
                                className={`truncate text-[12px] leading-tight ${
                                  checked
                                    ? 'font-semibold text-fg'
                                    : 'font-medium text-[#64748b]'
                                }`}
                              >
                                {i.name}
                              </span>
                            </span>
                            <span className="num mt-1 block text-[10.5px] font-medium text-[#5b6b82]">
                              {inr(i.capex)} · {i.co2Abated} t · {i.payback} yr
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </Panel>

          {sim && sim.excludedInterventions.length > 0 && (
            <Panel
              title="Screened out"
              meta="Constraint filters"
              flush
            >
              <ul className="divide-y divide-line">
                {sim.excludedInterventions.map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5 px-4 py-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-line bg-elevated text-[#64748b]">
                      <Ban size={11} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold leading-tight text-fg">
                        {e.name}
                      </p>
                      <p className="mt-0.5 text-[10.5px] font-medium text-[#5b6b82]">
                        {e.reason}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {/* Results */}
        <div className="min-w-0 space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[9px] border border-[#f3d6d6] bg-[#fef5f5] px-4 py-3 text-[12.5px] font-medium text-[#b91c1c]"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Panel
            title="Abatement potential by measure"
            meta={`${selectedIds.length} of ${all.length} in portfolio`}
            action={
              <span className="text-[11px] font-medium text-[#5b6b82]">
                Annual carbon reduction
              </span>
            }
          >
            <MaccChart
              interventions={all}
              selectedIds={selectedIds}
              height={320}
            />
          </Panel>

          {sim && sim.selectedInterventions.length > 0 ? (
            <Panel
              title="Selected portfolio"
              meta={`${sim.selectedInterventions.length} projects recommended`}
              flush
              footer={
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-[180px] flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
                      <span className="font-semibold text-fg-dim">
                        Budget utilisation
                      </span>
                      <span className="num font-semibold text-fg">
                        {inr(sim.totalCapex)}{' '}
                        <span className="text-[#5b6b82]">
                          / {inr(budget * 1e7)}
                        </span>
                      </span>
                    </div>
                    <Bar value={budgetPct} max={100} tone="forge" height={5} />
                  </div>
                  <span className="num rounded-[5px] border border-line bg-white px-2 py-1 text-[11px] font-bold text-[#52627a]">
                    {budgetPct}% utilised
                  </span>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Intervention</th>
                      <th className="text-right">Capex</th>
                      <th className="text-right">Abatement</th>
                      <th className="text-right">Annual savings</th>
                      <th className="text-right">Payback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sim.selectedInterventions.map((i) => (
                      <tr key={i.id}>
                        <td className="whitespace-nowrap font-semibold">
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-jade" />
                            {i.name}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap text-right font-medium text-fg-dim">
                          {inr(i.capex)}
                        </td>
                        <td className="num whitespace-nowrap text-right font-semibold text-fg">
                          {tonnes(i.co2Abated)} tCO₂e
                        </td>
                        <td className="num whitespace-nowrap text-right font-semibold text-jade">
                          {inr(i.annualSavings)}
                        </td>
                        <td className="num whitespace-nowrap text-right font-medium text-fg-dim">
                          {i.payback} yrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="font-semibold">Portfolio total</td>
                      <td className="num text-right font-semibold text-fg">
                        {inr(sim.totalCapex)}
                      </td>
                      <td className="num text-right font-semibold text-fg">
                        {tonnes(sim.totalAbatement)} tCO₂e
                      </td>
                      <td className="num text-right font-semibold text-jade">
                        {inr(sim.totalSavings)}
                      </td>
                      <td className="num text-right font-semibold text-fg">
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
                        <th className="text-right">Annual saving</th>
                        <th className="text-right">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.projection.map((p) => (
                        <tr key={p.year}>
                          <td className="num font-semibold text-fg-dim">
                            {p.year}
                          </td>
                          <td className="num text-right font-medium text-fg">
                            {tonnes(p.emissions)} t
                          </td>
                          <td className="num text-right font-semibold text-jade">
                            {inr(p.savings)}
                          </td>
                          <td className="num text-right font-semibold text-fg">
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
                        <th>Assumption shift</th>
                        <th className="text-right">Payback</th>
                        <th className="text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sensitivity.map((s: SensitivityRow) => (
                        <tr key={s.assumption}>
                          <td className="text-[12px] font-semibold text-fg-dim">
                            {s.assumption}
                          </td>
                          <td className="num text-right font-semibold text-fg">
                            {s.payback} yrs
                          </td>
                          <td
                            className={`num text-right font-semibold ${
                              s.delta > 0 ? 'text-red' : 'text-jade'
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

          {/* Pinned plans */}
          <div ref={pinnedRef} className="scroll-mt-6">
            {pinned.length > 0 && (
              <Panel
                title="Pinned plans"
                meta={`${pinned.length} saved portfolio${
                  pinned.length > 1 ? 's' : ''
                } ready for comparison`}
                accent
              >
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {pinned.map((p) => (
                    <div
                      key={p._id}
                      className="hover-lift group rounded-[10px] border border-line bg-white p-4 hover:border-[#c9d8f7]"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Pin
                            size={13}
                            className="shrink-0 text-forge"
                            fill="currentColor"
                          />
                          <span className="truncate text-[12.5px] font-bold text-fg">
                            {p.label}
                          </span>
                        </div>
                        <span className="num shrink-0 rounded-[5px] border border-[#d2e1fd] bg-[#f4f8ff] px-2 py-0.5 text-[10.5px] font-bold text-forge-bright">
                          {formatCrore(p.budget / 1e7)}
                        </span>
                      </div>
                      <dl className="mt-2.5 space-y-1.5 text-[11.5px]">
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="font-medium text-[#5b6b82]">
                            Capital deployed
                          </dt>
                          <dd className="num font-semibold text-fg">
                            {inr(p.totalCapex)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="font-medium text-[#5b6b82]">
                            CO₂ abated
                          </dt>
                          <dd className="num font-semibold text-fg">
                            {tonnes(p.totalAbatement)}{' '}
                            <span className="text-[10px] font-medium text-[#5b6b82]">
                              t/yr
                            </span>
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="font-medium text-[#5b6b82]">
                            Annual savings
                          </dt>
                          <dd className="num font-semibold text-jade">
                            {inr(p.totalSavings)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2 border-t border-line pt-1.5">
                          <dt className="font-medium text-[#5b6b82]">
                            Blended payback
                          </dt>
                          <dd className="num font-semibold text-fg">
                            {p.blendedPayback} yrs
                          </dd>
                        </div>
                      </dl>
                      <button
                        onClick={() => {
                          setBudget(p.budget / 1e7)
                          setPaybackCeiling(p.paybackCeiling)
                          setTariff(p.tariffAssumption || tariff)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-line bg-[#fbfcfe] py-1.5 text-[11.5px] font-bold text-fg-dim transition-colors hover:border-[#c9d8f7] hover:bg-[#f4f8ff] hover:text-forge-bright"
                      >
                        Load into simulator
                        <ArrowRight size={11} />
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
