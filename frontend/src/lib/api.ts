import axios from 'axios'
import type {
  Baseline,
  Company,
  Intervention,
  SimulationResponse,
  Simulation,
  UploadDoc,
} from './types'

export const API_BASE =
  import.meta.env.VITE_API_URL || 'https://greenledger-92iv.onrender.com'

const api = axios.create({ baseURL: API_BASE, timeout: 60000 })

export const getInterventions = (sector: string) =>
  api
    .get<Intervention[]>(`/api/simulate/interventions/${sector}`)
    .then((r) => r.data)

export const getDemoWorkspace = () =>
  api
    .get<{
      company: Company
      baseline: Baseline
      uploads: UploadDoc[]
      simulation: Simulation
    }>('/api/company/demo')
    .then((r) => r.data)

export const createCompany = (payload: Omit<Company, '_id'>) =>
  api.post<Company>('/api/company', payload).then((r) => r.data)

export const getCompany = (id: string) =>
  api.get<Company>(`/api/company/${id}`).then((r) => r.data)

export const uploadDocument = (
  companyId: string,
  fileType: 'electricity' | 'fuel' | 'production',
  file: File,
) => {
  const fd = new FormData()
  fd.append('companyId', companyId)
  fd.append('fileType', fileType)
  fd.append('file', file)
  return api
    .post<UploadDoc>('/api/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export const getUploads = (companyId: string) =>
  api.get<UploadDoc[]>(`/api/upload/${companyId}`).then((r) => r.data)

export const updateUpload = (
  id: string,
  extractedData: UploadDoc['extractedData'],
) =>
  api
    .put<UploadDoc>(`/api/upload/${id}`, { extractedData })
    .then((r) => r.data)

export const computeBaseline = (companyId: string) =>
  api.post<Baseline>(`/api/emissions/${companyId}`).then((r) => r.data)

export const getBaseline = (companyId: string) =>
  api.get<Baseline>(`/api/emissions/${companyId}`).then((r) => r.data)

export interface SimulatePayload {
  companyId: string
  baselineId: string
  baselineEmissions: number
  budget: number
  paybackCeiling: number
  tariff: number
  tariffEscalation: number
  sector: string
  toggles?: Record<string, boolean>
  persist?: boolean
}

export const simulate = (payload: SimulatePayload) =>
  api.post<SimulationResponse>('/api/simulate', payload).then((r) => r.data)

export const getSimulations = (companyId: string) =>
  api.get<Simulation[]>(`/api/simulate/${companyId}`).then((r) => r.data)

export const pinSimulation = (id: string, label?: string) =>
  api.patch<Simulation>(`/api/simulate/${id}/pin`, { label }).then((r) => r.data)

export const generateReport = (payload: {
  companyId: string
  baselineId: string
  simulationId: string
}) =>
  api
    .post<{ report: { _id: string }; html: string }>('/api/report', payload)
    .then((r) => r.data)

export const reportDownloadUrl = (id: string) =>
  `${API_BASE}/api/report/download/${id}`
