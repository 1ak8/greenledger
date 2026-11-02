import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Building2,
  FileText,
  Files,
  LayoutDashboard,
  Library,
  Menu,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { API_BASE } from '../lib/api'
import { useSession } from '../lib/session'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/company', label: 'Company profile', icon: Building2 },
  { to: '/upload', label: 'Documents', icon: Files },
  { to: '/baseline', label: 'Baseline', icon: Activity },
  { to: '/simulate', label: 'Simulation', icon: SlidersHorizontal },
  { to: '/library', label: 'Intervention library', icon: Library },
  { to: '/report', label: 'Report', icon: FileText },
]

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

export function AppShell() {
  const { company, reset, loadDemo } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [store, setStore] = useState<'file' | 'mongodb' | null>(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/api/health`)
      .then((r) => r.json())
      .then((d) => alive && setStore(d.store))
      .catch(() => alive && setStore(null))
    return () => {
      alive = false
    }
  }, [])

  const current =
    [...NAV]
      .reverse()
      .find((item) =>
        item.end
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to),
      ) ?? NAV[0]

  return (
    <div className="flex min-h-screen">
      {open && (
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-rail/50 lg:hidden"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-[268px] shrink-0 flex-col border-r border-[#CBD5E1] bg-[#F1F5F9]',
          'transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#CBD5E1] bg-white px-5">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left"
            aria-label="Green Ledger overview"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[#16A34A] shadow-sm">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h7" />
                <path d="M6 14h10" />
              </svg>
            </div>
            <div>
              <span className="block font-display text-[17px] font-bold leading-tight tracking-[-0.025em] text-[#0F172A]">
                Green Ledger
              </span>
              <span className="block text-[11px] font-semibold tracking-wider text-[#475569]">
                CARBON INTELLIGENCE
              </span>
            </div>
          </button>

          <button
            onClick={() => setOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[5px] text-[#475569] transition-colors hover:bg-[#E2E8F0] hover:text-[#0F172A] lg:hidden"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3.5 pb-4 pt-5">
          <p className="mb-2.5 px-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#475569]">
            Platform Menu
          </p>
          <ul className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'group flex h-10 items-center gap-3 rounded-[6px] px-3 text-[13.5px] font-semibold transition-all',
                        isActive
                          ? 'border border-[#CBD5E1] bg-white text-[#0F172A] shadow-sm'
                          : 'text-[#334155] hover:bg-[#E2E8F0] hover:text-[#0F172A]',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={[
                            'flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors',
                            isActive
                              ? 'bg-[#DCFCE7] text-[#16A34A]'
                              : 'bg-transparent text-[#64748B] group-hover:text-[#0F172A]',
                          ].join(' ')}
                        >
                          <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
                        </div>
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-3.5">
          {company ? (
            <div className="rounded-[8px] border border-[#CBD5E1] bg-white p-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#16A34A]" aria-hidden="true" />
                <span className="truncate text-[13.5px] font-bold text-[#0F172A]">
                  {company.name}
                </span>
              </div>
              <p className="mt-1 text-[12px] font-medium text-[#475569]">
                {SECTOR_LABEL[company.sector] ?? company.sector} · {company.state}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-2.5">
                <button
                  onClick={() => loadDemo()}
                  className="rounded-[4px] px-2 py-1 text-[12px] font-bold text-[#16A34A] transition-colors hover:bg-[#DCFCE7]"
                >
                  Demo
                </button>
                <button
                  onClick={() => {
                    reset()
                    navigate('/company')
                  }}
                  className="rounded-[4px] px-2 py-1 text-[12px] font-semibold text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                >
                  Switch
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[8px] border border-[#CBD5E1] bg-white p-3.5 shadow-sm">
              <p className="text-[12.5px] font-medium text-[#475569]">No workspace loaded</p>
              <div className="mt-2.5 flex flex-col gap-2">
                <button
                  onClick={() => loadDemo()}
                  className="btn btn-primary h-8.5 w-full text-[12.5px]"
                >
                  Load demo workspace
                </button>
                <button
                  onClick={() => navigate('/company')}
                  className="text-left text-[12px] font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
                >
                  Create company profile
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-panel px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setOpen(true)}
            className="btn btn-quiet h-8 w-8 p-0 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex min-w-0 items-center gap-2 text-[13.5px]">
            <span className="hidden max-w-[240px] truncate font-semibold text-[#0F172A] sm:block">
              {company ? company.name : 'No workspace'}
            </span>
            <span className="hidden font-bold text-[#94A3B8] sm:inline" aria-hidden="true">
              ›
            </span>
            <span className="truncate font-bold text-[#0F172A]">
              {current.label}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {company && (
              <span className="num hidden text-[13px] font-semibold text-[#475569] md:inline">
                {company.annualProduction.toLocaleString('en-IN')}{' '}
                {company.productionUnit}/yr
              </span>
            )}
            {store && (
              <span className="hidden items-center gap-1.5 rounded-[4px] border border-[#CBD5E1] bg-white px-2 py-1 text-[12px] font-semibold text-[#475569] sm:inline-flex">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    store === 'mongodb' ? 'bg-[#16A34A]' : 'bg-[#CA8A04]'
                  }`}
                />
                {store === 'mongodb' ? 'MongoDB' : 'Local store'}
              </span>
            )}
            <span className="rounded-[4px] border border-[#CBD5E1] bg-white px-2 py-1 text-[12px] font-semibold text-[#475569]">
              FY 2026–27
            </span>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
