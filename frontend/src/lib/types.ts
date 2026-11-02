export type Sector =
  | 'steel'
  | 'cement'
  | 'textile'
  | 'chemical'
  | 'auto-component'
  | 'foundry'
  | 'paper'
  | 'other'

export interface Company {
  _id: string
  name: string
  sector: Sector
  state: string
  annualProduction: number
  productionUnit: string
  employees?: number
  revenue?: number
  exportShare: number
  exportDestination: string
  powerTariff: number
}

export interface ExtractedItem {
  field: string
  value: number
  unit: string
  period: string
  sourceDoc: string
  confidence: number
  manualOverride: boolean
}

export interface UploadDoc {
  _id: string
  companyId: string
  fileType: 'electricity' | 'fuel' | 'production'
  originalName: string
  extractedData: ExtractedItem[]
  status: string
  createdAt: string
}

export interface EvidenceEntry {
  figure: string
  value: number
  unit: string
  emissionFactorId: string
  calculation: string
}

export interface Baseline {
  _id: string
  companyId: string
  scope1: number
  scope2: number
  scope3: number
  totalEmissions: number
  carbonIntensity: number
  sectorMedian: number
  cbamExposure: number
  euCarbonPrice: number
  evidenceTrail: EvidenceEntry[]
}

export interface Intervention {
  id: string
  name: string
  capex: number
  annualSavings: number
  co2Abated: number
  payback: number
  category: string
}

export interface ProjectionRow {
  year: number
  emissions: number
  savings: number
  cumulative: number
}

export interface SensitivityRow {
  assumption: string
  payback: number
  delta: number
}

export interface Simulation {
  _id: string
  companyId: string
  baselineId: string
  budget: number
  paybackCeiling: number
  tariffAssumption: number
  selectedInterventions: Intervention[]
  excludedInterventions: { id: string; name: string; reason: string }[]
  totalCapex: number
  totalAbatement: number
  totalSavings: number
  blendedPayback: number
  projection: ProjectionRow[]
  pinned: boolean
  label: string
}

export interface SimulationResponse {
  simulation: Simulation
  sensitivity: SensitivityRow[]
  allInterventions: Intervention[]
}
