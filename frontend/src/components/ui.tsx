import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Inbox } from 'lucide-react'

function parseMetric(value: string) {
  const match = value.match(/-?\d[\d,]*(?:\.\d+)?/)
  if (!match || match.index === undefined) return null
  const token = match[0]
  const target = Number(token.replace(/,/g, ''))
  if (!Number.isFinite(target)) return null
  return {
    target,
    decimals: token.includes('.') ? token.split('.')[1].length : 0,
    grouped: token.includes(','),
    prefix: value.slice(0, match.index),
    suffix: value.slice(match.index + token.length),
  }
}

function composeMetric(
  parsed: NonNullable<ReturnType<typeof parseMetric>>,
  value: number,
) {
  const body = parsed.grouped
    ? value.toLocaleString('en-IN', {
        minimumFractionDigits: parsed.decimals,
        maximumFractionDigits: parsed.decimals,
      })
    : value.toFixed(parsed.decimals)
  return parsed.prefix + body + parsed.suffix
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  )
}

export function AnimatedValue({ value }: { value: string }) {
  const parsed = parseMetric(value)
  const [display, setDisplay] = useState(() => {
    if (!parsed || prefersReducedMotion()) return value
    return composeMetric(parsed, 0)
  })
  const previous = useRef<number | null>(null)

  useEffect(() => {
    const metric = parsed
    if (!metric || prefersReducedMotion()) {
      setDisplay(value)
      if (metric) previous.current = metric.target
      return
    }

    const from = previous.current ?? 0
    const to = metric.target
    if (from === to) {
      previous.current = to
      setDisplay(value)
      return
    }

    let frame = 0
    const started = performance.now()
    const duration = 900
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(composeMetric(metric, from + (to - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else {
        previous.current = to
        setDisplay(value)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <>{display}</>
}

export function LedgerRule({ className = '' }: { className?: string }) {
  return (
    <div
      className={`ledger-rule flex items-center gap-3 ${className}`}
      aria-hidden="true"
    >
      <span className="ledger-bar h-[2px] w-12 shrink-0 bg-fg" />
      <span className="ledger-line h-px flex-1 bg-line" />
      <span className="ledger-dot h-1.5 w-1.5 shrink-0 rounded-[1px] bg-jade" />
    </div>
  )
}

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
    <header className="mb-7">
      <div className="grid items-start gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 max-w-[68ch]">
          <h1 className="text-[30px] leading-[1.03] sm:text-[36px] lg:text-[38px]">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-[68ch] text-[14.5px] font-medium leading-relaxed text-fg-dim">
              {description}
            </p>
          )}
          {meta && <div className="mt-4">{meta}</div>}
        </div>
        {action && (
          <div className="shrink-0 lg:pt-1.5">{action}</div>
        )}
      </div>
      <LedgerRule className="mt-6" />
    </header>
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
  footer,
}: {
  title?: string
  meta?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
  accent?: boolean
  footer?: ReactNode
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex min-h-[52px] items-center gap-3 border-b border-line px-5 py-2.5">
          {accent && (
            <span
              className="h-4 w-[3px] shrink-0 rounded-full bg-forge"
              aria-hidden="true"
            />
          )}
          {title && <h2 className="panel-title shrink-0">{title}</h2>}
          {meta && (
            <div className="hidden min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg-faint sm:block">
              {meta}
            </div>
          )}
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
      {footer && (
        <div className="border-t border-line bg-elevated px-5 py-3">
          {footer}
        </div>
      )}
    </section>
  )
}

type Tone = 'default' | 'positive' | 'accent' | 'muted' | 'alert'

const STAT_TONES: Record<
  Tone,
  {
    wrap: string
    icon: string
    label: string
    value: string
    unit: string
    hint: string
    badge: string | null
    badgeClass: string
    bar: string
  }
> = {
  default: {
    wrap: 'border-line bg-panel',
    icon: 'border-line bg-elevated text-fg-dim',
    label: 'text-fg-dim',
    value: 'text-fg',
    unit: 'text-fg-faint',
    hint: 'text-fg-faint',
    badge: null,
    badgeClass: '',
    bar: 'bg-iron',
  },
  positive: {
    wrap: 'border-[#d4ebdc] bg-[#f4fbf6]',
    icon: 'border-[#cbe6d5] bg-white text-jade',
    label: 'text-[#166534]',
    value: 'text-[#14532d]',
    unit: 'text-[#15803d]',
    hint: 'text-[#3f6b4f]',
    badge: 'Optimal',
    badgeClass: 'border-[#c6e6d2] bg-white text-[#15803d]',
    bar: 'bg-jade',
  },
  accent: {
    wrap: 'border-[#d9e5fe] bg-[#f4f8ff]',
    icon: 'border-[#d2e1fd] bg-white text-forge',
    label: 'text-[#1e40af]',
    value: 'text-[#1e3a8a]',
    unit: 'text-[#1d4ed8]',
    hint: 'text-[#3f5f9e]',
    badge: 'Primary',
    badgeClass: 'border-[#cfe0fd] bg-white text-[#1d4ed8]',
    bar: 'bg-forge',
  },
  alert: {
    wrap: 'border-[#f0e2b6] bg-[#fffbeb]',
    icon: 'border-[#efdfae] bg-white text-amber',
    label: 'text-[#92400e]',
    value: 'text-[#78350f]',
    unit: 'text-[#b45309]',
    hint: 'text-[#7c5a23]',
    badge: 'Exposure',
    badgeClass: 'border-[#eedda8] bg-white text-[#92400e]',
    bar: 'bg-amber',
  },
  muted: {
    wrap: 'border-line bg-panel',
    icon: 'border-line bg-elevated text-iron',
    label: 'text-fg-dim',
    value: 'text-fg',
    unit: 'text-fg-faint',
    hint: 'text-fg-faint',
    badge: null,
    badgeClass: '',
    bar: 'bg-iron',
  },
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
  icon,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: Tone
  bar?: number
  barTone?: 'steel' | 'forge' | 'jade' | 'amber'
  className?: string
  valueClassName?: string
  icon?: ReactNode
}) {
  const t = STAT_TONES[tone]
  return (
    <div
      className={`stat-card relative overflow-hidden rounded-[12px] border p-4 shadow-[0_1px_2px_rgba(10,18,34,0.03)] sm:p-5 ${t.wrap} ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border ${t.icon}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span className={`text-[12.5px] font-semibold tracking-tight ${t.label}`}>
          {label}
        </span>
        {t.badge && (
          <span
            className={`ml-auto hidden rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.04em] 2xl:inline-flex ${t.badgeClass}`}
          >
            {t.badge}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={`figure whitespace-nowrap text-[30px] leading-none sm:text-[34px] ${t.value} ${valueClassName}`}
        >
          <AnimatedValue value={value} />
        </span>
        {unit && (
          <span className={`font-sans text-[13px] font-semibold ${t.unit}`}>
            {unit}
          </span>
        )}
      </div>
      {bar !== undefined && (
        <div className="mt-3.5">
          <Bar
            value={bar}
            max={100}
            tone={barTone ?? 'steel'}
            height={4}
            track={tone === 'default' || tone === 'muted' ? 'light' : 'tint'}
          />
        </div>
      )}
      {hint && (
        <div className={`mt-2.5 text-[12.5px] font-medium leading-snug ${t.hint}`}>
          {hint}
        </div>
      )}
    </div>
  )
}

export function Bar({
  value,
  max,
  tone = 'steel',
  height = 3,
  track = 'light',
}: {
  value: number
  max: number
  tone?: 'steel' | 'forge' | 'jade' | 'amber'
  height?: number
  track?: 'light' | 'tint'
}) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 60)
    return () => clearTimeout(t)
  }, [])
  const color =
    tone === 'forge'
      ? 'bg-forge'
      : tone === 'jade'
        ? 'bg-jade'
        : tone === 'amber'
          ? 'bg-amber'
          : 'bg-iron'
  const shown = grown || prefersReducedMotion() ? width : 0
  return (
    <div
      className={`overflow-hidden rounded-full ${
        track === 'tint' ? 'bg-white/70' : 'bg-[#edf1f6]'
      }`}
      style={{ height }}
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full ${color}`}
        style={{
          width: `${shown}%`,
          transition: 'width 700ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
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
      ? 'border-[#d2e1fd] bg-[#f4f8ff] text-[#1d4ed8]'
      : tone === 'jade'
        ? 'border-[#cbe6d5] bg-[#f2fbf5] text-[#15803d]'
        : tone === 'amber'
          ? 'border-[#efdfae] bg-[#fffbeb] text-[#92400e]'
          : tone === 'renewable'
            ? 'border-[#c7e7f8] bg-[#f0f9ff] text-[#0369a1]'
            : tone === 'material'
              ? 'border-[#f3dfae] bg-[#fffbeb] text-[#b45309]'
              : tone === 'process'
                ? 'border-[#ddd0fb] bg-[#f7f4ff] text-[#6d28d9]'
                : 'border-line bg-elevated text-fg-dim'
  return (
    <span
      className={`inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[11.5px] font-semibold tracking-tight ${cls}`}
    >
      {children}
    </span>
  )
}

export function Empty({
  title,
  body,
  action,
  icon,
}: {
  title: string
  body: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-line bg-elevated text-fg-faint">
        {icon ?? <Inbox size={19} strokeWidth={1.8} />}
      </div>
      <h3 className="mt-4 font-display text-[19px] font-semibold tracking-[-0.025em] text-fg">
        {title}
      </h3>
      <p className="mt-1.5 max-w-[48ch] text-[13.5px] leading-relaxed text-fg-dim">
        {body}
      </p>
      {action && <div className="mt-4">{action}</div>}
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
  const rawMax = Math.max(value, median) * 1.18
  const step = rawMax <= 1 ? 0.2 : rawMax <= 3 ? 0.5 : 1
  const max = Math.max(step, Math.ceil(rawMax / step) * step)

  const W = 300
  const H = 172
  const cx = W / 2
  const cy = 142
  const r = 105

  const [animProgress, setAnimProgress] = useState(0)

  useEffect(() => {
    setAnimProgress(0)
    const t = setTimeout(() => setAnimProgress(1), 80)
    return () => clearTimeout(t)
  }, [value, median])

  const polar = (v: number, radius: number) => {
    const f = Math.min(1, Math.max(0, v / max))
    const a = Math.PI + f * Math.PI
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)] as const
  }

  const trackArc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const circumference = Math.PI * r
  const progress = Math.min(1, (value * animProgress) / max)
  const end = polar(value * animProgress, r)
  const medianOuter = polar(median, r + 9)
  const medianInner = polar(median, r - 13)
  const tick = polar(0, r)
  const tickMax = polar(max, r)

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Carbon intensity ${value.toFixed(2)} against sector median ${median.toFixed(2)} tonnes CO2e per tonne`}
      >
        <path
          d={trackArc}
          fill="none"
          stroke="#e9eef5"
          strokeWidth={13}
          strokeLinecap="round"
        />
        <path
          d={trackArc}
          fill="none"
          stroke="#0f172a"
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={`${progress * circumference} ${circumference}`}
          style={{
            transition: 'stroke-dasharray 800ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <circle
          cx={end[0]}
          cy={end[1]}
          r={4.5}
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth={2.5}
          style={{
            opacity: animProgress > 0.2 ? 1 : 0,
            transition:
              'cx 800ms cubic-bezier(0.16, 1, 0.3, 1), cy 800ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease',
          }}
        />
        <line
          x1={medianInner[0]}
          y1={medianInner[1]}
          x2={medianOuter[0]}
          y2={medianOuter[1]}
          stroke="#0284c7"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <text
          x={cx}
          y={cy - 24}
          textAnchor="middle"
          fill="#0a1222"
          style={{
            fontSize: 34,
            fontFamily: 'Space Grotesk',
            fontWeight: 700,
            letterSpacing: '-0.045em',
          }}
        >
          <AnimatedValue value={value.toFixed(2)} />
        </text>
        <text
          x={cx}
          y={cy - 5}
          textAnchor="middle"
          fill="#475569"
          style={{ fontSize: 11.5, fontFamily: 'DM Sans', fontWeight: 600 }}
        >
          tCO₂e / t output
        </text>
        <text
          x={tick[0]}
          y={cy + 20}
          textAnchor="middle"
          fill="#64748b"
          style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}
        >
          0
        </text>
        <text
          x={tickMax[0]}
          y={cy + 20}
          textAnchor="middle"
          fill="#64748b"
          style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}
        >
          {max.toFixed(1)}
        </text>
      </svg>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3 text-[12.5px]">
        <span className="flex items-center gap-1.5 font-semibold text-fg-dim">
          <span className="h-2 w-2 rounded-full bg-[#0f172a]" />
          Your intensity
          <span className="num font-bold text-fg">
            <AnimatedValue value={value.toFixed(2)} />
          </span>
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-fg-dim">
          <span className="h-2.5 w-[3px] rounded-full bg-[#0284c7]" />
          Median
          <span className="num font-bold text-fg">
            <AnimatedValue value={median.toFixed(2)} />
          </span>
        </span>
      </div>
    </div>
  )
}
