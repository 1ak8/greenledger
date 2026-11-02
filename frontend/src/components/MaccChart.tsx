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

export function MaccChart({
  interventions,
  selectedIds,
  height = 300,
}: Props) {
  const [hovered, setHovered] = useState<Intervention | null>(null)
  // Progressive animation state (grows from 0 to 1 on mount or when interventions change)
  const [animScale, setAnimScale] = useState(0)

  useEffect(() => {
    setAnimScale(0)
    const t = setTimeout(() => {
      setAnimScale(1)
    }, 60)
    return () => clearTimeout(t)
  }, [interventions])

  if (!interventions.length) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-[#64748B]">
        No interventions available for this sector.
      </div>
    )
  }

  // Interventions sorted by CO2 abatement (highest to lowest)
  const items = [...interventions].sort((a, b) => b.co2Abated - a.co2Abated)
  const isSelected = (id: string) =>
    selectedIds === undefined ? true : selectedIds.includes(id)

  const maxAbated = Math.max(...items.map((i) => i.co2Abated), 700)
  // Clean rounded Y-axis ceiling
  const yCeil = Math.ceil(maxAbated / 100) * 100

  const svgW = 680
  const svgH = height
  const padL = 60
  const padR = 24
  const padT = 24
  const padB = 60

  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB

  // Grid tick values (4 steps)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: Math.round(yCeil * (1 - f)),
    y: padT + f * plotH,
  }))

  const barCount = items.length
  const groupW = plotW / barCount
  const barW = Math.min(68, groupW * 0.58)

  return (
    <div className="relative w-full">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full min-w-[560px]"
          role="img"
          aria-label="Annual CO2 Abatement Bar Chart"
        >
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padL}
                x2={svgW - padR}
                y1={t.y}
                y2={t.y}
                stroke={t.val === 0 ? '#CBD5E1' : '#F1F5F9'}
                strokeWidth={t.val === 0 ? 1.5 : 1}
                strokeDasharray={t.val === 0 ? undefined : '3 4'}
              />
              <text
                x={padL - 10}
                y={t.y + 4}
                textAnchor="end"
                fill="#475569"
                style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* Upright Bars with Live CSS Transitions */}
          {items.map((item, idx) => {
            const on = isSelected(item.id)
            const targetH = (item.co2Abated / yCeil) * plotH
            const barH = targetH * animScale
            const x = padL + idx * groupW + (groupW - barW) / 2
            const y = padT + plotH - barH

            // Truncated label for X axis
            const shortName =
              item.name.length > 14 ? item.name.slice(0, 12) + '…' : item.name

            return (
              <g
                key={item.id}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Background column highlight on hover */}
                <rect
                  x={padL + idx * groupW + 2}
                  y={padT}
                  width={groupW - 4}
                  height={plotH}
                  fill={hovered?.id === item.id ? 'rgba(2, 132, 199, 0.04)' : 'transparent'}
                  rx={4}
                />

                {/* Vertical Upright Bar (Animated height & Y position) */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(2, barH)}
                  fill={on ? '#0F172A' : '#E2E8F0'}
                  stroke={on ? '#020617' : '#CBD5E1'}
                  strokeWidth={1}
                  rx={4}
                  style={{
                    transition:
                      'height 650ms cubic-bezier(0.16, 1, 0.3, 1), y 650ms cubic-bezier(0.16, 1, 0.3, 1), fill 300ms ease',
                  }}
                />

                {/* Abated Value Label on Top of the Bar */}
                <text
                  x={x + barW / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fill={on ? '#0F172A' : '#475569'}
                  style={{
                    fontSize: 12.5,
                    fontFamily: 'IBM Plex Mono',
                    fontWeight: 700,
                    opacity: animScale > 0.3 ? 1 : 0,
                    transition: 'opacity 400ms ease, y 650ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {item.co2Abated}t
                </text>

                {/* X-Axis Category Name */}
                <text
                  x={x + barW / 2}
                  y={padT + plotH + 20}
                  textAnchor="middle"
                  fill={on ? '#0F172A' : '#475569'}
                  style={{
                    fontSize: 12,
                    fontFamily: 'DM Sans',
                    fontWeight: 600,
                  }}
                >
                  {shortName}
                </text>

                {/* X-Axis Status Pill Subtitle */}
                <text
                  x={x + barW / 2}
                  y={padT + plotH + 36}
                  textAnchor="middle"
                  fill={on ? '#16A34A' : '#64748B'}
                  style={{
                    fontSize: 11,
                    fontFamily: 'DM Sans',
                    fontWeight: 700,
                    transition: 'fill 300ms ease',
                  }}
                >
                  {on ? 'Selected' : 'Filtered'}
                </text>
              </g>
            )
          })}

          {/* Y Axis Unit Label */}
          <text
            x={padL}
            y={padT - 10}
            fill="#64748B"
            style={{ fontSize: 11, fontFamily: 'DM Sans', fontWeight: 500 }}
          >
            tCO₂e abated / year
          </text>
        </svg>
      </div>

      {/* Hover Info Tooltip Bar */}
      {hovered && (
        <div className="mt-3 flex items-center justify-between rounded-[6px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-[12px]">
          <span className="font-semibold text-[#0F172A]">{hovered.name}</span>
          <div className="flex items-center gap-4 text-[#475569]">
            <span>
              Capex: <strong className="num text-[#0F172A]">{inr(hovered.capex)}</strong>
            </span>
            <span>
              Annual Saving: <strong className="num text-[#16A34A]">{inr(hovered.annualSavings)}</strong>
            </span>
            <span>
              Payback: <strong className="num text-[#0F172A]">{hovered.payback} yrs</strong>
            </span>
            <span>
              Abatement: <strong className="num text-[#0F172A]">{hovered.co2Abated} tCO₂e/yr</strong>
            </span>
          </div>
        </div>
      )}

      {/* Clean Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#E2E8F0] pt-3 text-[12px] text-[#64748B]">
        <span className="flex items-center gap-1.5 font-medium text-[#0F172A]">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[#0F172A]" />
          In Selected Portfolio
        </span>
        <span className="flex items-center gap-1.5 font-medium text-[#64748B]">
          <span className="h-2.5 w-2.5 rounded-[2px] border border-[#CBD5E1] bg-[#E2E8F0]" />
          Filtered / Outside Budget
        </span>
        <span className="ml-auto text-[#64748B]">
          Higher upright bar = greater annual carbon reduction
        </span>
      </div>
    </div>
  )
}
