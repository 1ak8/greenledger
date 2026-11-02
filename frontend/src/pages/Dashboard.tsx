import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, FileText, SlidersHorizontal } from 'lucide-react'
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
          <div className="grid lg:grid-cols-[1.12fr_1fr]">
            <div className="border-b border-line bg-elevated p-8 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-jade" />
                <span className="text-[13px] font-medium uppercase tracking-[0.09em] text-fg-dim">
                  No workspace loaded
                </span>
              </div>
              <h2 className="max-w-[15ch] font-display text-[30px] font-semibold leading-[1.06] tracking-[-0.035em] text-fg">
                Start with a factory, not a spreadsheet.
              </h2>
              <p className="mt-4 max-w-[44ch] text-[13.5px] leading-relaxed text-fg-dim">
                Four profile fields set the emission factors, sector benchmark
                and export exposure. Green Ledger does the rest from your bills.
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
              <p className="mt-6 font-mono text-[13px] text-fg-faint">
                DEMO · SHARMA STEEL · RAIPUR · 18,000 T/YR
              </p>
            </div>

            <ol className="divide-y divide-line">
              {[
                [
                  'Profile',
                  'Sector, state, annual output and export share.',
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
                <li key={title} className="flex gap-4 px-7 py-5">
                  <span className="num w-6 shrink-0 pt-0.5 text-[13px] text-forge-bright">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-medium text-fg">
                      {title}
                    </div>
                    <div className="mt-1 text-[13px] leading-relaxed text-fg-dim">
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

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${company.name} · ${company.state} · ${company.annualProduction.toLocaleString(
          'en-IN',
        )} ${company.productionUnit} a year`}
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

      {!baseline && !loading && (
        <div className="card mb-6 border-t-[3px] border-t-forge">
          <div className="border-b border-line bg-elevated px-4 py-2.5">
            <h2 className="panel-title">Three steps to your first report</h2>
          </div>
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
                body: 'Percent of emissions by scope, intensity against the sector median, and CBAM exposure in rupees.',
                to: '/upload',
                cta: 'Calculate',
              },
            ].map((step, i) => (
              <li
                key={step.title}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border text-[13px] ${
                    step.done
                      ? 'border-jade/25 bg-jade-light text-jade'
                      : 'border-line-strong text-fg-faint'
                  }`}
                >
                  {step.done ? <Check size={13} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-fg">
                    {step.title}
                  </div>
                  <div className="text-[13px] text-fg-dim">{step.body}</div>
                </div>
                <button
                  onClick={() => navigate(step.to)}
                  className="btn btn-secondary h-8 px-3 text-[12.5px]"
                >
                  {step.cta}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {baseline && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat
              label="Annual emissions"
              value={tonnes(baseline.totalEmissions)}
              unit="tCO₂e"
              hint={`${scope1Pct}% Scope 1 · ${scope2Pct}% Scope 2`}
              tone="accent"
              bar={scope1Pct}
              barTone="forge"
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
            />
            <Stat
              label="CBAM exposure"
              value={inr(baseline.cbamExposure)}
              unit="/ yr"
              hint={`At €${baseline.euCarbonPrice}/tCO₂ · estimate, not a liability`}
              tone="alert"
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
            />
          </div>

          <div className="mb-6 grid items-start gap-6 xl:grid-cols-[1.65fr_1fr]">
            <div className="min-w-0 space-y-6">
              <Panel
                title="Abatement potential by measure"
                meta={`${company.sector} catalogue · ranked by annual CO₂ reduction`}
                accent
                action={
                  <Link
                    to="/library"
                    className="text-[12.5px] font-medium text-forge hover:underline"
                  >
                    Full catalogue
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
                flush
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
                            <td className="whitespace-nowrap font-medium">
                              {i.name}
                            </td>
                            <td className="num whitespace-nowrap text-right text-fg-dim">
                              {inr(i.capex)}
                            </td>
                            <td className="num whitespace-nowrap text-right">
                              {tonnes(i.co2Abated)} t
                            </td>
                            <td className="num whitespace-nowrap text-right text-jade">
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
                          <td className="font-medium">Portfolio total</td>
                          <td className="num text-right text-fg">
                            {inr(latest.totalCapex)}
                          </td>
                          <td className="num text-right text-fg">
                            {tonnes(latest.totalAbatement)} t
                          </td>
                          <td className="num text-right text-jade">
                            {inr(latest.totalSavings)}
                          </td>
                          <td className="num text-right text-fg">
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

              <Panel title="Emissions composition" meta="Scope 1 + 2" flush>
                <div className="grid gap-px bg-line sm:grid-cols-2">
                  <div className="bg-panel px-4 py-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] font-medium uppercase tracking-[0.07em] text-fg-faint">
                        Scope 1 · direct
                      </span>
                      <span className="num text-[12.5px] text-forge-bright">
                        {scope1Pct}%
                      </span>
                    </div>
                    <div className="num mt-1.5 text-[21px] font-semibold leading-none text-fg">
                      {tonnes(baseline.scope1)}
                      <span className="ml-1 font-sans text-[13px] font-normal text-iron">
                        tCO₂e
                      </span>
                    </div>
                    <div className="mt-3">
                      <Bar
                        value={baseline.scope1}
                        max={baseline.totalEmissions}
                        tone="forge"
                        height={6}
                      />
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-fg-faint">
                      Fuel burned on site, plus process emissions.
                    </p>
                  </div>
                  <div className="bg-panel px-4 py-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] font-medium uppercase tracking-[0.07em] text-fg-faint">
                        Scope 2 · grid
                      </span>
                      <span className="num text-[12.5px] text-jade">
                        {scope2Pct}%
                      </span>
                    </div>
                    <div className="num mt-1.5 text-[21px] font-semibold leading-none text-fg">
                      {tonnes(baseline.scope2)}
                      <span className="ml-1 font-sans text-[13px] font-normal text-iron">
                        tCO₂e
                      </span>
                    </div>
                    <div className="mt-3">
                      <Bar
                        value={baseline.scope2}
                        max={baseline.totalEmissions}
                        tone="jade"
                        height={6}
                      />
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-fg-faint">
                      Purchased electricity × state grid factor.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-elevated px-4 py-2.5 text-[13px]">
                  <span className="text-fg-faint">Total Scope 1 + 2</span>
                  <span className="num ml-auto text-fg">
                    {tonnes(baseline.totalEmissions)} tCO₂e
                  </span>
                  <Link
                    to="/baseline"
                    className="font-medium text-forge-bright hover:underline"
                  >
                    Open baseline
                  </Link>
                </div>
              </Panel>
            </div>

            <div className="min-w-0 space-y-4">
              <Panel title="Benchmark position" meta="tCO₂e per tonne">
                <BenchmarkGauge
                  value={baseline.carbonIntensity}
                  median={baseline.sectorMedian}
                />
                <div className="mt-3 grid grid-cols-2 gap-px border border-line bg-line">
                  <div className="bg-panel px-3 py-2.5">
                    <div className="text-[13px] uppercase tracking-[0.06em] text-fg-faint">
                      Your position
                    </div>
                    <div className="num mt-1 text-[15px] text-fg">
                      {baseline.carbonIntensity.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-panel px-3 py-2.5">
                    <div className="text-[13px] uppercase tracking-[0.06em] text-fg-faint">
                      Sector median
                    </div>
                    <div className="num mt-1 text-[15px] text-fg">
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
                  className="mt-3 flex w-full items-center justify-between border border-line px-3 py-2 text-[12.5px] text-fg transition-colors hover:border-line-strong hover:bg-elevated"
                >
                  <span>Open full baseline</span>
                  <ArrowRight size={13} className="text-fg-faint" />
                </button>
              </Panel>

              <div className="rounded-[8px] border-2 border-[#FDE047] bg-[#FEFCE8] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-bold uppercase tracking-tight text-[#CA8A04]">
                    CBAM Exposure
                  </span>
                  <span className="rounded-full border border-[#FDE047] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#CA8A04]">
                    €{baseline.euCarbonPrice}/tCO₂
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
                  <span className="num text-[34px] font-bold leading-none text-[#A16207]">
                    {inr(baseline.cbamExposure)}
                  </span>
                  <span className="text-[12.5px] font-medium text-[#CA8A04]">/ yr</span>
                </div>
                <div className="mt-3 divide-y divide-[#FEF08A] border-y border-[#FEF08A] text-[12.5px]">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#854D0E]">Exported tonnage</span>
                    <span className="num font-semibold text-[#713F12]">
                      {tonnes(
                        company.annualProduction *
                          (company.exportShare / 100),
                      )}{' '}
                      t
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#854D0E]">Embedded intensity</span>
                    <span className="num font-semibold text-[#713F12]">
                      {baseline.carbonIntensity.toFixed(2)} t/t
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#854D0E]">Carbon price</span>
                    <span className="num font-semibold text-[#713F12]">
                      €{baseline.euCarbonPrice}/t
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-full border border-[#FDE047] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#CA8A04]">
                    Estimate, not a liability
                  </span>
                </div>
              </div>

              <div className="rounded-[8px] border-2 border-[#93C5FD] bg-[#EFF6FF] p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold tracking-tight text-[#2563EB]">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 4.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Embedded in exports
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="num text-[28px] font-bold leading-none text-[#1E3A8A]">
                    {tonnes(embedded)}
                  </span>
                  <span className="text-[13px] font-semibold text-[#3B82F6]">tCO₂e</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#1E40AF]">
                  Reaches your EU importer as a cost. The obligation is theirs;
                  the data has to come from you.
                </p>
              </div>
            </div>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Panel
              title="Documents"
              meta={`${uploads.length} uploaded`}
              action={
                <Link
                  to="/upload"
                  className="text-[12.5px] font-medium text-forge-bright hover:underline"
                >
                  Manage
                </Link>
              }
              flush
            >
              {uploads.length === 0 ? (
                <Empty
                  title="No documents"
                  body="Upload an electricity bill and a fuel invoice to build Scope 1 and 2."
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
                    <li key={u._id} className="flex items-center gap-3 px-4 py-3">
                      <FileText size={14} className="shrink-0 text-fg-faint" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-fg">
                          {u.originalName || `${u.fileType} document`}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-fg-faint">
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
                  <Link
                    to="/report"
                    className="text-[12.5px] font-medium text-forge-bright hover:underline"
                  >
                    Open report
                  </Link>
                ) : undefined
              }
            >
              {latest ? (
                <div>
                  <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
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
                      <div key={s.l} className="bg-panel px-3 py-3">
                        <div className="text-[12.5px] uppercase tracking-[0.06em] text-fg-faint">
                          {s.l}
                        </div>
                        <div
                          className={`num mt-1 text-[16px] ${s.tone ?? 'text-fg'}`}
                        >
                          {s.v}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {latest.selectedInterventions.map((i) => (
                      <span
                        key={i.id}
                        className="border border-line bg-elevated px-1.5 py-1 text-[13px] text-fg-dim"
                      >
                        {i.name}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-line pt-3 text-[12.5px] leading-relaxed text-fg-faint">
                    Cuts {tonnes(latest.totalAbatement)} tCO₂e a year —{' '}
                    {(
                      (latest.totalAbatement / baseline.totalEmissions) *
                      100
                    ).toFixed(1)}
                    % of the annual baseline.
                  </p>
                </div>
              ) : (
                <div className="py-3">
                  <p className="text-[13.5px] text-fg">
                    No investment plan yet.
                  </p>
                  <p className="mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-fg-dim">
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
