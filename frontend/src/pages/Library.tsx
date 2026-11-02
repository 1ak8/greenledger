import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, SlidersHorizontal } from 'lucide-react'
import { PageHeader, Panel, Empty, Stat, Badge } from '../components/ui'
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
  const sectorLabel =
    SECTORS.find((s) => s.id === selectedSector)?.label || selectedSector

  return (
    <>
      <PageHeader
        title="Intervention library"
        description="Industrial decarbonisation measures with indicative capital, operating savings, and abatement potential. Ranked by net rupees saved per tonne abated."
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

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] font-medium uppercase tracking-[0.06em] text-fg-faint">
          Sector catalogue
        </span>
        {SECTORS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSector(s.id)}
            className={`rounded-[2px] border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              selectedSector === s.id
                ? 'border-rail bg-rail text-[#F0EDE5]'
                : 'border-line bg-elevated text-fg-dim hover:border-line-strong hover:text-fg'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Catalogue options"
          value={String(items.length)}
          unit="measures"
          hint={`Verified for ${sectorLabel}`}
          tone="muted"
        />
        <Stat
          label="Total capital"
          value={inr(totalCapex)}
          hint="Full portfolio expenditure"
          tone="accent"
        />
        <Stat
          label="Potential abatement"
          value={`${tonnes(totalAbated)} t`}
          hint="Per year at operational run"
          tone="positive"
        />
      </div>

      <Panel
        title={`Interventions — ${sectorLabel}`}
        meta="10-year asset life · ranked by net return"
        flush
      >
        {loading ? (
          <div className="divide-y divide-line" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex h-11 items-center gap-4 px-4"
              >
                <span className="h-2.5 w-44 animate-pulse bg-elevated" />
                <span className="ml-auto h-2.5 w-16 animate-pulse bg-elevated" />
                <span className="h-2.5 w-16 animate-pulse bg-elevated" />
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
                      <td className="whitespace-nowrap font-medium">
                        {i.name}
                      </td>
                      <td className="whitespace-nowrap">
                        <Badge tone={cat.tone}>{cat.label}</Badge>
                      </td>
                      <td className="num whitespace-nowrap text-right">
                        {inr(i.capex)}
                      </td>
                      <td className="num whitespace-nowrap text-right text-jade">
                        {inr(i.annualSavings)}
                      </td>
                      <td className="num whitespace-nowrap text-right">
                        {tonnes(i.co2Abated)} t
                      </td>
                      <td className="num whitespace-nowrap text-right text-fg-dim">
                        {i.payback} yr
                      </td>
                      <td
                        className={`num whitespace-nowrap text-right font-medium ${
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

      <p className="mt-4 max-w-[80ch] text-[12.5px] leading-relaxed text-fg-faint">
        Capex benchmarks from CEA, BEE, and vendor quotes across Indian
        industrial clusters. Simulate custom budgets and payback ceilings in the
        simulation engine.
      </p>
    </>
  )
}
