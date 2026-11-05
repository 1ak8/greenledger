import { useEffect, useState } from 'react'
import type { Intervention } from '../lib/types'
import { inr } from '../lib/format'

interface Props {
  interventions: Intervention[]
  selectedIds?: string[]
  height?: number
  showAxis?: boolean
  compact?: boolean
}

function splitLabel(name: string): string[] {
  const clean = name.replace(/\s+/g, ' ').trim()
  if (clean.length <= 18) return [clean]

  const words = clean.split(' ')
  let best: { first: string; second: string; score: number } | null = null
  for (let i = 1; i < words.length; i++) {
    const first = words.slice(0, i).join(' ')
    const second = words.slice(i).join(' ')
    if (first.length <= 20 && second.length <= 20) {
      const score = Math.max(first.length, second.length)
      if (!best || score < best.score) best = { first, second, score }
    }
  }
  if (best) return [best.first, best.second]

  const first = words[0]
  const rest = words.slice(1).join(' ')
  return [first, rest.length > 18 ? `${rest.slice(0, 17)}…` : rest]
}

function niceCeiling(value: number) {
  const step = value > 1000 ? 500 : value > 500 ? 100 : value > 200 ? 50 : 20
  return Math.max(step, Math.ceil((value * 1.06) / step) * step)
}

export function MaccChart({
  interventions,
  selectedIds,
  height = 320,
}: Props) {
  const [hovered, setHovered] = useState<Intervention | null>(null)
  const [animScale, setAnimScale] = useState(0)

  useEffect(() => {
    setAnimScale(0)
    const t = setTimeout(() => setAnimScale(1), 80)
    return () => clearTimeout(t)
  }, [interventions])

  if (!interventions.length) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-elevated text-[#64748b]">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          </svg>
        </span>
        <div>
          <p className="text-[13px] font-semibold text-fg">
            No interventions available
          </p>
          <p className="mt-0.5 text-[12.5px] text-fg-faint">
            The catalogue for this sector has not loaded yet.
          </p>
        </div>
      </div>
    )
  }

  const items = [...interventions].sort((a, b) => b.co2Abated - a.co2Abated)
  const hasSelection = selectedIds !== undefined
  const isSelected = (id: string) =>
    selectedIds === undefined ? true : selectedIds.includes(id)
  const selectedCount = items.filter((i) => isSelected(i.id)).length
  const active = hovered ?? items.find((i) => isSelected(i.id)) ?? items[0]
  const activeSelected = isSelected(active.id)

  const maxAbated = Math.max(...items.map((i) => i.co2Abated), 100)
  const yCeil = niceCeiling(maxAbated)

  const svgW = 720
  const svgH = height
  const padL = 54
  const padR = 18
  const padT = 30
  const padB = 82

  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: Math.round(yCeil * (1 - f)),
    y: padT + f * plotH,
  }))

  const barCount = items.length
  const groupW = plotW / barCount
  const barW = Math.min(58, groupW * 0.52)

  return (
    <div className="relative w-full">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full min-w-[520px]"
          role="img"
          aria-label="Annual CO₂ abatement by intervention"
        >
          <text
            x={padL}
            y={padT - 12}
            fill="#64748b"
            style={{
              fontSize: 10,
              fontFamily: 'DM Sans',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            TCO₂E ABATED / YEAR
          </text>

          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padL}
                x2={svgW - padR}
                y1={t.y}
                y2={t.y}
                stroke={t.val === 0 ? '#d5dee9' : '#edf1f6'}
                strokeWidth={t.val === 0 ? 1.2 : 1}
                strokeDasharray={t.val === 0 ? undefined : '3 5'}
              />
              <text
                x={padL - 10}
                y={t.y + 4}
                textAnchor="end"
                fill="#52627a"
                style={{
                  fontSize: 11.5,
                  fontFamily: 'IBM Plex Mono',
                  fontWeight: 600,
                }}
              >
                {t.val.toLocaleString('en-IN')}
              </text>
            </g>
          ))}

          {items.map((item, idx) => {
            const on = isSelected(item.id)
            const targetH = (item.co2Abated / yCeil) * plotH
            const barH = targetH * animScale
            const x = padL + idx * groupW + (groupW - barW) / 2
            const y = padT + plotH - barH
            const isHovered = hovered?.id === item.id
            const lines = splitLabel(item.name)
            const labelY = padT + plotH + (lines.length > 1 ? 18 : 26)
            const statusY = labelY + (lines.length > 1 ? 32 : 16)

            return (
              <g
                key={item.id}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>
                  {`${item.name}: ${item.co2Abated} tonnes CO2e per year, ${inr(
                    item.capex,
                  )} capex, ${item.payback} year payback`}
                </title>

                <rect
                  x={padL + idx * groupW + 3}
                  y={padT}
                  width={groupW - 6}
                  height={plotH}
                  rx={6}
                  fill={isHovered ? 'rgba(37,99,235,0.045)' : 'transparent'}
                  style={{ transition: 'fill 160ms ease' }}
                />

                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(3, barH)}
                  rx={4}
                  fill={
                    on
                      ? isHovered
                        ? '#1e2b45'
                        : '#0f172a'
                      : isHovered
                        ? '#dbe4f0'
                        : '#e8edf4'
                  }
                  stroke={on ? 'transparent' : '#d7dee8'}
                  strokeWidth={1}
                  style={{
                    transition:
                      'height 700ms cubic-bezier(0.16, 1, 0.3, 1), y 700ms cubic-bezier(0.16, 1, 0.3, 1), fill 160ms ease',
                  }}
                />

                <text
                  x={x + barW / 2}
                  y={y - 9}
                  textAnchor="middle"
                  fill={on ? '#0a1222' : '#52627a'}
                  style={{
                    fontSize: 12,
                    fontFamily: 'IBM Plex Mono',
                    fontWeight: 700,
                    opacity: animScale > 0.35 ? 1 : 0,
                    transition:
                      'opacity 380ms ease, y 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {item.co2Abated.toLocaleString('en-IN')}
                </text>

                {lines.map((line, lineIdx) => (
                  <text
                    key={lineIdx}
                    x={x + barW / 2}
                    y={labelY + lineIdx * 13}
                    textAnchor="middle"
                    fill={on ? '#0a1222' : '#52627a'}
                    style={{
                      fontSize: 11.5,
                      fontFamily: 'DM Sans',
                      fontWeight: 600,
                    }}
                  >
                    {line}
                  </text>
                ))}

                <circle
                  cx={x + barW / 2 - 19}
                  cy={statusY - 3.5}
                  r={2.5}
                  fill={
                    on ? (hasSelection ? '#15803d' : '#475569') : '#94a3b8'
                  }
                />
                <text
                  x={x + barW / 2 - 13}
                  y={statusY}
                  fill={on ? (hasSelection ? '#15803d' : '#52627a') : '#64748b'}
                  style={{
                    fontSize: 9.5,
                    fontFamily: 'DM Sans',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                  }}
                >
                  {on
                    ? hasSelection
                      ? 'SELECTED'
                      : 'AVAILABLE'
                    : hasSelection
                      ? 'OUTSIDE'
                      : 'FILTERED'}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div
        className="mt-2 rounded-[8px] border border-line bg-elevated px-4 py-3"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[12.5px] font-semibold text-fg">
            {active.name}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-[5px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${
              activeSelected
                ? 'border-[#cbe6d5] bg-white text-jade'
                : 'border-line bg-white text-fg-faint'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeSelected ? 'bg-jade' : 'bg-[#94a3b8]'
              }`}
            />
            {activeSelected
              ? hasSelection
                ? 'In portfolio'
                : 'Available'
              : 'Outside budget'}
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
          {[
            { label: 'Capex', value: inr(active.capex) },
            { label: 'Annual saving', value: inr(active.annualSavings) },
            {
              label: 'Abatement',
              value: `${active.co2Abated.toLocaleString('en-IN')} tCO₂e`,
            },
            { label: 'Payback', value: `${active.payback} yrs` },
          ].map((field) => (
            <div key={field.label}>
              <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#5b6b82]">
                {field.label}
              </div>
              <div className="num mt-0.5 text-[12px] font-semibold text-fg">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3 text-[11.5px]">
        <span className="flex items-center gap-1.5 font-semibold text-fg">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[#0f172a]" />
          {hasSelection ? 'In selected portfolio' : 'Available measures'}
          <span className="num text-[#64748b]">{selectedCount}</span>
        </span>
        <span className="flex items-center gap-1.5 font-medium text-[#64748b]">
          <span className="h-2.5 w-2.5 rounded-[2px] border border-[#d7dee8] bg-[#e8edf4]" />
          Outside budget
          <span className="num">{items.length - selectedCount}</span>
        </span>
        <span className="ml-auto text-[11px] font-medium text-[#5b6b82]">
          Hover a bar for unit economics
        </span>
      </div>
    </div>
  )
}
