import { useRef, useState } from 'react'

interface Props {
  label: string
  hint: string
  accept?: string
  file: File | null
  busy?: boolean
  done?: boolean
  onSelect: (file: File) => void
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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={busy}
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
        'cursor-pointer rounded-[4px] border-2 border-dashed p-3.5 text-left transition-colors',
        dragging
          ? 'border-forge bg-forge-light'
          : done
            ? 'border-solid border-jade bg-jade-light'
            : 'border-line-strong bg-panel hover:border-forge hover:bg-elevated',
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
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border ${
            done
              ? 'border-jade/30 bg-panel text-jade'
              : 'border-line bg-elevated text-fg-faint'
          }`}
        >
          {done ? (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
              <path
                d="M3 8.5 6.2 11.5 13 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
              <path
                d="M8 11V3m0 0L4.8 6.2M8 3l3.2 3.2M3 12.5h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-fg">{label}</div>
          <div className="mt-0.5 truncate text-[12.5px] text-fg-faint">
            {busy
              ? 'Reading document…'
              : file
                ? file.name
                : done
                  ? 'Extracted · ready to review'
                  : hint}
          </div>
        </div>

        <span
          className={`mt-0.5 shrink-0 text-[12px] font-medium uppercase tracking-[0.06em] ${
            done ? 'text-jade' : 'text-iron'
          }`}
        >
          {busy ? 'Wait' : done ? 'Done' : 'PDF'}
        </span>
      </div>
    </div>
  )
}
