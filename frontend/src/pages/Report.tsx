import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText, RefreshCw } from 'lucide-react'
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

  return (
    <>
      <PageHeader
        title="Report"
        description="One document. Baseline, exposure, portfolio, projection, and the evidence trail behind every figure."
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
            {reportId && (
              <a
                href={reportDownloadUrl(reportId)}
                className="btn btn-primary"
                download
              >
                <Download size={15} />
                Download PDF
              </a>
            )}
          </div>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden">
          <header className="flex h-10 flex-wrap items-center gap-3 border-b border-line bg-elevated px-4">
            <FileText size={14} className="text-fg-faint" />
            <h2 className="panel-title">Document preview</h2>
            <span className="hidden text-[13px] text-fg-faint sm:inline">
              A4 · carbon baseline & investment plan
            </span>
            <div className="ml-auto">
              {html ? (
                <Badge tone="jade">Generated</Badge>
              ) : (
                <Badge>Not generated</Badge>
              )}
            </div>
          </header>

          {html ? (
            <iframe
              title="Report preview"
              srcDoc={html}
              className="w-full bg-white"
              style={{
                height: 'min(76vh, 880px)',
                minHeight: 520,
                border: 0,
              }}
            />
          ) : (
            <div className="px-6 py-24 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-line bg-elevated text-fg-faint">
                <FileText size={22} />
              </div>
              <p className="text-[14px] font-medium text-fg">
                No document yet.
              </p>
              <p className="mb-5 mt-1 text-[13px] text-fg-dim">
                Generate the PDF from your latest simulation.
              </p>
              <button
                onClick={onGenerate}
                disabled={busy || !sim}
                className="btn btn-primary"
              >
                {busy ? 'Generating…' : 'Generate report'}
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mx-4 my-3 border border-red/30 border-l-[3px] border-l-red bg-red/10 px-3 py-2 text-[12.5px] text-red"
            >
              {error}
            </div>
          )}

          <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-elevated px-4 py-2.5 text-[13px] text-fg-faint">
            <span className="h-1.5 w-1.5 bg-forge" aria-hidden="true" />
            Evidence trail, not a verification opinion.
            {reportId && (
              <span className="num ml-auto text-[12px]">
                REPORT {reportId.slice(-8).toUpperCase()}
              </span>
            )}
          </footer>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title="Summary" meta="FY 2026–27" flush>
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="text-fg-dim">Company</td>
                  <td className="max-w-[180px] truncate text-right text-fg">
                    {activeCompany.name}
                  </td>
                </tr>
                <tr>
                  <td className="text-fg-dim">Emissions</td>
                  <td className="num text-right text-fg">
                    {tonnes(activeBaseline.totalEmissions)} t
                  </td>
                </tr>
                <tr>
                  <td className="text-fg-dim">Intensity</td>
                  <td className="num text-right text-fg">
                    {activeBaseline.carbonIntensity.toFixed(2)} t/t
                  </td>
                </tr>
                {sim && (
                  <>
                    <tr>
                      <td className="text-fg-dim">Portfolio</td>
                      <td className="num text-right text-fg">
                        {inr(sim.totalCapex)}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-fg-dim">Abated</td>
                      <td className="num text-right text-jade">
                        {tonnes(sim.totalAbatement)} t
                      </td>
                    </tr>
                    <tr>
                      <td className="text-fg-dim">Payback</td>
                      <td className="num text-right text-fg">
                        {sim.blendedPayback} yrs
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Inside the document" flush>
            <ul className="divide-y divide-line px-4 text-[12.5px]">
              {[
                'Baseline and scope split',
                'CBAM exposure in rupees',
                'Ranked investment portfolio',
                'Five-year projection',
                'Line-level evidence trail',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 py-2.5">
                  <span className="h-1 w-1 shrink-0 bg-forge" />
                  <span className="text-fg-dim">{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="rounded-[8px] border-2 border-[#FDE047] bg-[#FEFCE8] p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#CA8A04]">
              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 11.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Credibility boundary
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#713F12]">
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
          </button>
        </div>
      </div>
    </>
  )
}
