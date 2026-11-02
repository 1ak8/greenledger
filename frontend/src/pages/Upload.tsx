import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader, Panel } from '../components/ui'
import { FileDropzone } from '../components/FileDropzone'
import {
  computeBaseline,
  getUploads,
  updateUpload,
  uploadDocument,
} from '../lib/api'
import { useSession } from '../lib/session'
import type { UploadDoc } from '../lib/types'

type FileKind = 'electricity' | 'fuel' | 'production'

const KINDS: { key: FileKind; label: string; hint: string; short: string }[] = [
  {
    key: 'electricity',
    label: 'Electricity bills',
    hint: 'Monthly bill, PDF or photo',
    short: 'Power',
  },
  {
    key: 'fuel',
    label: 'Fuel invoices',
    hint: 'Coal, diesel, gas, LPG',
    short: 'Fuel',
  },
  {
    key: 'production',
    label: 'Production records',
    hint: 'Monthly output register',
    short: 'Output',
  },
]

const FIELD_LABELS: Record<string, string> = {
  electricity_consumed: 'Electricity consumed',
  production: 'Production',
  coal: 'Coal',
  diesel: 'Diesel',
  furnace_oil: 'Furnace oil',
  natural_gas: 'Natural gas',
  pet_coke: 'Pet coke',
  lpg: 'LPG',
  biomass_briquette: 'Biomass briquette',
}

const labelFor = (field: string) =>
  FIELD_LABELS[field] ??
  field.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

const KIND_ORDER: Record<FileKind, number> = {
  electricity: 0,
  fuel: 1,
  production: 2,
}

export function Upload() {
  const navigate = useNavigate()
  const { company, setBaseline, loadDemo } = useSession()

  const [uploads, setUploads] = useState<UploadDoc[]>([])
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    if (!company) {
      loadDemo()
      return
    }
    getUploads(company._id)
      .then((docs) => {
        if (docs && docs.length > 0) setUploads(docs)
      })
      .catch(() => {})
  }, [company, loadDemo])

  const rows = useMemo(
    () =>
      uploads
        .flatMap((u) =>
          u.extractedData.map((d, idx) => ({
            uploadId: u._id,
            idx,
            kind: u.fileType,
            doc: d.sourceDoc,
            field: d.field,
            value: d.value,
            unit: d.unit,
            period: d.period,
          })),
        )
        .sort(
          (a, b) =>
            KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
            b.period.localeCompare(a.period),
        ),
    [uploads],
  )

  async function handleFile(kind: FileKind, file: File) {
    if (!company) return
    setFiles((f) => ({ ...f, [kind]: file }))
    setBusy((b) => ({ ...b, [kind]: true }))
    setError(null)
    try {
      const doc = await uploadDocument(company._id, kind, file)
      setUploads((prev) => [doc, ...prev])
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error || 'Upload failed. Is the API running?'
      setError(msg)
    } finally {
      setBusy((b) => ({ ...b, [kind]: false }))
    }
  }

  function editValue(uploadId: string, idx: number, value: string) {
    setUploads((prev) =>
      prev.map((u) => {
        if (u._id !== uploadId) return u
        const data = u.extractedData.map((d, i) =>
          i === idx
            ? { ...d, value: Number(value) || 0, manualOverride: true }
            : d,
        )
        return { ...u, extractedData: data }
      }),
    )
  }

  async function onCalculate() {
    if (!company) return
    setCalculating(true)
    setError(null)
    try {
      await Promise.all(
        uploads.map((u) => updateUpload(u._id, u.extractedData)),
      )
      const baseline = await computeBaseline(company._id)
      setBaseline(baseline)
      navigate('/baseline')
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error || 'Could not compute the baseline.'
      setError(msg)
    } finally {
      setCalculating(false)
    }
  }

  const hasData = rows.length > 0
  const covered = new Set(uploads.map((u) => u.fileType)).size

  return (
    <>
      <PageHeader
        title="Documents"
        description="Three document types. Every extracted line keeps a link back to the file it came from — that link is what makes the report defensible."
        action={
          <div className="text-right">
            <div className="text-[12.5px] font-medium uppercase tracking-[0.07em] text-fg-faint">
              Documents
            </div>
            <div className="num mt-0.5 text-[22px] leading-tight text-fg">
              {uploads.length}
              <span className="text-fg-faint">/3</span>
            </div>
          </div>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <div className="card border-t-[3px] border-t-line-strong p-4">
            <div className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-fg-faint">
              Document coverage
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="num text-[27px] font-semibold leading-none text-fg">
                {covered}
              </span>
              <span className="text-[13px] text-fg-dim">of 3 types</span>
            </div>
            <div className="mt-3 flex gap-1">
              {KINDS.map((k) => (
                <span
                  key={k.key}
                  className={`h-1.5 flex-1 rounded-[1px] ${
                    uploads.some((u) => u.fileType === k.key)
                      ? 'bg-jade'
                      : 'bg-line'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[12px] font-medium uppercase tracking-[0.04em] text-fg-dim">
              {KINDS.map((k) => (
                <span key={k.key}>{k.short}</span>
              ))}
            </div>
          </div>

          {KINDS.map((k) => {
            const done = uploads.some((u) => u.fileType === k.key)
            return (
              <FileDropzone
                key={k.key}
                label={k.label}
                hint={k.hint}
                file={files[k.key] ?? null}
                busy={busy[k.key]}
                done={done}
                onSelect={(f) => handleFile(k.key, f)}
              />
            )
          })}

          <div className="recess p-4">
            <p className="text-[12.5px] leading-relaxed text-fg-dim">
              One electricity bill and one fuel invoice give a complete Scope 1
              and 2 picture. Partial uploads produce a coverage gap, not a
              silent assumption.
            </p>
          </div>
        </div>

        <Panel
          title="Extracted data"
          meta={`${rows.length} line items · editable`}
          className="min-w-0"
          flush
        >
          {!hasData ? (
            <div className="px-5 py-20 text-center">
              <p className="text-[13.5px] text-fg">
                No line items yet.
              </p>
              <p className="mx-auto mt-1 max-w-[42ch] text-[13px] leading-relaxed text-fg-dim">
                Upload a bill on the left. The parser returns each figure with
                its source file, period and unit attached.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Field</th>
                    <th className="text-right">Value</th>
                    <th>Unit</th>
                    <th>Period</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.uploadId}-${r.idx}`}>
                      <td className="whitespace-nowrap capitalize text-fg-dim">
                        {r.kind}
                      </td>
                      <td className="whitespace-nowrap font-medium">
                        {labelFor(r.field)}
                      </td>
                      <td className="text-right">
                        <input
                          className="num w-28 rounded-[2px] border-b border-dashed border-line-strong bg-transparent px-1 py-0.5 text-right text-[13px] text-fg transition-colors hover:border-forge focus:border-forge focus:outline-none sm:w-32"
                          value={r.value}
                          onChange={(e) =>
                            editValue(r.uploadId, r.idx, e.target.value)
                          }
                          aria-label={`${r.field} value`}
                        />
                      </td>
                      <td className="whitespace-nowrap text-[12.5px] text-fg-dim">
                        {r.unit}
                      </td>
                      <td className="num whitespace-nowrap text-[12.5px] text-fg-dim">
                        {r.period}
                      </td>
                      <td className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-fg-faint">
                        {r.doc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mx-4 my-3 border border-red/30 border-l-[3px] border-l-red bg-red/10 px-3 py-2 text-[12.5px] text-red"
            >
              {error}
            </div>
          )}

          <footer className="border-t border-line bg-elevated px-4 py-4">
            <p className="mb-3 text-[12.5px] text-fg-dim">
              Correct any figure before it enters the calculation.
            </p>
            <button
              onClick={onCalculate}
              disabled={!hasData || calculating}
              className="btn btn-primary w-full"
            >
              {calculating ? 'Calculating…' : 'Calculate baseline'}
              {!calculating && <ArrowRight size={15} />}
            </button>
          </footer>
        </Panel>
      </div>
    </>
  )
}
