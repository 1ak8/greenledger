import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader, Panel } from '../components/ui'
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

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-iron">
        {children}
      </h2>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

export function Company() {
  const navigate = useNavigate()
  const { setCompany, setBaseline } = useSession()
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

  return (
    <>
      <PageHeader
        title="Company profile"
        description="Four fields set your emission factors, your sector benchmark and your CBAM exposure. Nothing here is guessed."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <form onSubmit={onSubmit} className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-elevated px-5 py-4">
            <div>
              <div className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-fg-dim">
                Workspace setup
              </div>
              <h2 className="mt-0.5 font-display text-[19px] font-semibold tracking-[-0.025em] text-fg">
                Factory profile
              </h2>
            </div>
            <span className="num ml-auto border border-line bg-panel px-2.5 py-1 text-[12.5px] text-fg-dim">
              STEP 01 / 03
            </span>
          </div>

          <div className="divide-y divide-line">
            <section className="px-5 py-5">
              <SectionLabel>Identity</SectionLabel>
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

            <section className="px-5 py-5">
              <SectionLabel>Output</SectionLabel>
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

            <section className="px-5 py-5">
              <SectionLabel>Trade exposure</SectionLabel>
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

            <section className="px-5 py-5">
              <SectionLabel>Operating context</SectionLabel>
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
              className="mx-5 mb-4 border border-red/30 border-l-[3px] border-l-red bg-red/10 px-3 py-2 text-[13px] text-red"
            >
              {error}
            </div>
          )}

          <footer className="flex flex-wrap items-center gap-4 border-t border-line bg-elevated px-5 py-4">
            <p className="text-[12.5px] text-fg-dim">
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

        <aside className="space-y-4">
          <Panel
            title="Why these fields"
            className="border-l-[3px] border-l-forge"
          >
            <dl className="divide-y divide-line">
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
                  <dt className="text-[12.5px] font-semibold text-fg">{term}</dt>
                  <dd className="mt-1 text-[12.5px] leading-relaxed text-fg-dim">
                    {body}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Demo profile"
            meta="Sharma Steel, Raipur"
            className="border-t-[3px] border-t-line-strong"
          >
            <dl className="grid grid-cols-2 gap-2 text-[13px]">
              <div className="rounded-[4px] border border-line bg-elevated px-3 py-2.5">
                <dt className="text-fg-faint">Output</dt>
                <dd className="num mt-0.5 font-medium text-fg">18,000 t/yr</dd>
              </div>
              <div className="rounded-[4px] border border-line bg-elevated px-3 py-2.5">
                <dt className="text-fg-faint">Export</dt>
                <dd className="num mt-0.5 font-medium text-fg">20%</dd>
              </div>
              <div className="rounded-[4px] border border-line bg-elevated px-3 py-2.5">
                <dt className="text-fg-faint">Tariff</dt>
                <dd className="num mt-0.5 font-medium text-fg">₹8.0/kWh</dd>
              </div>
              <div className="rounded-[4px] border border-line bg-elevated px-3 py-2.5">
                <dt className="text-fg-faint">Market</dt>
                <dd className="mt-0.5 font-medium text-fg">Germany</dd>
              </div>
            </dl>
            <p className="mt-3 text-[12.5px] leading-relaxed text-fg-dim">
              Bills can be any PDF; the parser falls back to a seeded dataset if
              extraction is unavailable.
            </p>
          </Panel>
        </aside>
      </div>
    </>
  )
}
