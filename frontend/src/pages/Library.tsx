import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Info,
  Layers,
  Leaf,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react'
import { PageHeader, Panel, Empty, Stat, Badge, Bar } from '../components/ui'
import { getInterventions } from '../lib/api'
import { inr, tonnes } from '../lib/format'
import { useSession } from '../lib/session'
import type { Intervention, Sector } from '../lib/types'

const LIFE_YEARS = 10

const SECTORS: { id: Sector; label: string }[] = [
  { id: 'steel', label: 'Steel' },
  { id: 'cement', label: 'Cement' },
  { id: 'textile', label: 'Textile' },
  { id: 'chemical', label: 'Chemicals' },
  { id: 'auto-component', label: 'Auto components' },
  { id: 'foundry', label: 'Foundry' },
  { id: 'paper', label: 'Paper & pulp' },
  { id: 'other', label: 'Other' },
]

const CATEGORY: Record<
  string,
  {
    label: string
    tone: 'jade' | 'renewable' | 'material' | 'process' | 'neutral'
  }
> = {
  energy_efficiency: { label: 'Energy efficiency', tone: 'jade' },
  renewable: { label: 'Renewable', tone: 'renewable' },
  material: { label: 'Material', tone: 'material' },
  process: { label: 'Process', tone: 'process' },
}

function netPerTonne(i: Intervention) {
  const lifetime = i.co2Abated * LIFE_YEARS
  if (lifetime <= 0) return 0
  return (i.capex - i.annualSavings * LIFE_YEARS) / lifetime
}

export function LibraryPage() {
  const navigate = useNavigate()
  const { company } = useSession()
  const [selectedSector, setSelectedSector] = useState<Sector>(
    company?.sector || 'steel',
  )
  const [items, setItems] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (company?.sector && company.sector !== selectedSector) {
      setSelectedSector(company.sector)
    }
  }, [company?.sector])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getInterventions(selectedSector)
      .then((list) => {
        if (!alive) return
        setItems([...list].sort((a, b) => netPerTonne(a) - netPerTonne(b)))
      })
      .catch(() => {
        if (!alive) return
        setError('Could not load the intervention library.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [selectedSector])

  const totalCapex = items.reduce((s, i) => s + i.capex, 0)
  const totalAbated = items.reduce((s, i) => s + i.co2Abated, 0)
  const totalSavings = items.reduce((s, i) => s + i.annualSavings, 0)
  const maxAbated = Math.max(...items.map((i) => i.co2Abated), 1)
  const bestNet = items.length
    ? items.reduce((best, i) =>
        netPerTonne(i) < netPerTonne(best) ? i : best,
      )
    : null
  const largest = items.length
    ? items.reduce((best, i) => (i.co2Abated > best.co2Abated ? i : best))
    : null
  const sectorLabel =
    SECTORS.find((s) => s.id === selectedSector)?.label || selectedSector

  return (
    <>
      <PageHeader
        title="Intervention library"
        description="Industrial decarbonisation measures with indicative capital, operating savings and abatement potential."
        action={
          <button
            onClick={() => navigate('/simulate')}
            className="btn btn-primary"
          >
            <SlidersHorizontal size={14} />
            Run simulation
            <ArrowRight size={15} />
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5b6b82]">
          Sector catalogue
        </span>
        <div className="flex max-w-full flex-wrap gap-1 rounded-[9px] border border-line bg-white p-1 shadow-[0_1px_2px_rgba(10,18,34,0.03)]">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSector(s.id)}
              className={`rounded-[6px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-all ${
                selectedSector === s.id
                  ? 'bg-[#0b1324] text-white shadow-sm'
                  : 'text-[#64748b] hover:bg-elevated hover:text-fg'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Catalogue options"
          value={String(items.length)}
          unit="measures"
          hint={`Verified for ${sectorLabel}`}
          tone="muted"
          icon={<Layers size={14} />}
        />
        <Stat
          label="Total capital"
          value={inr(totalCapex)}
          hint="Full catalogue expenditure"
          tone="accent"
          icon={<Wallet size={14} />}
        />
        <Stat
          label="Potential abatement"
          value={`${tonnes(totalAbated)} t`}
          hint="Per year at operational run"
          tone="positive"
          icon={<Leaf size={14} />}
        />
      </div>

      <Panel
        title={`Interventions — ${sectorLabel}`}
        meta="10-year asset life · ranked by net return"
        flush
        action={
          <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-line bg-elevated px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#52627a]">
            <span className="h-1.5 w-1.5 rounded-full bg-jade" />
            Best return first
          </span>
        }
      >
        {loading ? (
          <div className="divide-y divide-line" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex h-[52px] items-center gap-4 px-5">
                <span className="skeleton h-3 w-44 rounded" />
                <span className="skeleton h-3 w-20 rounded" />
                <span className="ml-auto skeleton h-3 w-16 rounded" />
                <span className="skeleton h-3 w-16 rounded" />
                <span className="skeleton h-3 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Empty title="Library unavailable" body={error} />
        ) : items.length === 0 ? (
          <Empty
            title="No interventions found"
            body={`No specific measures found for ${selectedSector}.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Intervention</th>
                  <th>Category</th>
                  <th className="text-right">Capex</th>
                  <th className="text-right">Annual saving</th>
                  <th className="text-right">Abatement</th>
                  <th className="text-right">Payback</th>
                  <th className="text-right">Net ₹ / t</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const net = netPerTonne(i)
                  const cat = CATEGORY[i.category] ?? {
                    label: i.category,
                    tone: 'neutral' as const,
                  }
                  return (
                    <tr key={i.id}>
                      <td className="whitespace-nowrap font-semibold">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#0f172a]" />
                          {i.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <Badge tone={cat.tone}>{cat.label}</Badge>
                      </td>
                      <td className="num whitespace-nowrap text-right text-fg-dim">
                        {inr(i.capex)}
                      </td>
                      <td className="num whitespace-nowrap text-right font-semibold text-jade">
                        {inr(i.annualSavings)}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="flex items-center justify-end gap-2">
                          <span className="num text-[12.5px] font-semibold text-fg">
                            {tonnes(i.co2Abated)} t
                          </span>
                          <span className="hidden w-14 sm:block">
                            <Bar
                              value={i.co2Abated}
                              max={maxAbated}
                              tone={net <= 0 ? 'jade' : 'amber'}
                              height={4}
                            />
                          </span>
                        </span>
                      </td>
                      <td className="num whitespace-nowrap text-right text-fg-dim">
                        {i.payback} yr
                      </td>
                      <td
                        className={`num whitespace-nowrap text-right font-semibold ${
                          net <= 0 ? 'text-jade' : 'text-amber'
                        }`}
                      >
                        {net > 0 ? '+' : '−'}
                        {Math.round(Math.abs(net)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {!loading && !error && bestNet && largest && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Best net return',
              value: `−₹${Math.abs(Math.round(netPerTonne(bestNet))).toLocaleString('en-IN')}`,
              unit: '/ tCO₂e',
              hint: `${bestNet.name} · ${bestNet.payback} yr payback`,
              tone: 'text-jade',
            },
            {
              label: 'Largest abatement',
              value: tonnes(largest.co2Abated),
              unit: 'tCO₂e / yr',
              hint: `${largest.name} · ${largest.payback} yr payback`,
              tone: 'text-fg',
            },
            {
              label: 'Aggregate annual savings',
              value: inr(totalSavings),
              unit: '/ yr',
              hint: `Across all ${items.length} measures in the catalogue`,
              tone: 'text-fg',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-[10px] border border-line bg-[#fbfcfe] px-4 py-3.5"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#5b6b82]">
                {s.label}
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                <span className={`figure text-[21px] leading-none ${s.tone}`}>
                  {s.value}
                </span>
                <span className="text-[11.5px] font-semibold text-[#5b6b82]">
                  {s.unit}
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] font-medium leading-snug text-fg-dim">
                {s.hint}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex max-w-[86ch] items-start gap-2.5 text-[11.5px] leading-relaxed text-[#5b6b82]">
        <Info size={13} className="mt-0.5 shrink-0" />
        <p>
          Net ₹/t = (Capex − 10 × annual saving) ÷ (10 × annual abatement). Capex
          benchmarks from CEA, BEE and vendor quotes across Indian industrial
          clusters. Simulate custom budgets and payback ceilings in the
          simulation engine.
        </p>
      </div>
    </>
  )
}
