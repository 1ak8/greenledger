import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Factory,
  Globe2,
  Play,
  PlugZap,
  Users,
} from 'lucide-react'
import { PageHeader, Panel, Badge } from '../components/ui'
import { createCompany } from '../lib/api'
import { useSession } from '../lib/session'
import type { Sector } from '../lib/types'

const SECTORS: { value: Sector; label: string }[] = [
  { value: 'steel', label: 'Steel' },
  { value: 'cement', label: 'Cement' },
  { value: 'textile', label: 'Textile' },
  { value: 'chemical', label: 'Chemicals' },
  { value: 'auto-component', label: 'Auto components' },
  { value: 'foundry', label: 'Foundry' },
  { value: 'paper', label: 'Paper & pulp' },
  { value: 'other', label: 'Other manufacturing' },
]

const STATES = [
  'Chhattisgarh',
  'Jharkhand',
  'Odisha',
  'Maharashtra',
  'Gujarat',
  'Tamil Nadu',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Rajasthan',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Kerala',
  'Goa',
  'Delhi',
  'Bihar',
]

function SectionLabel({
  icon,
  title,
  hint,
}: {
  icon: ReactNode
  title: string
  hint: string
}) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-line bg-elevated text-[#64748b]">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[12.5px] font-bold uppercase tracking-[0.07em] text-fg-dim">
          {title}
        </h2>
        <p className="mt-0.5 text-[11.5px] leading-snug text-[#5b6b82]">{hint}</p>
      </div>
      <span className="ml-2 mt-3 h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  )
}

export function Company() {
  const navigate = useNavigate()
  const { setCompany, setBaseline, loadDemo } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    sector: 'steel' as Sector,
    state: 'Chhattisgarh',
    annualProduction: '',
    productionUnit: 'tonnes',
    employees: '',
    revenue: '',
    exportShare: '',
    exportDestination: 'Germany',
    powerTariff: '8',
  })

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) return setError('Company name is required.')
    if (!form.annualProduction || Number(form.annualProduction) <= 0)
      return setError('Annual production must be greater than zero.')

    setSubmitting(true)
    try {
      const company = await createCompany({
        name: form.name.trim(),
        sector: form.sector,
        state: form.state,
        annualProduction: Number(form.annualProduction),
        productionUnit: form.productionUnit,
        employees: form.employees ? Number(form.employees) : undefined,
        revenue: form.revenue ? Number(form.revenue) : undefined,
        exportShare: form.exportShare ? Number(form.exportShare) : 0,
        exportDestination: form.exportDestination.trim(),
        powerTariff: Number(form.powerTariff) || 8,
      })
      setCompany(company)
      setBaseline(null)
      navigate('/upload')
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error || 'Could not save the profile. Is the API running?'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const sectorLabel =
    SECTORS.find((s) => s.value === form.sector)?.label ?? form.sector
  const exportShare = Number(form.exportShare) || 0

  return (
    <>
      <PageHeader
        title="Company profile"
        description="Four fields set your emission factors, your sector benchmark and your CBAM exposure. Nothing here is guessed."
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="pill">Step 1 of 3 · Profile</span>
            <span className="pill">Sector defaults</span>
            <span className="pill">State grid factor</span>
          </div>
        }
        action={
          <button
            onClick={async () => {
              await loadDemo()
              navigate('/')
            }}
            className="btn btn-secondary"
          >
            <Play size={13} className="text-jade" fill="currentColor" />
            Load demo factory
          </button>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={onSubmit} className="card overflow-hidden">
          <header className="flex flex-wrap items-center gap-3 border-b border-line bg-[#fbfcfe] px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-[#d4ebdc] bg-[#f2fbf5] text-jade">
              <Building2 size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="eyebrow">Workspace setup</div>
              <h2 className="mt-1 font-display text-[19px] font-semibold tracking-[-0.025em] text-fg">
                Factory profile
              </h2>
            </div>
            <Badge>Step 01 / 03</Badge>
          </header>

          <div className="divide-y divide-line">
            <section className="px-5 py-5 sm:px-6 sm:py-6">
              <SectionLabel
                icon={<Building2 size={14} />}
                title="Identity"
                hint="Selects the benchmark median and the intervention library."
              />
              <div>
                <label htmlFor="name" className="label">
                  Company name
                </label>
                <input
                  id="name"
                  className="field"
                  placeholder="Sharma Steel Pvt Ltd"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  autoComplete="organization"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sector" className="label">
                    Sector
                  </label>
                  <select
                    id="sector"
                    className="field"
                    value={form.sector}
                    onChange={(e) => update('sector', e.target.value)}
                  >
                    {SECTORS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="state" className="label">
                    Plant state
                  </label>
                  <select
                    id="state"
                    className="field"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                  >
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="px-5 py-5 sm:px-6 sm:py-6">
              <SectionLabel
                icon={<Factory size={14} />}
                title="Output"
                hint="Converts total emissions into intensity — the figure CBAM asks for."
              />
              <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                <div>
                  <label htmlFor="production" className="label">
                    Annual production
                  </label>
                  <input
                    id="production"
                    type="number"
                    min="0"
                    className="field num"
                    placeholder="18000"
                    value={form.annualProduction}
                    onChange={(e) => update('annualProduction', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="unit" className="label">
                    Unit
                  </label>
                  <select
                    id="unit"
                    className="field"
                    value={form.productionUnit}
                    onChange={(e) => update('productionUnit', e.target.value)}
                  >
                    <option value="tonnes">tonnes</option>
                    <option value="units">units</option>
                    <option value="kilolitres">kilolitres</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="px-5 py-5 sm:px-6 sm:py-6">
              <SectionLabel
                icon={<Globe2 size={14} />}
                title="Trade exposure"
                hint="Sizes CBAM exposure in rupees. Zero if you sell domestically."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="exportShare" className="label">
                    Export share (%)
                  </label>
                  <input
                    id="exportShare"
                    type="number"
                    min="0"
                    max="100"
                    className="field num"
                    placeholder="20"
                    value={form.exportShare}
                    onChange={(e) => update('exportShare', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="destination" className="label">
                    Primary export destination
                  </label>
                  <input
                    id="destination"
                    className="field"
                    placeholder="Germany"
                    value={form.exportDestination}
                    onChange={(e) =>
                      update('exportDestination', e.target.value)
                    }
                  />
                </div>
              </div>
            </section>

            <section className="px-5 py-5 sm:px-6 sm:py-6">
              <SectionLabel
                icon={<PlugZap size={14} />}
                title="Operating context"
                hint="Power tariff seeds the savings model; the rest is context."
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="tariff" className="label">
                    Power tariff (₹/kWh)
                  </label>
                  <input
                    id="tariff"
                    type="number"
                    step="0.1"
                    min="0"
                    className="field num"
                    value={form.powerTariff}
                    onChange={(e) => update('powerTariff', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="employees" className="label">
                    Employees
                  </label>
                  <input
                    id="employees"
                    type="number"
                    min="0"
                    className="field num"
                    placeholder="400"
                    value={form.employees}
                    onChange={(e) => update('employees', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="revenue" className="label">
                    Revenue (₹ Cr)
                  </label>
                  <input
                    id="revenue"
                    type="number"
                    min="0"
                    className="field num"
                    placeholder="120"
                    value={form.revenue}
                    onChange={(e) => update('revenue', e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          {error && (
            <div
              role="alert"
              className="mx-5 mb-4 flex items-start gap-2 rounded-[7px] border border-[#f3d6d6] bg-[#fef5f5] px-3 py-2 text-[12.5px] font-medium text-[#b91c1c]"
            >
              {error}
            </div>
          )}

          <footer className="flex flex-wrap items-center gap-4 border-t border-line bg-[#fbfcfe] px-5 py-4 sm:px-6">
            <p className="text-[12px] font-medium text-[#5b6b82]">
              Saved to your workspace immediately.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary ml-auto"
            >
              {submitting ? 'Saving…' : 'Continue to upload'}
              {!submitting && <ArrowRight size={15} />}
            </button>
          </footer>
        </form>

        <aside className="min-w-0 space-y-4">
          <Panel title="Profile preview" meta="Live" accent>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-[#d4ebdc] bg-[#f2fbf5] text-jade">
                <Factory size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold leading-tight text-fg">
                  {form.name.trim() || 'Untitled factory'}
                </p>
                <p className="mt-1 text-[11.5px] font-medium text-[#64748b]">
                  {sectorLabel} · {form.state}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Output',
                  value: form.annualProduction
                    ? `${Number(form.annualProduction).toLocaleString('en-IN')} ${form.productionUnit}/yr`
                    : '—',
                },
                {
                  label: 'Exports',
                  value:
                    exportShare > 0
                      ? `${exportShare}% to ${form.exportDestination || '—'}`
                      : 'Domestic only',
                },
                {
                  label: 'Tariff',
                  value: form.powerTariff ? `₹${form.powerTariff}/kWh` : '—',
                },
                {
                  label: 'Team',
                  value: form.employees
                    ? `${Number(form.employees).toLocaleString('en-IN')} people`
                    : '—',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-[8px] border border-line bg-[#fbfcfe] px-3 py-2.5"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#5b6b82]">
                    {s.label}
                  </dt>
                  <dd className="num mt-1 truncate text-[12px] font-semibold text-fg">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-3.5 border-t border-line pt-3 text-[11.5px] leading-relaxed text-[#64748b]">
              These values select the emission factors, benchmark median and
              export exposure used across the workspace.
            </p>
          </Panel>

          <Panel
            title="Why these fields"
            action={<Users size={13} className="text-[#64748b]" />}
          >
            <dl className="divide-y divide-[#eff2f7]">
              {[
                [
                  'State',
                  'Determines the grid emission factor used for Scope 2. A Chhattisgarh unit and a Karnataka unit draw materially different carbon per kWh.',
                ],
                [
                  'Sector',
                  'Selects the benchmark median and the intervention library available to you.',
                ],
                [
                  'Production',
                  'Converts total emissions into intensity — the figure CBAM actually asks for.',
                ],
                [
                  'Export share',
                  'Sizes the CBAM exposure in rupees. Zero if you sell domestically.',
                ],
              ].map(([term, body]) => (
                <div key={term} className="py-3 first:pt-0 last:pb-0">
                  <dt className="text-[12px] font-semibold text-fg">{term}</dt>
                  <dd className="mt-1 text-[11.5px] leading-relaxed text-[#64748b]">
                    {body}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <div className="rounded-[12px] border border-[#d9e5fe] bg-[#f4f8ff] p-4 shadow-[0_1px_2px_rgba(10,18,34,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#1e40af]">
                Demo profile
              </span>
              <span className="rounded-full border border-[#cfe0fd] bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-[#1d4ed8]">
                Sharma Steel
              </span>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#3f5f9e]">
              Raipur · 18,000 t/yr · 20% exported to Germany · ₹8.0/kWh. Loads
              bills, baseline and a saved portfolio in one click.
            </p>
            <button
              onClick={async () => {
                await loadDemo()
                navigate('/')
              }}
              className="mt-3 flex items-center gap-1.5 text-[11.5px] font-bold text-[#1d4ed8] hover:underline"
            >
              Open demo workspace
              <ArrowRight size={11} />
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}
