import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Factory,
  Gauge,
  Globe2,
} from 'lucide-react'
import { PageHeader, Panel, Stat, Bar, BenchmarkGauge } from '../components/ui'
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
        description="A deterministic footprint built from bills, statutory emission factors and a full evidence trail behind every tonne."
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="pill">
              <Factory size={12} className="text-[#64748b]" />
              {activeCompany.name}
            </span>
            <span className="pill">
              {activeCompany.annualProduction.toLocaleString('en-IN')}{' '}
              {activeCompany.productionUnit}/yr
            </span>
            <span className="pill">{activeCompany.state}</span>
          </div>
        }
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

      <div className="mb-5 grid grid-cols-1 gap-3.5 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Annual emissions"
          value={tonnes(activeBaseline.totalEmissions)}
          unit="tCO₂e"
          hint={`${scope1Pct}% Scope 1 · ${scope2Pct}% Scope 2`}
          tone="accent"
          icon={<Activity size={14} />}
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
          icon={<Gauge size={14} />}
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
          icon={<Globe2 size={14} />}
        />
        <Stat
          label="Export share"
          value={`${activeCompany.exportShare}%`}
          unit="of output"
          hint={activeCompany.exportDestination || 'Domestic only'}
          tone="muted"
          icon={<Globe2 size={14} />}
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <div className="min-w-0 space-y-5">
          <Panel
            title="Scope split"
            meta="tCO₂e per year"
            accent
            action={
              <span className="num text-[11.5px] font-semibold text-[#5b6b82]">
                {tonnes(activeBaseline.scope1 + activeBaseline.scope2)} tCO₂e
              </span>
            }
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5b6b82]">
                  Total Scope 1 + 2
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="figure text-[32px] leading-none text-fg">
                    {tonnes(activeBaseline.totalEmissions)}
                  </span>
                  <span className="text-[13px] font-semibold text-fg-faint">
                    tCO₂e
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-fg-dim">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-forge" />
                  Scope 1 · {scope1Pct}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-jade" />
                  Scope 2 · {scope2Pct}%
                </span>
              </div>
            </div>

            <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-[#edf1f6]">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: 'Scope 1 — direct combustion',
                  value: activeBaseline.scope1,
                  pct: scope1Pct,
                  tone: 'forge' as const,
                  note: 'Fuel burned on site, plus process emissions.',
                },
                {
                  label: 'Scope 2 — purchased electricity',
                  value: activeBaseline.scope2,
                  pct: scope2Pct,
                  tone: 'jade' as const,
                  note: 'Grid kWh × state emission factor.',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-[9px] border border-line bg-[#fbfcfe] p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.05em] text-[#52627a]">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          s.tone === 'forge' ? 'bg-forge' : 'bg-jade'
                        }`}
                      />
                      {s.label}
                    </span>
                    <span className="num text-[11.5px] font-semibold text-[#5b6b82]">
                      {s.pct}%
                    </span>
                  </div>
                  <div className="num mt-2 text-[19px] font-semibold leading-none text-fg">
                    {tonnes(s.value)}
                    <span className="ml-1 font-sans text-[11.5px] font-medium text-[#5b6b82]">
                      tCO₂e
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <Bar
                      value={s.value}
                      max={activeBaseline.totalEmissions}
                      tone={s.tone}
                      height={5}
                    />
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-[#64748b]">
                    {s.note}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Evidence trail"
            meta={`${activeBaseline.evidenceTrail.length} entries · click to inspect`}
            flush
          >
            <div className="grid grid-cols-[34px_1fr_132px_18px] gap-3 border-b border-line bg-[#fbfcfe] px-5 py-2.5">
              <span className="text-right text-[10px] font-bold uppercase tracking-[0.09em] text-[#5b6b82]">
                #
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#5b6b82]">
                Figure
              </span>
              <span className="text-right text-[10px] font-bold uppercase tracking-[0.09em] text-[#5b6b82]">
                Value
              </span>
              <span />
            </div>
            <ul>
              {activeBaseline.evidenceTrail.map(
                (e: EvidenceEntry, i: number) => (
                  <li key={i} className="border-b border-[#eff2f7] last:border-b-0">
                    <button
                      onClick={() => setOpen(open === i ? null : i)}
                      aria-expanded={open === i}
                      className="w-full px-5 py-3 text-left transition-colors hover:bg-[#fbfcfe]"
                    >
                      <div className="grid grid-cols-[34px_1fr_132px_18px] items-center gap-3">
                        <span className="num text-right text-[11.5px] font-medium text-[#64748b]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 truncate text-[12.5px] font-medium text-fg">
                          {e.figure}
                        </span>
                        <span className="num text-right text-[12px] font-semibold text-forge-bright">
                          {e.value.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          <span className="text-[10.5px] font-medium text-[#5b6b82]">
                            {e.unit}
                          </span>
                        </span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-[#5b6b82]">
                          <ChevronDown
                            size={11}
                            className={`transition-transform duration-200 ${
                              open === i ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </div>
                    </button>
                    {open === i && (
                      <div className="grid gap-4 border-t border-line bg-[#fbfcfe] px-5 py-4 pl-[4.6rem] sm:grid-cols-2">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5b6b82]">
                            Calculation
                          </div>
                          <div className="num mt-1.5 rounded-[6px] border border-line bg-white px-2.5 py-2 text-[11.5px] leading-relaxed text-fg-dim">
                            {e.calculation}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5b6b82]">
                            Emission factor
                          </div>
                          <span className="num mt-1.5 inline-flex rounded-[5px] border border-line bg-white px-2 py-1 text-[11px] font-medium text-fg-dim">
                            {e.emissionFactorId}
                          </span>
                        </div>
                      </div>
                    )}
                  </li>
                ),
              )}
            </ul>
            <div className="flex items-center gap-2 border-t border-line bg-[#fbfcfe] px-5 py-2.5 text-[11px] text-[#5b6b82]">
              <span className="h-1 w-1 rounded-full bg-forge" />
              Every figure links back to its source document and factor ID.
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-[76px]">
          <Panel title="Benchmark position" meta="tCO₂e per tonne">
            <BenchmarkGauge
              value={activeBaseline.carbonIntensity}
              median={activeBaseline.sectorMedian}
            />
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-[12px] font-medium text-fg-dim">
                Gap to median
              </span>
              <span
                className={`num rounded-[5px] border px-2 py-0.5 text-[11.5px] font-bold ${
                  aheadOfMedian
                    ? 'border-[#cbe6d5] bg-[#f2fbf5] text-jade'
                    : 'border-[#efdfae] bg-[#fffbeb] text-amber'
                }`}
              >
                {gap > 0 ? '+' : ''}
                {gap.toFixed(0)}%
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">
              {aheadOfMedian
                ? 'Below the sector median. That is a selling point with buyers — and it still leaves abatement on the table.'
                : 'Above the sector median. Buyers comparing suppliers will notice, and CBAM exposure scales with this number.'}
            </p>
          </Panel>

          <div className="rounded-[12px] border border-[#f0e2b6] bg-[#fffbeb] p-5 shadow-[0_1px_2px_rgba(10,18,34,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#92400e]">
                <Globe2 size={13} />
                CBAM exposure
              </span>
              <span className="rounded-full border border-[#eedda8] bg-white px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#92400e]">
                EU importer cost
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="figure text-[34px] leading-none text-[#78350f]">
                {inr(activeBaseline.cbamExposure)}
              </span>
              <span className="text-[12px] font-semibold text-[#b45309]">
                / yr
              </span>
            </div>
            <div className="mt-4 divide-y divide-[#f3e6bd] border-y border-[#f3e6bd] text-[12px]">
              <div className="flex items-center justify-between py-2">
                <span className="font-medium text-[#7c5a23]">
                  Exported tonnage
                </span>
                <span className="num font-semibold text-[#713f12]">
                  {tonnes(
                    activeCompany.annualProduction *
                      (activeCompany.exportShare / 100),
                  )}{' '}
                  t
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-medium text-[#7c5a23]">
                  Embedded intensity
                </span>
                <span className="num font-semibold text-[#713f12]">
                  {activeBaseline.carbonIntensity.toFixed(2)} t/t
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-medium text-[#7c5a23]">Carbon price</span>
                <span className="num font-semibold text-[#713f12]">
                  €{activeBaseline.euCarbonPrice}/t
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-[#7c5a23]">
              Exported tonnage × carbon intensity × €
              {activeBaseline.euCarbonPrice}/tCO₂, converted at ₹97/€. The
              obligation sits with your EU importer; this sizes the cost they
              pass back through price.
            </p>
            <div className="mt-3">
              <span className="inline-flex items-center rounded-full border border-[#eedda8] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#92400e]">
                Estimate, not a liability
              </span>
            </div>
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
