import { useEffect, useState, type ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
  meta,
}: {
  title: string
  description?: string
  action?: ReactNode
  meta?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end gap-x-8 gap-y-5">
      <div className="max-w-[70ch]">
        <h1 className="text-[36px] text-fg sm:text-[42px]">{title}</h1>
        <span className="mt-3 block h-[2px] w-[60px] bg-forge" aria-hidden="true" />
        {description && (
          <p className="mt-3 text-[14.5px] font-medium leading-relaxed text-[#334155]">
            {description}
          </p>
        )}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  )
}

export function Panel({
  title,
  meta,
  action,
  children,
  className = '',
  flush = false,
  accent = false,
}: {
  title?: string
  meta?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
  accent?: boolean
}) {
  return (
    <section
      className={`card ${accent ? 'border-t-[3px] border-t-forge' : ''} ${className}`}
    >
      {(title || action) && (
        <header className="flex min-h-10 items-center gap-3 border-b border-line bg-elevated px-4 py-2">
          {title && <h2 className="panel-title">{title}</h2>}
          {meta && (
            <div className="hidden text-[13px] text-fg-faint sm:block">
              {meta}
            </div>
          )}
          {action && <div className="ml-auto">{action}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  )
}

export function Stat({
  label,
  value,
  unit,
  hint,
  tone = 'default',
  bar,
  barTone,
  className = '',
  valueClassName = '',
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: 'default' | 'positive' | 'accent' | 'muted' | 'alert'
  bar?: number
  barTone?: 'steel' | 'forge' | 'jade' | 'amber'
  className?: string
  valueClassName?: string
}) {
  const cardBorder =
    tone === 'positive'
      ? 'border-[#86EFAC] bg-[#F0FDF4]'
      : tone === 'accent'
        ? 'border-[#93C5FD] bg-[#EFF6FF]'
        : tone === 'alert'
          ? 'border-[#FDE047] bg-[#FEFCE8]'
          : 'border-[#E2E8F0] bg-white'

  const valueTone =
    tone === 'positive'
      ? 'text-[#16A34A]'
      : tone === 'accent'
        ? 'text-[#2563EB]'
        : tone === 'alert'
          ? 'text-[#CA8A04]'
          : 'text-[#0F172A]'

  return (
    <div className={`rounded-[8px] border-2 p-4 shadow-sm transition-all ${cardBorder} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] font-semibold tracking-tight text-[#475569]">
          {label}
        </div>
        {tone === 'positive' && (
          <span className="flex items-center gap-1 rounded-full border border-[#86EFAC] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#16A34A]">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
              <path d="M3 8.5 6 11.5 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Optimal
          </span>
        )}
        {tone === 'accent' && (
          <span className="flex items-center gap-1 rounded-full border border-[#93C5FD] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
            Primary
          </span>
        )}
        {tone === 'alert' && (
          <span className="flex items-center gap-1 rounded-full border border-[#FDE047] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#CA8A04]">
            Exposure
          </span>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={`num whitespace-nowrap text-[28px] font-bold leading-none sm:text-[32px] ${valueTone} ${valueClassName}`}
        >
          {value}
        </span>
        {unit && (
          <span className="font-sans text-[13px] font-semibold text-[#475569]">
            {unit}
          </span>
        )}
      </div>
      {bar !== undefined && (
        <div className="mt-3.5">
          <Bar value={bar} max={100} tone={barTone ?? 'forge'} height={4} />
        </div>
      )}
      {hint && <div className="mt-2.5 text-[12.5px] font-semibold text-[#475569]">{hint}</div>}
    </div>
  )
}

export function Bar({
  value,
  max,
  tone = 'steel',
  height = 3,
}: {
  value: number
  max: number
  tone?: 'steel' | 'forge' | 'jade' | 'amber'
  height?: number
}) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color =
    tone === 'forge'
      ? 'bg-forge'
      : tone === 'jade'
        ? 'bg-jade'
        : tone === 'amber'
          ? 'bg-amber'
          : 'bg-iron'
  return (
    <div
      className="overflow-hidden bg-elevated"
      style={{ height, borderRadius: 1 }}
    >
      <div
        className={`h-full ${color}`}
        style={{ width: `${width}%`, borderRadius: 1 }}
      />
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?:
    | 'neutral'
    | 'forge'
    | 'jade'
    | 'amber'
    | 'renewable'
    | 'material'
    | 'process'
}) {
  const cls =
    tone === 'forge'
      ? 'border-[#93C5FD] bg-[#EFF6FF] text-[#2563EB]'
      : tone === 'jade'
        ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#16A34A]'
        : tone === 'amber'
          ? 'border-[#FDE047] bg-[#FEFCE8] text-[#CA8A04]'
          : tone === 'renewable'
            ? 'border-[#7DD3FC] bg-[#F0F9FF] text-[#0284C7]'
            : tone === 'material'
              ? 'border-[#FDE047] bg-[#FEFCE8] text-[#D97706]'
              : tone === 'process'
                ? 'border-[#D8B4FE] bg-[#FAF5FF] text-[#7C3AED]'
                : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold tracking-tight shadow-2xs ${cls}`}
    >
      {children}
    </span>
  )
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-2.5 px-5 py-14">
      <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-fg">
        {title}
      </h3>
      <p className="max-w-[52ch] text-[13.5px] leading-relaxed text-fg-dim">
        {body}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function BenchmarkGauge({
  value,
  median,
}: {
  value: number
  median: number
}) {
  const max = Math.max(2, Math.ceil(Math.max(value, median) * 1.15 * 2) / 2)
  const W = 260
  const H = 142
  const cx = W / 2
  const cy = 120
  const r = 92

  const [animProgress, setAnimProgress] = useState(0)

  useEffect(() => {
    setAnimProgress(0)
    const t = setTimeout(() => {
      setAnimProgress(1)
    }, 60)
    return () => clearTimeout(t)
  }, [value, median])

  const polar = (v: number, radius: number) => {
    const f = Math.min(1, Math.max(0, v / max))
    const a = Math.PI + f * Math.PI
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)] as const
  }

  const needle = polar(value * animProgress, r - 14)
  const medianTick = polar(median, r + 7)
  const medianInner = polar(median, r - 9)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = f * max
    const outer = polar(v, r + 5)
    const inner = polar(v, r - 7)
    return { f, v, outer, inner }
  })

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Carbon intensity ${value.toFixed(2)} against sector median ${median.toFixed(2)} tonnes CO2e per tonne`}
      >
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#0F172A"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${Math.min(1, (value * animProgress) / max) * Math.PI * r} ${Math.PI * r}`}
          style={{ transition: 'stroke-dasharray 750ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        {ticks.map((t) => (
          <line
            key={t.f}
            x1={t.inner[0]}
            y1={t.inner[1]}
            x2={t.outer[0]}
            y2={t.outer[1]}
            stroke={t.f === 0 || t.f === 1 ? '#64748B' : '#CBD5E1'}
            strokeWidth={1.5}
          />
        ))}
        <line
          x1={medianInner[0]}
          y1={medianInner[1]}
          x2={medianTick[0]}
          y2={medianTick[1]}
          stroke="#0284C7"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={needle[0]}
          y2={needle[1]}
          stroke="#0F172A"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ transition: 'x2 750ms cubic-bezier(0.16, 1, 0.3, 1), y2 750ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <circle cx={cx} cy={cy} r={6} fill="#0F172A" />
        <circle cx={cx} cy={cy} r={2.5} fill="#38BDF8" />
        <text
          x={cx - r}
          y={cy + 17}
          textAnchor="middle"
          fill="#64748B"
          style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', fontWeight: 500 }}
        >
          0
        </text>
        <text
          x={cx + r}
          y={cy + 17}
          textAnchor="middle"
          fill="#64748B"
          style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', fontWeight: 500 }}
        >
          {max.toFixed(1)}
        </text>
      </svg>
      <div className="-mt-1 flex items-baseline justify-center gap-1.5">
        <span className="num text-[25px] font-semibold leading-none text-fg">
          {value.toFixed(2)}
        </span>
        <span className="text-[13px] text-iron">tCO₂e / t output</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[12.5px]">
        <span className="flex items-center gap-1.5 font-medium text-fg-dim">
          <span className="h-2 w-2 rounded-full bg-[#0F172A]" />
          Your intensity
        </span>
        <span className="flex items-center gap-1.5 font-medium text-fg-dim">
          <span className="h-2 w-2 rounded-full bg-[#0284C7]" />
          Median <span className="num font-semibold text-fg">{median.toFixed(2)}</span>
        </span>
      </div>
    </div>
  )
}
