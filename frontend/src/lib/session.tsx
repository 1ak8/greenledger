import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getDemoWorkspace } from './api'
import type { Baseline, Company } from './types'

export const DEMO_COMPANY: Company = {
  _id: 'demo-sharma-steel',
  name: 'Sharma Steel Pvt Ltd',
  sector: 'steel',
  state: 'Chhattisgarh',
  annualProduction: 18000,
  productionUnit: 'tonnes',
  employees: 400,
  revenue: 120,
  exportShare: 20,
  exportDestination: 'Germany',
  powerTariff: 8,
}

export const DEMO_BASELINE: Baseline = {
  _id: 'demo-baseline',
  companyId: 'demo-sharma-steel',
  scope1: 11503,
  scope2: 8297,
  scope3: 0,
  totalEmissions: 19800,
  carbonIntensity: 1.1,
  sectorMedian: 1.35,
  cbamExposure: 26869000,
  euCarbonPrice: 70,
  evidenceTrail: [
    {
      figure: 'Electricity 7,85,675 kWh · 2026-11 × 0.88 tCO₂e/MWh',
      value: 4148.36,
      unit: 'tCO₂e',
      emissionFactorId: 'CEA_v20_National_Grid_2024',
      calculation: '7,85,675 kWh × 0.88 / 1,000 × 6 months',
    },
    {
      figure: 'Electricity 7,85,675 kWh · 2026-10 × 0.88 tCO₂e/MWh',
      value: 4148.36,
      unit: 'tCO₂e',
      emissionFactorId: 'CEA_v20_National_Grid_2024',
      calculation: '7,85,675 kWh × 0.88 / 1,000 × 6 months',
    },
    {
      figure: 'Coal 1,08,333 kg · 2026-11 × 2.42 kgCO₂e/kg',
      value: 1573.0,
      unit: 'tCO₂e',
      emissionFactorId: 'IPCC_2006_SubBituminous_Coal',
      calculation: '1,08,333 kg × 2.42 / 1,000 × 6 months',
    },
    {
      figure: 'Coal 1,08,333 kg · 2026-10 × 2.42 kgCO₂e/kg',
      value: 1573.0,
      unit: 'tCO₂e',
      emissionFactorId: 'IPCC_2006_SubBituminous_Coal',
      calculation: '1,08,333 kg × 2.42 / 1,000 × 6 months',
    },
    {
      figure: 'Diesel 8,000 litre · 2026-11 × 2.68 kgCO₂e/litre',
      value: 128.64,
      unit: 'tCO₂e',
      emissionFactorId: 'IPCC_2006_Gas_Diesel_Oil',
      calculation: '8,000 L × 2.68 / 1,000 × 6 months',
    },
    {
      figure: 'Diesel 8,000 litre · 2026-10 × 2.68 kgCO₂e/litre',
      value: 128.64,
      unit: 'tCO₂e',
      emissionFactorId: 'IPCC_2006_Gas_Diesel_Oil',
      calculation: '8,000 L × 2.68 / 1,000 × 6 months',
    },
    {
      figure: 'Process 18,000 t × 0.45 tCO₂e/t',
      value: 8100.0,
      unit: 'tCO₂e',
      emissionFactorId: 'IPCC_2006_EAF_Steel_Direct',
      calculation: '18,000 t × 0.45',
    },
  ],
}

interface Session {
  company: Company | null
  baseline: Baseline | null
  setCompany: (c: Company | null) => void
  setBaseline: (b: Baseline | null) => void
  reset: () => void
  loadDemo: () => Promise<void>
}

const SessionContext = createContext<Session | null>(null)

const COMPANY_KEY = 'carbontwin.company'
const BASELINE_KEY = 'carbontwin.baseline'

function read<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(() => read(COMPANY_KEY) || DEMO_COMPANY)
  const [baseline, setBaseline] = useState<Baseline | null>(() => read(BASELINE_KEY) || DEMO_BASELINE)

  useEffect(() => {
    try {
      if (company) window.localStorage?.setItem(COMPANY_KEY, JSON.stringify(company))
      else window.localStorage?.removeItem(COMPANY_KEY)
    } catch {
      // Safe fallback when storage quota or privacy mode blocks access
    }
  }, [company])

  useEffect(() => {
    try {
      if (baseline) window.localStorage?.setItem(BASELINE_KEY, JSON.stringify(baseline))
      else window.localStorage?.removeItem(BASELINE_KEY)
    } catch {
      // Safe fallback
    }
  }, [baseline])

  // Sync with live backend demo on mount if on demo or initial load
  useEffect(() => {
    let alive = true
    getDemoWorkspace()
      .then((data) => {
        if (!alive) return
        if (data.company) {
          setCompany((prev) => (prev && prev._id !== DEMO_COMPANY._id ? prev : data.company))
        }
        if (data.baseline) {
          setBaseline((prev) => (prev && prev._id !== DEMO_BASELINE._id ? prev : data.baseline))
        }
        if (data.simulation?._id) {
          try {
            if (!sessionStorage.getItem('carbontwin.simulationId')) {
              sessionStorage.setItem('carbontwin.simulationId', data.simulation._id)
            }
          } catch {
            // Safe fallback
          }
        }
      })
      .catch(() => {
        // Fallback to in-memory demo already set
      })
    return () => {
      alive = false
    }
  }, [])

  const loadDemo = async () => {
    try {
      const data = await getDemoWorkspace()
      setCompany(data.company)
      setBaseline(data.baseline)
      if (data.simulation?._id) {
        try {
          sessionStorage.setItem('carbontwin.simulationId', data.simulation._id)
        } catch {
          // Safe fallback
        }
      }
    } catch {
      setCompany(DEMO_COMPANY)
      setBaseline(DEMO_BASELINE)
    }
  }

  const reset = () => {
    setCompany(null)
    setBaseline(null)
    try {
      window.localStorage?.removeItem(COMPANY_KEY)
      window.localStorage?.removeItem(BASELINE_KEY)
      window.sessionStorage?.removeItem('carbontwin.simulationId')
    } catch {
      // Safe fallback
    }
  }

  return (
    <SessionContext.Provider
      value={{ company, baseline, setCompany, setBaseline, reset, loadDemo }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
