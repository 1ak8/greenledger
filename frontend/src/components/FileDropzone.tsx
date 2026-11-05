import { useRef, useState } from 'react'
import { Check, Factory, Flame, Loader2, Upload, Zap } from 'lucide-react'

interface Props {
  label: string
  hint: string
  accept?: string
  file: File | null
  busy?: boolean
  done?: boolean
  onSelect: (file: File) => void
}

function iconFor(label: string) {
  if (/electric/i.test(label)) return Zap
  if (/fuel/i.test(label)) return Flame
  return Factory
}

export function FileDropzone({
  label,
  hint,
  accept = '.pdf,.png,.jpg,.jpeg',
  file,
  busy,
  done,
  onSelect,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const Icon = iconFor(label)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={busy}
      aria-busy={busy}
      aria-label={`Upload ${label}`}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !busy) {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files?.[0]
        if (f && !busy) onSelect(f)
      }}
      className={[
        'group cursor-pointer rounded-[10px] border bg-panel p-3.5 text-left transition-all duration-150',
        dragging
          ? 'border-forge bg-forge-light ring-2 ring-forge/15'
          : done
            ? 'border-[#cfe8d9] hover:border-[#a9d9bb]'
            : 'border-line hover:border-line-strong hover:bg-[#fbfcfe]',
        busy ? 'pointer-events-none opacity-70' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onSelect(f)
          e.target.value = ''
        }}
      />

      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border transition-colors ${
            done
              ? 'border-[#cfe8d9] bg-[#f1fbf4] text-jade'
              : dragging
                ? 'border-[#cfe0fd] bg-white text-forge'
                : 'border-line bg-elevated text-[#64748b] group-hover:text-fg'
          }`}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin text-forge" />
          ) : done ? (
            <Check size={16} strokeWidth={2.4} />
          ) : (
            <Icon size={16} strokeWidth={2} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-fg">
              {label}
            </span>
            <span
              className={`ml-auto shrink-0 rounded-[5px] border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.05em] ${
                busy
                  ? 'border-[#cfe0fd] bg-[#f4f8ff] text-forge'
                  : done
                    ? 'border-[#cfe8d9] bg-[#f1fbf4] text-jade'
                    : 'border-line bg-elevated text-[#5b6b82]'
              }`}
            >
              {busy ? 'Reading' : done ? 'Linked' : 'Upload'}
            </span>
          </div>
          <p className="mt-1 truncate text-[11.5px] font-medium text-[#64748b]">
            {busy
              ? 'Extracting line items…'
              : file
                ? file.name
                : done
                  ? 'Extracted · review in the table'
                  : hint}
          </p>
          {!done && !busy && (
            <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#64748b]">
              <Upload size={10} />
              PDF · JPG · PNG
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
