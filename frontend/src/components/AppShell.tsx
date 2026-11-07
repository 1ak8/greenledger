import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Building2,
  ChevronRight,
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

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="3" fill="#111827" />
      <path
        d="M8.5 10.5h15M8.5 16h15M8.5 21.5h8.5"
        stroke="#F7F8FA"
        strokeWidth="1.7"
        strokeLinecap="square"
      />
      <circle cx="23" cy="21.5" r="2.1" fill="#5EEAD4" />
    </svg>
  )
}

function Brand() {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <BrandMark className="brand-mark h-8 w-8 shrink-0" />
      <span className="min-w-0">
        <span
          className="block truncate text-[21px] font-semibold leading-none tracking-[-0.02em] text-fg"
          style={{ fontFamily: "'Newsreader', Georgia, serif" }}
        >
          Green Ledger
        </span>
        <span className="mt-1 block text-[9.5px] font-bold tracking-[0.14em] text-[#64748b]">
          CARBON INTELLIGENCE
        </span>
      </span>
    </span>
  )
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
          className="fixed inset-0 z-30 bg-[#0a1222]/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 flex-col border-r border-[#dde4ee] bg-[#f4f6fa]/95 backdrop-blur-xl sidebar-in',
          'transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#dde4ee] px-5">
          <button
            onClick={() => navigate('/')}
            className="brand flex min-w-0 items-center text-left"
            aria-label="Green Ledger overview"
          >
            <Brand />
          </button>

          <button
            onClick={() => setOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[7px] text-fg-dim transition-colors hover:bg-[#e5eaf2] hover:text-fg lg:hidden"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav
          aria-label="Workspace"
          className="flex-1 overflow-y-auto px-3 pb-4 pt-5"
        >
          <p className="eyebrow mb-2.5 px-2.5">Workspace</p>
          <ul className="stagger-list space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'nav-item group relative flex h-10 items-center gap-3 rounded-[8px] px-3 text-[13px] font-semibold transition-all duration-150',
                        isActive
                          ? 'border border-[#d4dce7] bg-white text-[#0f172a] shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]'
                          : 'border border-transparent text-[#556477] hover:bg-white/60 hover:text-[#0f172a]',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={[
                            'flex h-6 w-6 shrink-0 items-center justify-center transition-colors',
                            isActive
                              ? 'text-[#0f172a]'
                              : 'text-[#64748b] group-hover:text-[#0f172a]',
                          ].join(' ')}
                        >
                          <Icon size={16} strokeWidth={isActive ? 2.2 : 2} />
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-[#dde4ee] p-3">
          {company ? (
            <div className="rounded-[10px] border border-[#dde4ee] bg-white p-3.5 shadow-[0_2px_8px_rgba(10,18,34,0.04)]">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-[#d4ebdc] bg-[#f2fbf5] text-jade">
                  <Building2 size={14} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold leading-tight text-fg">
                    {company.name}
                  </div>
                  <p className="mt-1 truncate text-[11.5px] font-medium text-[#64748b]">
                    {SECTOR_LABEL[company.sector] ?? company.sector} ·{' '}
                    {company.state}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 border-t border-line pt-2.5">
                <button
                  onClick={() => loadDemo()}
                  className="rounded-[5px] px-2 py-1 text-[11.5px] font-bold text-jade transition-colors hover:bg-[#eaf7ee]"
                >
                  Load demo
                </button>
                <span className="h-3 w-px bg-line" aria-hidden="true" />
                <button
                  onClick={() => {
                    reset()
                    navigate('/company')
                  }}
                  className="rounded-[5px] px-2 py-1 text-[11.5px] font-semibold text-[#64748b] transition-colors hover:bg-elevated hover:text-fg"
                >
                  Switch
                </button>
                <span className="ml-auto font-mono text-[10px] font-medium text-[#64748b]">
                  FY26
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-[10px] border border-[#dde4ee] bg-white p-3.5 shadow-[0_2px_8px_rgba(10,18,34,0.04)]">
              <p className="text-[12.5px] font-semibold text-fg-dim">
                No workspace loaded
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <button
                  onClick={() => loadDemo()}
                  className="btn btn-primary h-9 w-full text-[12px]"
                >
                  Load demo workspace
                </button>
                <button
                  onClick={() => navigate('/company')}
                  className="text-left text-[11.5px] font-semibold text-[#64748b] transition-colors hover:text-fg"
                >
                  Create company profile
                </button>
              </div>
            </div>
          )}
          <p className="mt-3 flex items-center gap-1.5 px-1 text-[10.5px] font-medium text-[#5b6b82]">
            <span className="h-1 w-1 rounded-full bg-jade" aria-hidden="true" />
            All figures in tCO₂e
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            onClick={() => setOpen(true)}
            className="btn btn-quiet h-9 w-9 p-0 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="hidden font-medium text-[#5b6b82] sm:inline">
              Workspace
            </span>
            <ChevronRight
              size={13}
              className="hidden shrink-0 text-[#b6c2d2] sm:block"
              aria-hidden="true"
            />
            <span className="truncate font-semibold text-fg">
              {current.label}
            </span>
            {company && (
              <>
                <span className="mx-1 hidden h-3.5 w-px bg-line md:block" />
                <span className="hidden max-w-[240px] truncate text-[12.5px] font-medium text-[#64748b] md:block">
                  {company.name}
                </span>
              </>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {company && (
              <span className="num hidden text-[12.5px] font-semibold text-[#52627a] lg:inline">
                {company.annualProduction.toLocaleString('en-IN')}{' '}
                {company.productionUnit}/yr
              </span>
            )}
            {store && (
              <span
                className="hidden items-center gap-1.5 rounded-[6px] border border-line bg-white px-2 py-1 text-[11.5px] font-semibold text-fg-dim sm:inline-flex"
                title={
                  store === 'mongodb'
                    ? 'Connected to MongoDB Atlas'
                    : 'Running on the local file store'
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    store === 'mongodb'
                      ? 'bg-[#16a34a] pulse-dot'
                      : 'bg-[#d97706]'
                  }`}
                />
                {store === 'mongodb' ? 'MongoDB Atlas' : 'Local store'}
              </span>
            )}
            <span className="rounded-[6px] border border-line bg-white px-2 py-1 text-[11.5px] font-semibold text-fg-dim">
              FY 2026–27
            </span>
          </div>
        </header>

        <main className="flex-1">
          <div
            key={location.pathname}
            className="page-in mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
