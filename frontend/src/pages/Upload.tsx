import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileSearch, ShieldCheck } from 'lucide-react'
import { PageHeader, Panel, Empty, Badge } from '../components/ui'
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

const KIND_TONE: Record<FileKind, 'forge' | 'amber' | 'jade'> = {
  electricity: 'forge',
  fuel: 'amber',
  production: 'jade',
}

const KIND_DOT: Record<FileKind, string> = {
  electricity: 'bg-forge',
  fuel: 'bg-[#d97706]',
  production: 'bg-jade',
}

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
            <div className="eyebrow">Documents linked</div>
            <div className="num mt-1 text-[26px] font-semibold leading-none text-fg">
              {uploads.length}
              <span className="text-[15px] font-medium text-[#64748b]">/3</span>
            </div>
          </div>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5b6b82]">
                  Document coverage
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="figure text-[28px] leading-none text-fg">
                    {covered}
                  </span>
                  <span className="text-[12.5px] font-semibold text-fg-faint">
                    of 3 types
                  </span>
                </div>
              </div>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  covered === 3
                    ? 'border-[#cfe8d9] bg-[#f1fbf4] text-jade'
                    : 'border-line bg-elevated text-[#64748b]'
                }`}
              >
                {covered === 3 ? (
                  <ShieldCheck size={15} />
                ) : (
                  <FileSearch size={15} />
                )}
              </span>
            </div>
            <div className="mt-3.5 flex gap-1">
              {KINDS.map((k) => (
                <span
                  key={k.key}
                  className={`h-1.5 flex-1 rounded-full ${
                    uploads.some((u) => u.fileType === k.key)
                      ? 'bg-jade'
                      : 'bg-[#e8edf4]'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-bold uppercase tracking-[0.04em]">
              {KINDS.map((k) => {
                const done = uploads.some((u) => u.fileType === k.key)
                return (
                  <span
                    key={k.key}
                    className={done ? 'text-jade' : 'text-[#64748b]'}
                  >
                    {k.short}
                  </span>
                )
              })}
            </div>
            <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-[#64748b]">
              {covered === 3
                ? 'All three source types are linked. The baseline can be computed.'
                : 'Add the missing document types to close the coverage gap.'}
            </p>
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

          <div className="rounded-[10px] border border-line bg-[#fbfcfe] p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#52627a]">
              <span className="h-1 w-1 rounded-full bg-forge" />
              Coverage rule
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#64748b]">
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
          footer={
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11.5px] text-[#5b6b82]">
                Correct any figure before it enters the calculation.
              </p>
              <button
                onClick={onCalculate}
                disabled={!hasData || calculating}
                className="btn btn-primary ml-auto"
              >
                {calculating ? 'Calculating…' : 'Calculate baseline'}
                {!calculating && <ArrowRight size={15} />}
              </button>
            </div>
          }
        >
          {!hasData ? (
            <Empty
              title="No line items yet"
              body="Upload a bill on the left. The parser returns each figure with its source file, period and unit attached."
              icon={<FileSearch size={19} strokeWidth={1.8} />}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line bg-[#fbfcfe] px-5 py-2.5 text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-fg-dim">
                  <span className="h-1.5 w-1.5 rounded-full bg-jade" />
                  {rows.length} extracted lines
                </span>
                <span className="text-[#5b6b82]">
                  {uploads.length} source document
                  {uploads.length === 1 ? '' : 's'}
                </span>
                <span className="ml-auto font-medium text-[#5b6b82]">
                  Values are editable
                </span>
              </div>
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
                        <td className="whitespace-nowrap">
                          <Badge tone={KIND_TONE[r.kind]}>
                            {r.kind.charAt(0).toUpperCase() + r.kind.slice(1)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap font-semibold">
                          {labelFor(r.field)}
                        </td>
                        <td className="text-right">
                          <input
                            className="num w-28 rounded-[5px] border border-transparent border-b-[#cbd5e1] bg-transparent px-1.5 py-1 text-right text-[12.5px] font-semibold text-fg transition-colors hover:border-[#cbd5e1] hover:bg-white focus:border-forge focus:bg-white focus:outline-none sm:w-32"
                            value={r.value}
                            onChange={(e) =>
                              editValue(r.uploadId, r.idx, e.target.value)
                            }
                            aria-label={`${r.field} value`}
                          />
                        </td>
                        <td className="whitespace-nowrap text-[11.5px] font-medium text-[#5b6b82]">
                          {r.unit}
                        </td>
                        <td className="num whitespace-nowrap text-[11.5px] text-[#64748b]">
                          {r.period}
                        </td>
                        <td className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-[11.5px] text-[#64748b]">
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                KIND_DOT[r.kind] ?? 'bg-[#94a3b8]'
                              }`}
                            />
                            {r.doc}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="mx-5 my-3 rounded-[7px] border border-[#f3d6d6] bg-[#fef5f5] px-3 py-2 text-[12px] font-medium text-[#b91c1c]"
            >
              {error}
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
