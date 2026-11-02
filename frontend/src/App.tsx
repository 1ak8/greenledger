import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { SessionProvider } from './lib/session'
import { Dashboard } from './pages/Dashboard'
import { Company } from './pages/Company'
import { Upload } from './pages/Upload'
import { BaselinePage } from './pages/Baseline'
import { Simulate } from './pages/Simulate'
import { LibraryPage } from './pages/Library'
import { ReportPage } from './pages/Report'

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/company" element={<Company />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/baseline" element={<BaselinePage />} />
            <Route path="/simulate" element={<Simulate />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
