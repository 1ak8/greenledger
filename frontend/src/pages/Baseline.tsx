import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  PageHeader,
  Panel,
  Stat,
  Bar,
  BenchmarkGauge,
} from '../components/ui'
import { getBaseline } from '../lib/api'
import { inr, tonnes } from '../lib/format'
import { DEMO_BASELINE, DEMO_COMPANY, useSession } from '../lib/session'
import type { EvidenceEntry } from '../lib/types'

export function BaselinePage() {
  const navigate = useNavigate()
  const { company, baseline, setBaseline, loadDemo } = useSession()
  const [open, setOpen] = useState<number | null>(null)

  const activeCompany = company || DEMO_COMPANY
  const activeBaseline = baseline || DEMO_BASELINE

  useEffect(() => {
    if (!company) {
      loadDemo()
      return
    }
    if (!baseline) {
      getBaseline(company._id)
        .then(setBaseline)
        .catch(() => {})
    }
  }, [company, baseline, loadDemo, setBaseline])

  const aheadOfMedian =
    activeBaseline.carbonIntensity < activeBaseline.sectorMedian
  const gap =
    activeBaseline.sectorMedian > 0
      ? ((activeBaseline.carbonIntensity - activeBaseline.sectorMedian) /
          activeBaseline.sectorMedian) *
        100
      : 0
  const maxScope = Math.max(activeBaseline.scope1, activeBaseline.scope2, 1)
  const scope1Pct = Math.round(
    (activeBaseline.scope1 / activeBaseline.totalEmissions) * 100,
  )
  const scope2Pct = Math.round(
    (activeBaseline.scope2 / activeBaseline.totalEmissions) * 100,
  )

  return (
    <>
      <PageHeader
        title="Carbon baseline"
        description={`${activeCompany.name} · ${activeCompany.annualProduction.toLocaleString(
          'en-IN',
        )} ${activeCompany.productionUnit} a year · ${activeCompany.state}`}
        action={
          <button
            onClick={() => navigate('/simulate')}
            className="btn btn-primary"
          >
            Simulate investments
            <ArrowRight size={15} />
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Annual emissions"
          value={tonnes(activeBaseline.totalEmissions)}
          unit="tCO₂e"
          hint={`${scope1Pct}% Scope 1 · ${scope2Pct}% Scope 2`}
          tone="accent"
          bar={scope1Pct}
          barTone="forge"
        />
        <Stat
          label="Carbon intensity"
          value={activeBaseline.carbonIntensity.toFixed(2)}
          unit="tCO₂e / t"
          hint={`${Math.abs(gap).toFixed(0)}% ${
            gap <= 0 ? 'below' : 'above'
          } sector median`}
          tone={aheadOfMedian ? 'positive' : 'alert'}
          bar={
            (activeBaseline.carbonIntensity /
              (activeBaseline.sectorMedian * 1.6)) *
            100
          }
          barTone={aheadOfMedian ? 'jade' : 'amber'}
        />
        <Stat
          label="CBAM exposure"
          value={inr(activeBaseline.cbamExposure)}
          unit="/ yr"
          hint={`At €${activeBaseline.euCarbonPrice}/tCO₂`}
          tone="alert"
        />
        <Stat
          label="Export share"
          value={`${activeCompany.exportShare}%`}
          unit="of output"
          hint={activeCompany.exportDestination || 'Domestic only'}
          tone="muted"
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Panel
            title="Scope split"
            meta="tCO₂e per year"
            accent
          >
            <div className="space-y-7">
              {[
                {
                  label: 'Scope 1 — Direct combustion',
                  value: activeBaseline.scope1,
                  pct: scope1Pct,
                  tone: 'forge' as const,
                  note: 'Fuel burned on site, plus process emissions.',
                },
                {
                  label: 'Scope 2 — Purchased electricity',
                  value: activeBaseline.scope2,
                  pct: scope2Pct,
                  tone: 'jade' as const,
                  note: 'Grid kWh × state emission factor.',
                },
              ].map((s) => (
                <div key={s.label}>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[13px] font-medium text-fg">
                      {s.label}
                    </span>
                    <span className="num ml-auto text-[15px] text-fg">
                      {tonnes(s.value)}
                    </span>
                    <span className="num w-12 text-right text-[12.5px] text-fg-faint">
                      {s.pct}%
                    </span>
                  </div>
                  <Bar value={s.value} max={maxScope} tone={s.tone} height={8} />
                  <p className="mt-2 text-[12.5px] text-fg-faint">{s.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-[13px] uppercase tracking-[0.06em] text-fg-faint">
                Total Scope 1 + 2
              </span>
              <span className="num text-[13px] text-fg">
                {tonnes(
                  activeBaseline.scope1 + activeBaseline.scope2,
                )}{' '}
                tCO₂e
              </span>
            </div>
          </Panel>

          <Panel
            title="Evidence trail"
            meta={`${activeBaseline.evidenceTrail.length} entries · click to inspect`}
            flush
          >
            <div className="grid grid-cols-[32px_1fr_126px_14px] gap-3 border-b border-line bg-elevated px-4 py-2 text-[12.5px] font-medium uppercase tracking-[0.07em] text-fg-faint">
              <span className="text-right">#</span>
              <span>Figure</span>
              <span className="text-right">Value</span>
              <span />
            </div>
            <ul>
              {activeBaseline.evidenceTrail.map(
                (e: EvidenceEntry, i: number) => (
                  <li
                    key={i}
                    className={i % 2 === 0 ? 'bg-panel' : 'bg-[#FDFBF6]'}
                  >
                    <button
                      onClick={() => setOpen(open === i ? null : i)}
                      aria-expanded={open === i}
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-elevated"
                    >
                      <div className="grid grid-cols-[32px_1fr_126px_14px] items-center gap-3">
                        <span className="num text-right text-[13px] text-iron">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 truncate text-[13px] text-fg">
                          {e.figure}
                        </span>
                        <span className="num text-right text-[13px] text-forge-bright">
                          {e.value.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          <span className="text-[12.5px] text-fg-faint">
                            {e.unit}
                          </span>
                        </span>
                        <svg
                          viewBox="0 0 12 12"
                          className={`h-3 w-3 text-fg-faint transition-transform ${
                            open === i ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M2.5 4.5 6 8l3.5-3.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </button>
                    {open === i && (
                      <div className="grid gap-4 border-l-[3px] border-forge bg-elevated px-4 py-4 pl-[3.25rem] sm:grid-cols-2">
                        <div>
                          <div className="text-[12.5px] font-medium uppercase tracking-[0.07em] text-fg-faint">
                            Calculation
                          </div>
                          <div className="num mt-1.5 text-[12.5px] leading-relaxed text-fg-dim">
                            {e.calculation}
                          </div>
                        </div>
                        <div>
                          <div className="text-[12.5px] font-medium uppercase tracking-[0.07em] text-fg-faint">
                            Emission factor
                          </div>
                          <div className="num mt-1.5 text-[12.5px] text-fg-dim">
                            {e.emissionFactorId}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ),
              )}
            </ul>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-2">
          <Panel title="Benchmark position" meta="10-yr sector view">
            <BenchmarkGauge
              value={activeBaseline.carbonIntensity}
              median={activeBaseline.sectorMedian}
            />
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] text-fg-dim">
                  Gap to median
                </span>
                <span
                  className={`num text-[13px] ${
                    aheadOfMedian ? 'text-jade' : 'text-amber'
                  }`}
                >
                  {gap > 0 ? '+' : ''}
                  {gap.toFixed(0)}%
                </span>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-fg-dim">
                {aheadOfMedian
                  ? 'Below the sector median. That is a selling point with buyers — and it still leaves abatement on the table.'
                  : 'Above the sector median. Buyers comparing suppliers will notice, and CBAM exposure scales with this number.'}
              </p>
            </div>
          </Panel>

          <div className="rounded-[8px] border-2 border-[#FDE047] bg-[#FEFCE8] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-bold uppercase tracking-tight text-[#CA8A04]">
                CBAM Exposure
              </span>
              <span className="rounded-full border border-[#FDE047] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#CA8A04]">
                EU Importer Cost
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="num text-[36px] font-bold leading-none text-[#A16207]">
                {inr(activeBaseline.cbamExposure)}
              </span>
              <span className="text-[12.5px] font-medium text-[#CA8A04]">/ yr</span>
            </div>
            <div className="mt-4 divide-y divide-[#FEF08A] border-y border-[#FEF08A] text-[12.5px]">
              <div className="flex items-center justify-between py-2">
                <span className="text-[#854D0E]">Exported tonnage</span>
                <span className="num font-semibold text-[#713F12]">
                  {tonnes(
                    activeCompany.annualProduction *
                      (activeCompany.exportShare / 100),
                  )}{' '}
                  t
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#854D0E]">Embedded intensity</span>
                <span className="num font-semibold text-[#713F12]">
                  {activeBaseline.carbonIntensity.toFixed(2)} t/t
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#854D0E]">Carbon price</span>
                <span className="num font-semibold text-[#713F12]">
                  €{activeBaseline.euCarbonPrice}/t
                </span>
              </div>
            </div>
            <div className="mt-3.5">
              <span className="inline-flex items-center rounded-full border border-[#FDE047] bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#CA8A04]">
                Estimate, not a liability
              </span>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-[#854D0E]">
              Exported tonnage × carbon intensity × €{activeBaseline.euCarbonPrice}
              /tCO₂, converted at ₹97/€. The obligation sits with your EU
              importer; this sizes the cost they pass back through price.
            </p>
          </div>

          <button
            onClick={() => navigate('/simulate')}
            className="btn btn-secondary h-11 w-full"
          >
            Continue to simulation
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
