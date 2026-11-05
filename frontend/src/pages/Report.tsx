import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { PageHeader, Panel, Badge } from '../components/ui'
import {
  generateReport,
  getSimulations,
  reportDownloadUrl,
  simulate,
} from '../lib/api'
import { inr, tonnes } from '../lib/format'
import { DEMO_BASELINE, DEMO_COMPANY, useSession } from '../lib/session'
import type { Simulation } from '../lib/types'

const CONTENTS = [
  'Baseline and scope split',
  'CBAM exposure in rupees',
  'Ranked investment portfolio',
  'Five-year projection',
  'Line-level evidence trail',
]

export function ReportPage() {
  const navigate = useNavigate()
  const { company, baseline, loadDemo } = useSession()

  const activeCompany = company || DEMO_COMPANY
  const activeBaseline = baseline || DEMO_BASELINE

  const [sim, setSim] = useState<Simulation | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoRan = useRef(false)

  useEffect(() => {
    if (!company) {
      loadDemo()
    }
  }, [company, loadDemo])

  useEffect(() => {
    let alive = true
    getSimulations(activeCompany._id)
      .then(async (list) => {
        if (!alive) return
        const storedId = sessionStorage.getItem('carbontwin.simulationId')
        let chosen =
          list.find((s) => s._id === storedId) ??
          list.find((s) => s.pinned) ??
          list[0]

        if (!chosen) {
          const res = await simulate({
            companyId: activeCompany._id,
            baselineId: activeBaseline._id,
            baselineEmissions: activeBaseline.totalEmissions,
            budget: 22000000,
            paybackCeiling: 5,
            tariff: activeCompany.powerTariff ?? 8,
            tariffEscalation: 5,
            sector: activeCompany.sector,
            persist: true,
          })
          chosen = res.simulation
        }
        if (alive && chosen) setSim(chosen)
      })
      .catch(async () => {
        if (!alive) return
        try {
          const res = await simulate({
            companyId: activeCompany._id,
            baselineId: activeBaseline._id,
            baselineEmissions: activeBaseline.totalEmissions,
            budget: 22000000,
            paybackCeiling: 5,
            tariff: activeCompany.powerTariff ?? 8,
            tariffEscalation: 5,
            sector: activeCompany.sector,
            persist: true,
          })
          if (alive) setSim(res.simulation)
        } catch {
          // silent fallback
        }
      })
    return () => {
      alive = false
    }
  }, [activeCompany, activeBaseline])

  const onGenerate = useCallback(async () => {
    if (!sim) return
    setBusy(true)
    setError(null)
    try {
      const res = await generateReport({
        companyId: activeCompany._id,
        baselineId: activeBaseline._id,
        simulationId: sim._id,
      })
      setHtml(res.html)
      setReportId(res.report._id)
    } catch {
      setError('Could not generate the report.')
    } finally {
      setBusy(false)
    }
  }, [activeCompany, activeBaseline, sim])

  useEffect(() => {
    if (sim && !autoRan.current) {
      autoRan.current = true
      onGenerate()
    }
  }, [sim, onGenerate])

  const summaryRows: { label: string; value: string; tone?: string }[] = [
    { label: 'Company', value: activeCompany.name },
    {
      label: 'Annual output',
      value: `${tonnes(activeCompany.annualProduction)} ${activeCompany.productionUnit}`,
    },
    {
      label: 'Emissions',
      value: `${tonnes(activeBaseline.totalEmissions)} tCO₂e`,
    },
    {
      label: 'Intensity',
      value: `${activeBaseline.carbonIntensity.toFixed(2)} t/t`,
    },
    ...(sim
      ? [
          { label: 'Portfolio capital', value: inr(sim.totalCapex) },
          {
            label: 'Abated',
            value: `${tonnes(sim.totalAbatement)} tCO₂e`,
            tone: 'text-jade',
          },
          { label: 'Blended payback', value: `${sim.blendedPayback} yrs` },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Report"
        description="One document. Baseline, exposure, portfolio, projection, and the evidence trail behind every figure."
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="pill">
              <FileText size={12} className="text-[#64748b]" />
              Green Ledger Report
            </span>
            <span className="pill">A4 · PDF</span>
            <span className="pill">FY 2026–27</span>
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerate}
              disabled={busy || !sim}
              className="btn btn-secondary"
            >
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
              {busy ? 'Generating…' : html ? 'Regenerate' : 'Generate'}
            </button>
            {reportId ? (
              <a
                href={reportDownloadUrl(reportId)}
                className="btn btn-primary"
                download
              >
                <Download size={15} />
                Download PDF
              </a>
            ) : (
              <button className="btn btn-primary" disabled>
                <Download size={15} />
                Download PDF
              </button>
            )}
          </div>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card overflow-hidden">
          <header className="flex items-center gap-3 border-b border-line bg-[#fbfcfe] px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-line bg-white text-fg-dim shadow-[0_1px_2px_rgba(10,18,34,0.03)]">
              <FileText size={16} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="panel-title truncate">Green Ledger Report</h2>
              <p className="mt-0.5 truncate text-[11.5px] font-medium text-[#5b6b82]">
                Carbon baseline & investment plan · {activeCompany.name}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {html ? (
                <Badge tone="jade">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-jade" />
                  Generated
                </Badge>
              ) : (
                <Badge>{busy ? 'Preparing' : 'Not generated'}</Badge>
              )}
            </div>
          </header>

          <div className="bg-[#eef2f7] p-3 sm:p-5">
            {html ? (
              <iframe
                title="Report preview"
                srcDoc={html}
                className="mx-auto block w-full max-w-[820px] rounded-[3px] bg-white shadow-[0_2px_6px_rgba(10,18,34,0.08),0_24px_48px_-24px_rgba(10,18,34,0.25)] ring-1 ring-[#dbe3ee]"
                style={{
                  height: 'min(78vh, 900px)',
                  minHeight: 540,
                  border: 0,
                }}
              />
            ) : (
              <div className="flex min-h-[540px] flex-col items-center justify-center rounded-[6px] border border-dashed border-[#cfd9e6] bg-white/60 px-6 py-16 text-center">
                {busy || !sim ? (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-line bg-white text-forge shadow-[0_1px_2px_rgba(10,18,34,0.04)]">
                      <Loader2 size={19} className="animate-spin" />
                    </span>
                    <p className="mt-4 font-display text-[19px] font-semibold tracking-[-0.025em] text-fg">
                      Preparing the document
                    </p>
                    <p className="mt-1.5 max-w-[44ch] text-[13px] leading-relaxed text-fg-dim">
                      Rendering the baseline, portfolio and evidence trail into
                      the report template.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-line bg-white text-fg-faint shadow-[0_1px_2px_rgba(10,18,34,0.04)]">
                      <FileText size={19} strokeWidth={1.8} />
                    </span>
                    <p className="mt-4 font-display text-[19px] font-semibold tracking-[-0.025em] text-fg">
                      No document yet
                    </p>
                    <p className="mt-1.5 max-w-[44ch] text-[13px] leading-relaxed text-fg-dim">
                      Generate the PDF from your latest simulation. The preview
                      appears here before you download.
                    </p>
                    <button
                      onClick={onGenerate}
                      disabled={busy || !sim}
                      className="btn btn-primary mt-5"
                    >
                      Generate report
                      <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mx-4 mt-3 flex items-start gap-2 rounded-[7px] border border-[#f3d6d6] bg-[#fef5f5] px-3 py-2 text-[12.5px] font-medium text-[#b91c1c]"
            >
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-[#fbfcfe] px-4 py-2.5 text-[11.5px] font-medium text-[#5b6b82]">
            <span className="h-1.5 w-1.5 rounded-full bg-forge" aria-hidden="true" />
            Evidence trail, not a verification opinion.
            {reportId && (
              <span className="num ml-auto text-[10.5px] font-semibold tracking-[0.04em] text-[#52627a]">
                REPORT {reportId.slice(-8).toUpperCase()}
              </span>
            )}
          </footer>
        </div>

        <aside className="min-w-0 space-y-4">
          <Panel title="Summary" meta="Latest plan" flush>
            <dl className="divide-y divide-[#eff2f7]">
              {summaryRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 px-5 py-[11px]"
                >
                  <dt className="shrink-0 text-[12px] font-medium text-[#64748b]">
                    {row.label}
                  </dt>
                  <dd
                    className={`num truncate text-right text-[12.5px] font-semibold ${
                      row.tone ?? 'text-fg'
                    }`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Inside the document" flush>
            <ul className="divide-y divide-[#eff2f7]">
              {CONTENTS.map((item, i) => (
                <li
                  key={item}
                  className="flex items-center gap-3 px-5 py-[11px]"
                >
                  <span className="num w-5 shrink-0 text-[10.5px] font-semibold text-[#64748b]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[12.5px] font-medium text-fg-dim">
                    {item}
                  </span>
                  <Check size={13} className="shrink-0 text-jade" strokeWidth={2.4} />
                </li>
              ))}
            </ul>
          </Panel>

          <div className="rounded-[12px] border border-[#f0e2b6] bg-[#fffbeb] p-4 shadow-[0_1px_2px_rgba(10,18,34,0.03)]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.07em] text-[#92400e]">
              <ShieldAlert size={13} />
              Credibility boundary
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-[#7c5a23]">
              This document is an evidence trail, not a verification opinion.
              Every figure links to its source. An accredited verifier issues
              the final opinion.
            </p>
          </div>

          <button
            onClick={() => navigate('/simulate')}
            className="btn btn-secondary w-full"
          >
            Back to simulation
            <ArrowRight size={14} />
          </button>
        </aside>
      </div>
    </>
  )
}
