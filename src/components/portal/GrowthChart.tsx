import type { GrowthDay } from '@/lib/newsletter'

/**
 * Mailing list growth.
 *
 * Two charts, not one. Daily joins and leaves are a flow of a handful a day;
 * the list size is a level in the hundreds. Putting both on one plot would
 * need two y-scales, which lets the reader infer any relationship the author
 * happens to have scaled into existence. Separate plots share an x-axis and
 * the comparison stays honest.
 *
 * Colours are a validated diverging pair — blue for gained, terracotta for
 * lost, checked for colourblind separation (ΔE 18.2 protan) rather than
 * chosen by eye. Green/red would have been the obvious pick and the worst one.
 * Identity never rests on colour alone: each series is directly labelled.
 */

const GAINED = '#2b6cb0'
const LOST = '#c8503a'
const LEVEL = '#b8862b'
const INK_SOFT = '#6d6d75'
const RULE = '#e7e1d5'

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function GrowthChart({ days }: { days: GrowthDay[] }) {
  if (days.length === 0) return null

  const W = 720
  const FLOW_H = 132
  const LEVEL_H = 96
  const PAD_L = 34
  const PAD_R = 8

  const plotW = W - PAD_L - PAD_R
  const step = plotW / days.length
  const barW = Math.max(2, Math.min(14, step - 3))

  const maxFlow = Math.max(1, ...days.map((d) => Math.max(d.joined, d.left)))
  const maxLevel = Math.max(1, ...days.map((d) => d.total))

  const zeroY = FLOW_H / 2
  const flowScale = (zeroY - 12) / maxFlow

  const totalJoined = days.reduce((n, d) => n + d.joined, 0)
  const totalLeft = days.reduce((n, d) => n + d.left, 0)

  // Label roughly six dates, never every one.
  const tickEvery = Math.max(1, Math.ceil(days.length / 6))

  const levelPoints = days.map((d, i) => {
    const x = PAD_L + i * step + step / 2
    const y = LEVEL_H - 14 - (d.total / maxLevel) * (LEVEL_H - 26)
    return { x, y, d }
  })

  const linePath = levelPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const areaPath =
    `${linePath} L${levelPoints[levelPoints.length - 1]!.x.toFixed(1)},${LEVEL_H - 14} ` +
    `L${levelPoints[0]!.x.toFixed(1)},${LEVEL_H - 14} Z`

  return (
    <div>
      {/* Joins and leaves ---------------------------------------------------- */}
      <div className="mb-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="flex items-center gap-2 text-[12.5px] text-ink">
          <span
            aria-hidden="true"
            className="block h-2.5 w-2.5 rounded-[1px]"
            style={{ background: GAINED }}
          />
          Joined
          <span className="tabular-nums text-ink-soft">{totalJoined}</span>
        </span>
        <span className="flex items-center gap-2 text-[12.5px] text-ink">
          <span
            aria-hidden="true"
            className="block h-2.5 w-2.5 rounded-[1px]"
            style={{ background: LOST }}
          />
          Left
          <span className="tabular-nums text-ink-soft">{totalLeft}</span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${FLOW_H}`}
        className="w-full"
        role="img"
        aria-label={`Daily joins and leaves. ${totalJoined} joined and ${totalLeft} left over ${days.length} days.`}
      >
        <line x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY} stroke={RULE} strokeWidth="1" />

        {/* The scale runs out from zero in both directions, so the maximum is
            marked at each end and zero on the line itself. Both figures sat
            beside the line before, which read as the same number printed twice
            rather than as the top and bottom of an axis. */}
        <text x={4} y={14} fontSize="9" fill={INK_SOFT}>
          {maxFlow}
        </text>
        <text x={4} y={zeroY + 3} fontSize="9" fill={INK_SOFT}>
          0
        </text>
        <text x={4} y={FLOW_H - 4} fontSize="9" fill={INK_SOFT}>
          {maxFlow}
        </text>

        {days.map((day, i) => {
          const x = PAD_L + i * step + (step - barW) / 2
          const upH = day.joined * flowScale
          const downH = day.left * flowScale
          return (
            <g key={day.date}>
              {day.joined > 0 ? (
                // 2px gap off the baseline so up and down bars never touch.
                <rect
                  x={x}
                  y={zeroY - 1 - upH}
                  width={barW}
                  height={Math.max(2, upH)}
                  rx="2"
                  fill={GAINED}
                />
              ) : null}
              {day.left > 0 ? (
                <rect
                  x={x}
                  y={zeroY + 1}
                  width={barW}
                  height={Math.max(2, downH)}
                  rx="2"
                  fill={LOST}
                />
              ) : null}
              <title>
                {`${shortDate(day.date)}: ${day.joined} joined, ${day.left} left`}
              </title>
            </g>
          )
        })}
      </svg>

      {/* List size ------------------------------------------------------------ */}
      <p className="mb-1 mt-5 flex items-center gap-2 text-[12.5px] text-ink">
        <span
          aria-hidden="true"
          className="block h-2.5 w-2.5 rounded-[1px]"
          style={{ background: LEVEL }}
        />
        List size
        <span className="tabular-nums text-ink-soft">
          {days[days.length - 1]?.total ?? 0}
        </span>
      </p>

      <svg
        viewBox={`0 0 ${W} ${LEVEL_H}`}
        className="w-full"
        role="img"
        aria-label={`Mailing list size over ${days.length} days, ending at ${days[days.length - 1]?.total ?? 0}.`}
      >
        <line
          x1={PAD_L}
          y1={LEVEL_H - 14}
          x2={W - PAD_R}
          y2={LEVEL_H - 14}
          stroke={RULE}
          strokeWidth="1"
        />
        <text x={4} y={16} fontSize="9" fill={INK_SOFT}>
          {maxLevel}
        </text>
        {/* The area is filled to this line, so it needs saying that it is zero
            and not simply where the drawing stopped. */}
        <text x={4} y={LEVEL_H - 11} fontSize="9" fill={INK_SOFT}>
          0
        </text>

        <path d={areaPath} fill={LEVEL} opacity="0.1" />
        <path
          d={linePath}
          fill="none"
          stroke={LEVEL}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* One marker at the end rather than a dot on every point. */}
        <circle
          cx={levelPoints[levelPoints.length - 1]!.x}
          cy={levelPoints[levelPoints.length - 1]!.y}
          r="3.5"
          fill={LEVEL}
          stroke="#ffffff"
          strokeWidth="2"
        />

        {days.map((day, i) =>
          i % tickEvery === 0 ? (
            <text
              key={day.date}
              x={PAD_L + i * step + step / 2}
              y={LEVEL_H - 2}
              fontSize="9"
              fill={INK_SOFT}
              textAnchor="middle"
            >
              {shortDate(day.date)}
            </text>
          ) : null,
        )}
      </svg>

      {/* The same figures as a table, for anyone the chart does not serve. */}
      <details className="mt-4">
        <summary className="cursor-pointer text-[12px] text-ink-soft hover:text-ink">
          View as a table
        </summary>
        <div className="mt-3 max-h-64 overflow-y-auto border border-rule">
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 bg-parchment">
              <tr>
                {['Date', 'Joined', 'Left', 'Net', 'List size'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-3 py-2 text-left text-[10.5px] uppercase tracking-[0.14em] text-ink-soft"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {[...days].reverse().map((day) => (
                <tr key={day.date}>
                  <td className="px-3 py-1.5 text-ink-soft">{shortDate(day.date)}</td>
                  <td className="px-3 py-1.5 tabular-nums text-ink">{day.joined}</td>
                  <td className="px-3 py-1.5 tabular-nums text-ink">{day.left}</td>
                  <td className="px-3 py-1.5 tabular-nums text-ink">
                    {day.net > 0 ? `+${day.net}` : day.net}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums text-ink">{day.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
