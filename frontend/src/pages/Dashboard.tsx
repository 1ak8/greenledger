import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  Factory,
  FileText,
  Gauge,
  Globe2,
  Leaf,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react'
import {
  PageHeader,
  Panel,
  Stat,
  Bar,
  Badge,
  Empty,
  BenchmarkGauge,
} from '../components/ui'
import { MaccChart } from '../components/MaccChart'
import {
  getBaseline,
  getInterventions,
  getSimulations,
  getUploads,
} from '../lib/api'
import { inr, tonnes } from '../lib/format'
import { useSession } from '../lib/session'
import type { Intervention, Simulation, UploadDoc } from '../lib/types'

const DOC_LABEL: Record<string, string> = {
  electricity: 'Electricity',
  fuel: 'Fuel',
  production: 'Production',
}

const SECTOR_LABEL: Record<string, string> = {
  steel: 'Steel',
  cement: 'Cement',
  textile: 'Textile',
  chemical: 'Chemicals',
  'auto-component': 'Auto components',
  foundry: 'Foundry',
  paper: 'Paper & pulp',
  other: 'Manufacturing',
}

export function Dashboard() {
  const navigate = useNavigate()
  const { company, baseline, setBaseline, loadDemo } = useSession()

  const [uploads, setUploads] = useState<UploadDoc[]>([])
  const [sims, setSims] = useState<Simulation[]>([])
  const [library, setLibrary] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)

  const companyId = company?._id
  const sector = company?.sector ?? 'steel'

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)

    Promise.allSettled([
      getBaseline(companyId).then((b) => {
        if (alive) setBaseline(b)
      }),
      getUploads(companyId).then((u) => {
        if (alive) setUploads(u)
      }),
      getSimulations(companyId).then((s) => {
        if (alive) setSims(s)
      }),
      getInterventions(sector).then((l) => {
        if (alive) setLibrary(l)
      }),
    ]).then(() => {
      if (alive) setLoading(false)
    })

    return () => {
      alive = false
    }
  }, [companyId, sector])

  if (!company) {
    return (
      <>
        <PageHeader
          title="Overview"
          description="Green Ledger turns utility bills into a product-level carbon baseline, then ranks green investment by rupees saved per tonne abated."
        />
        <div className="card overflow-hidden">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative overflow-hidden border-b border-line p-7 sm:p-9 lg:border-b-0 lg:border-r lg:p-10">
              <div
                className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10),transparent_68%)]"
                aria-hidden="true"
              />
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#52627a]">
                <span className="h-1.5 w-1.5 rounded-full bg-jade pulse-dot" />
                No workspace loaded
              </span>
              <h2 className="mt-5 max-w-[16ch] font-display text-[32px] font-bold leading-[1.03] tracking-[-0.04em] text-fg sm:text-[38px]">
                Start with a factory, not a spreadsheet.
              </h2>
              <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-fg-dim">
                Four profile fields set the emission factors, sector benchmark
                and export exposure. Green Ledger does the rest from your bills
                — deterministically, with a traceable evidence trail.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button onClick={() => loadDemo()} className="btn btn-primary">
                  Load demo workspace
                  <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => navigate('/company')}
                  className="btn btn-secondary"
                >
                  Create profile
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-1.5">
                {[
                  'CEA v19 grid factors',
                  'IPCC 2006',
                  'BEE PAT Cycle VI',
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-[5px] border border-line bg-white px-2 py-1 font-mono text-[10.5px] font-medium text-[#52627a]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#5b6b82]">
                Demo · Sharma Steel · Raipur · 18,000 t/yr
              </p>
            </div>

            <ol className="flex flex-col justify-center divide-y divide-line bg-[#fbfcfe]">
              {[
                [
                  'Profile',
                  'Sector, state, annual output and export share set the engine.',
                ],
                [
                  'Bills',
                  'Electricity, fuel and production records, parsed into a review table.',
                ],
                [
                  'Decision',
                  'A ranked portfolio with capital, payback and tonnes abated.',
                ],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4 px-6 py-6 sm:px-8">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white font-mono text-[11.5px] font-bold text-[#52627a] shadow-[0_1px_2px_rgba(10,18,34,0.04)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-bold text-fg">
                      {title}
                    </div>
                    <div className="mt-1 max-w-[38ch] text-[12.5px] leading-relaxed text-fg-dim">
                      {body}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </>
    )
  }

  const latest = sims[0]
  const abatementAvailable = latest
    ? latest.totalAbatement
    : library.reduce((s, i) => s + i.co2Abated, 0)

  const aheadOfMedian =
    baseline !== null && baseline.carbonIntensity < baseline.sectorMedian
  const maxBench = baseline ? baseline.sectorMedian * 1.6 : 1
  const gapPct = baseline
    ? ((baseline.carbonIntensity - baseline.sectorMedian) /
        baseline.sectorMedian) *
      100
    : 0

  const scope1Pct = baseline
    ? Math.round((baseline.scope1 / baseline.totalEmissions) * 100)
    : 0
  const scope2Pct = baseline
    ? Math.round((baseline.scope2 / baseline.totalEmissions) * 100)
    : 0
  const embedded = baseline
    ? company.annualProduction *
      (company.exportShare / 100) *
      baseline.carbonIntensity
    : 0

  const budgetUsed = latest
    ? Math.min(100, Math.round((latest.totalCapex / latest.budget) * 100))
    : 0

  return (
    <>
      <PageHeader
        title="Overview"
        description="Your emissions baseline, benchmark position and latest investment plan — in one view."
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="pill">
              <Building2 size={12} className="text-[#64748b]" />
              {company.name}
            </span>
            <span className="pill">
              <MapPin size={12} className="text-[#64748b]" />
              {company.state}
            </span>
            <span className="pill">
              <Factory size={12} className="text-[#64748b]" />
              {company.annualProduction.toLocaleString('en-IN')}{' '}
              {company.productionUnit}/yr
            </span>
            {company.exportShare > 0 && (
              <span className="pill">
                <Globe2 size={12} className="text-[#64748b]" />
                {company.exportShare}% exported
              </span>
            )}
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/upload')}
              className="btn btn-secondary"
            >
              Add documents
            </button>
            <button
              onClick={() => navigate(baseline ? '/simulate' : '/upload')}
              className="btn btn-primary"
            >
              {baseline ? 'Open simulation' : 'Build baseline'}
              <ArrowRight size={15} />
            </button>
          </div>
        }
      />

      {!baseline && loading && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading overview">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card h-[132px] p-5">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton mt-5 h-7 w-32 rounded" />
                <div className="skeleton mt-4 h-2.5 w-40 rounded" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <div className="card h-[420px] p-5">
              <div className="skeleton h-4 w-52 rounded" />
              <div className="skeleton mt-10 h-[300px] w-full rounded" />
            </div>
            <div className="card h-[420px] p-5">
              <div className="skeleton h-4 w-40 rounded" />
              <div className="skeleton mt-10 h-[300px] w-full rounded" />
            </div>
          </div>
        </div>
      )}

      {!baseline && !loading && (
        <Panel
          title="Three steps to your first report"
          meta="Profile is complete — add bills to continue"
          accent
          flush
        >
          <ol className="divide-y divide-line">
            {[
              {
                done: true,
                title: 'Company profile',
                body: `${company.name} · ${company.exportShare}% exported to ${
                  company.exportDestination || 'domestic buyers'
                }`,
                to: '/company',
                cta: 'Review',
              },
              {
                done: uploads.length >= 2,
                title: 'Documents',
                body:
                  uploads.length === 0
                    ? 'Upload electricity bills and fuel invoices. Each line keeps a link to its source.'
                    : `${uploads.length} document${
                        uploads.length > 1 ? 's' : ''
                      } extracted and ready to review.`,
                to: '/upload',
                cta: uploads.length ? 'Review data' : 'Upload bills',
              },
              {
                done: false,
                title: 'Baseline',
                body: 'Emissions by scope, intensity against the sector median, and CBAM exposure in rupees.',
                to: '/upload',
                cta: 'Calculate',
              },
            ].map((step, i) => (
              <li
                key={step.title}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[12.5px] font-bold ${
                    step.done
                      ? 'border-[#cfe8d9] bg-[#f1fbf4] text-jade'
                      : 'border-line bg-white text-[#52627a]'
                  }`}
                >
                  {step.done ? <Check size={14} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-fg">
                    {step.title}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-fg-dim">
                    {step.body}
                  </div>
                </div>
                <button
                  onClick={() => navigate(step.to)}
                  className="btn btn-secondary h-8 px-3 text-[12px]"
                >
                  {step.cta}
                </button>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {baseline && (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3.5 min-[440px]:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Annual emissions"
              value={tonnes(baseline.totalEmissions)}
              unit="tCO₂e"
              hint={`${scope1Pct}% Scope 1 · ${scope2Pct}% Scope 2`}
              tone="accent"
              bar={scope1Pct}
              barTone="forge"
              icon={<Activity size={14} />}
            />
            <Stat
              label="Carbon intensity"
              value={baseline.carbonIntensity.toFixed(2)}
              unit="tCO₂e / t"
              hint={`${Math.abs(gapPct).toFixed(0)}% ${
                gapPct <= 0 ? 'below' : 'above'
              } sector median of ${baseline.sectorMedian.toFixed(2)}`}
              tone={aheadOfMedian ? 'positive' : 'alert'}
              bar={(baseline.carbonIntensity / maxBench) * 100}
              barTone={aheadOfMedian ? 'jade' : 'amber'}
              icon={<Gauge size={14} />}
            />
            <Stat
              label="CBAM exposure"
              value={inr(baseline.cbamExposure)}
              unit="/ yr"
              hint={`At €${baseline.euCarbonPrice}/tCO₂ · estimate, not a liability`}
              tone="alert"
              icon={<Globe2 size={14} />}
            />
            <Stat
              label={latest ? 'Plan abatement' : 'Library potential'}
              value={tonnes(abatementAvailable)}
              unit="tCO₂e"
              hint={
                latest
                  ? `${inr(latest.totalCapex)} capital · ${latest.blendedPayback} yr payback`
                  : 'If every option ran'
              }
              tone="muted"
              icon={<Leaf size={14} />}
            />
          </div>

          <div className="mb-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,1fr)]">
            <div className="min-w-0 space-y-5">
              <Panel
                title="Abatement potential by measure"
                meta={`${SECTOR_LABEL[company.sector] ?? company.sector} catalogue`}
                accent
                action={
                  <Link
                    to="/library"
                    className="link inline-flex items-center gap-1"
                  >
                    Full catalogue
                    <ArrowUpRight size={12} />
                  </Link>
                }
              >
                <MaccChart
                  interventions={library}
                  selectedIds={latest?.selectedInterventions.map((i) => i.id)}
                  height={320}
                />
              </Panel>

              <Panel
                title="Portfolio breakdown"
                meta={latest ? 'Selected by the optimiser' : 'No plan saved'}
                action={
                  latest ? (
                    <Link to="/report" className="link">
                      Open report
                    </Link>
                  ) : undefined
                }
                flush
                footer={
                  latest ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="min-w-[180px] flex-1">
                        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[11.5px]">
                          <span className="font-semibold text-fg-dim">
                            Capital deployed
                          </span>
                          <span className="num font-semibold text-fg">
                            {inr(latest.totalCapex)}{' '}
                            <span className="text-[#5b6b82]">
                              / {inr(latest.budget)}
                            </span>
                          </span>
                        </div>
                        <Bar
                          value={budgetUsed}
                          max={100}
                          tone="forge"
                          height={5}
                        />
                      </div>
                      <span className="num rounded-[5px] border border-line bg-white px-2 py-1 text-[11px] font-bold text-[#52627a]">
                        {budgetUsed}% utilised
                      </span>
                    </div>
                  ) : undefined
                }
              >
                {latest && latest.selectedInterventions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Intervention</th>
                          <th className="text-right">Capex</th>
                          <th className="text-right">Abated</th>
                          <th className="text-right">Annual saving</th>
                          <th className="text-right">Payback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latest.selectedInterventions.map((i) => (
                          <tr key={i.id}>
                            <td className="whitespace-nowrap font-semibold">
                              <span className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-jade" />
                                {i.name}
                              </span>
                            </td>
                            <td className="num whitespace-nowrap text-right text-fg-dim">
                              {inr(i.capex)}
                            </td>
                            <td className="num whitespace-nowrap text-right font-semibold">
                              {tonnes(i.co2Abated)} t
                            </td>
                            <td className="num whitespace-nowrap text-right font-semibold text-jade">
                              {inr(i.annualSavings)}
                            </td>
                            <td className="num whitespace-nowrap text-right text-fg-dim">
                              {i.payback} yr
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="font-semibold">Portfolio total</td>
                          <td className="num text-right font-semibold text-fg">
                            {inr(latest.totalCapex)}
                          </td>
                          <td className="num text-right font-semibold text-fg">
                            {tonnes(latest.totalAbatement)} t
                          </td>
                          <td className="num text-right font-semibold text-jade">
                            {inr(latest.totalSavings)}
                          </td>
                          <td className="num text-right font-semibold text-fg">
                            {latest.blendedPayback} yr
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="No portfolio yet"
                    body="Set a budget and the optimiser returns the set that abates the most within it."
                    icon={<SlidersHorizontal size={19} strokeWidth={1.8} />}
                    action={
                      <button
                        onClick={() => navigate('/simulate')}
                        className="btn btn-primary"
                      >
                        <SlidersHorizontal size={14} />
                        Run simulation
                      </button>
                    }
                  />
                )}
              </Panel>

              <Panel
                title="Emissions composition"
                meta="Scope 1 + 2 · annual"
                action={
                  <Link to="/baseline" className="link">
                    Open baseline
                  </Link>
                }
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5b6b82]">
                      Total footprint
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="figure text-[28px] leading-none text-fg">
                        {tonnes(baseline.totalEmissions)}
                      </span>
                      <span className="text-[13px] font-semibold text-fg-faint">
                        tCO₂e / year
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11.5px] font-semibold text-fg-dim">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-forge" />
                      Scope 1
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-jade" />
                      Scope 2
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex h-3.5 overflow-hidden rounded-full bg-[#edf1f6]">
                  <div
                    className="h-full bg-forge"
                    style={{
                      width: `${scope1Pct}%`,
                      transition: 'width 750ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                  <div
                    className="h-full bg-jade"
                    style={{
                      width: `${scope2Pct}%`,
                      transition: 'width 750ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[9px] border border-line bg-[#fbfcfe] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52627a]">
                        Scope 1 · direct
                      </span>
                      <span className="num text-[11.5px] font-semibold text-forge-bright">
                        {scope1Pct}%
                      </span>
                    </div>
                    <div className="num mt-1.5 text-[18px] font-semibold leading-none text-fg">
                      {tonnes(baseline.scope1)}
                      <span className="ml-1 font-sans text-[11.5px] font-medium text-[#5b6b82]">
                        tCO₂e
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#64748b]">
                      Fuel burned on site, plus process emissions.
                    </p>
                  </div>
                  <div className="rounded-[9px] border border-line bg-[#fbfcfe] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#52627a]">
                        Scope 2 · grid
                      </span>
                      <span className="num text-[11.5px] font-semibold text-jade">
                        {scope2Pct}%
                      </span>
                    </div>
                    <div className="num mt-1.5 text-[18px] font-semibold leading-none text-fg">
                      {tonnes(baseline.scope2)}
                      <span className="ml-1 font-sans text-[11.5px] font-medium text-[#5b6b82]">
                        tCO₂e
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#64748b]">
                      Purchased electricity × state grid factor.
                    </p>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="min-w-0 space-y-4">
              <Panel title="Benchmark position" meta="tCO₂e per tonne">
                <BenchmarkGauge
                  value={baseline.carbonIntensity}
                  median={baseline.sectorMedian}
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-[8px] border border-line bg-[#fbfcfe] px-3 py-2.5">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#5b6b82]">
                      Your position
                    </div>
                    <div className="num mt-1 text-[15px] font-semibold text-fg">
                      {baseline.carbonIntensity.toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-[8px] border border-line bg-[#fbfcfe] px-3 py-2.5">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#5b6b82]">
                      Sector median
                    </div>
                    <div className="num mt-1 text-[15px] font-semibold text-fg">
                      {baseline.sectorMedian.toFixed(2)}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-fg-dim">
                  {aheadOfMedian
                    ? 'You are already below the sector median. That is a selling point with buyers — and it still leaves abatement on the table.'
                    : 'You are above the sector median. Buyers comparing suppliers will notice, and CBAM exposure scales with this number.'}
                </p>
                <button
                  onClick={() => navigate('/baseline')}
                  className="mt-3 flex w-full items-center justify-between rounded-[7px] border border-line px-3 py-2 text-[12px] font-semibold text-fg transition-colors hover:border-line-strong hover:bg-elevated"
                >
                  <span>Open full baseline</span>
                  <ArrowRight size={13} className="text-[#5b6b82]" />
                </button>
              </Panel>

              <div className="rounded-[12px] border border-[#f0e2b6] bg-[#fffbeb] p-5 shadow-[0_1px_2px_rgba(10,18,34,0.03)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#92400e]">
                    <Globe2 size={13} />
                    CBAM exposure
                  </span>
                  <span className="rounded-full border border-[#eedda8] bg-white px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#92400e]">
                    €{baseline.euCarbonPrice}/t
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-2">
                  <span className="figure text-[32px] leading-none text-[#78350f]">
                    {inr(baseline.cbamExposure)}
                  </span>
                  <span className="text-[12px] font-semibold text-[#b45309]">
                    / yr
                  </span>
                </div>
                <div className="mt-3.5 divide-y divide-[#f3e6bd] border-y border-[#f3e6bd] text-[12px]">
                  <div className="flex items-center justify-between py-2">
                    <span className="font-medium text-[#7c5a23]">
                      Exported tonnage
                    </span>
                    <span className="num font-semibold text-[#713f12]">
                      {tonnes(
                        company.annualProduction *
                          (company.exportShare / 100),
                      )}{' '}
                      t
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="font-medium text-[#7c5a23]">
                      Embedded intensity
                    </span>
                    <span className="num font-semibold text-[#713f12]">
                      {baseline.carbonIntensity.toFixed(2)} t/t
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="font-medium text-[#7c5a23]">
                      Carbon price
                    </span>
                    <span className="num font-semibold text-[#713f12]">
                      €{baseline.euCarbonPrice}/t
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-[#eedda8] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#92400e]">
                    Estimate, not a liability
                  </span>
                  <button
                    onClick={() => navigate('/baseline')}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#92400e] hover:underline"
                  >
                    View calculation
                    <ArrowUpRight size={11} />
                  </button>
                </div>
              </div>

              <div className="rounded-[12px] border border-[#d9e5fe] bg-[#f4f8ff] p-5 shadow-[0_1px_2px_rgba(10,18,34,0.03)]">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#1e40af]">
                  <Globe2 size={13} />
                  Embedded in exports
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="figure text-[28px] leading-none text-[#1e3a8a]">
                    {tonnes(embedded)}
                  </span>
                  <span className="text-[12.5px] font-semibold text-[#1d4ed8]">
                    tCO₂e
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[#3f5f9e]">
                  Reaches your EU importer as a cost. The obligation is theirs;
                  the data has to come from you.
                </p>
              </div>
            </div>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-2">
            <Panel
              title="Documents"
              meta={`${uploads.length} uploaded`}
              action={
                <Link to="/upload" className="link">
                  Manage
                </Link>
              }
              flush
            >
              {uploads.length === 0 ? (
                <Empty
                  title="No documents"
                  body="Upload an electricity bill and a fuel invoice to build Scope 1 and 2."
                  icon={<FileText size={19} strokeWidth={1.8} />}
                  action={
                    <button
                      onClick={() => navigate('/upload')}
                      className="btn btn-secondary"
                    >
                      Upload bills
                    </button>
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {uploads.slice(0, 3).map((u) => (
                    <li
                      key={u._id}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-line bg-elevated text-[#64748b]">
                        <FileText size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-semibold text-fg">
                          {u.originalName || `${u.fileType} document`}
                        </div>
                        <div className="mt-0.5 text-[11.5px] font-medium text-[#5b6b82]">
                          {u.extractedData.length} line items ·{' '}
                          {new Date(u.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      </div>
                      <Badge>{DOC_LABEL[u.fileType] ?? u.fileType}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Latest plan"
              meta={latest ? `Budget ${inr(latest.budget)}` : undefined}
              action={
                latest ? (
                  <Link to="/report" className="link">
                    Open report
                  </Link>
                ) : undefined
              }
            >
              {latest ? (
                <div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { l: 'Capital', v: inr(latest.totalCapex) },
                      { l: 'Abated', v: `${tonnes(latest.totalAbatement)} t` },
                      {
                        l: 'Annual saving',
                        v: inr(latest.totalSavings),
                        tone: 'text-jade',
                      },
                      {
                        l: 'Payback',
                        v: `${latest.blendedPayback} yrs`,
                        tone: 'text-forge-bright',
                      },
                    ].map((s) => (
                      <div
                        key={s.l}
                        className="rounded-[8px] border border-line bg-[#fbfcfe] px-3 py-2.5"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#5b6b82]">
                          {s.l}
                        </div>
                        <div
                          className={`num mt-1 text-[14px] font-semibold ${
                            s.tone ?? 'text-fg'
                          }`}
                        >
                          {s.v}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {latest.selectedInterventions.map((i) => (
                      <span
                        key={i.id}
                        className="rounded-[5px] border border-line bg-elevated px-2 py-1 text-[11.5px] font-medium text-fg-dim"
                      >
                        {i.name}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3.5 border-t border-line pt-3 text-[12px] leading-relaxed text-[#64748b]">
                    Cuts {tonnes(latest.totalAbatement)} tCO₂e a year —{' '}
                    {(
                      (latest.totalAbatement / baseline.totalEmissions) *
                      100
                    ).toFixed(1)}
                    % of the annual baseline.
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-[13.5px] font-semibold text-fg">
                    No investment plan yet.
                  </p>
                  <p className="mt-1.5 max-w-[46ch] text-[12.5px] leading-relaxed text-fg-dim">
                    Set a budget and the optimiser returns the portfolio that
                    abates the most within it.
                  </p>
                  <button
                    onClick={() => navigate('/simulate')}
                    className="btn btn-primary mt-4"
                  >
                    <SlidersHorizontal size={14} />
                    Run simulation
                  </button>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  )
}
