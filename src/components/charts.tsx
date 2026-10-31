// SVG-based chart components for Hypothesis Zero
// All charts use the archive color palette and are interactive where noted

import { useState, useMemo, useCallback } from 'react';

// ── Shared utilities ──────────────────────────────────────────────────────

interface Scale {
  toX: (v: number) => number;
  toY: (v: number) => number;
  fromX: (px: number) => number;
  fromY: (py: number) => number;
}

function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const dSpan = d1 - d0 || 1;
  const rSpan = r1 - r0;
  const to = (v: number, d0n: number, d1n: number, r0n: number, r1n: number) =>
    r0n + ((v - d0n) / (d1n - d0n || 1)) * (r1n - r0n);
  return {
    toX: (v: number) => to(v, d0, d1, r0, r1),
    toY: (v: number) => to(v, d0, d1, r1, r0),
    fromX: (px: number) => d0 + ((px - r0) / rSpan) * dSpan,
    fromY: (py: number) => d0 + ((py - r0) / rSpan) * dSpan,
  };
}

function niceDomain(values: number[], padding = 0.05): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return [min - span * padding, max + span * padding];
}

const COLORS = {
  ink: '#252525',
  secondary: '#65635F',
  burgundy: '#783E48',
  blue: '#476B87',
  green: '#66846B',
  highlight: '#E9C968',
  divider: '#D9D2C6',
  paper: '#FFFEFA',
  archive: '#F5F1E8',
};

// ── Scatterplot ───────────────────────────────────────────────────────────

interface ScatterProps {
  points: Array<[number, number]>;
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  title?: string;
  regressionLine?: { intercept: number; slope: number; xMin: number; xMax: number };
  highlightIndex?: number;
  onSelectPoint?: (index: number) => void;
  selectedIndices?: Set<number>;
  groupLabels?: string[];
  width?: number;
  height?: number;
}

export function ScatterPlot({
  points, xLabel, yLabel, xUnit, yUnit, title, regressionLine,
  onSelectPoint, selectedIndices, highlightIndex, width = 480, height = 320,
}: ScatterProps) {
  const [hover, setHover] = useState<number | null>(null);

  const margin = { top: 30, right: 20, bottom: 50, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const xDomain = useMemo(() => niceDomain(points.map(p => p[0])), [points]);
  const yDomain = useMemo(() => niceDomain(points.map(p => p[1])), [points]);
  const xScale = linearScale(xDomain, [margin.left, margin.left + plotW]);
  const yScale = linearScale(yDomain, [margin.top + plotH, margin.top]);

  const ticks = (domain: [number, number], n: number): number[] => {
    const step = (domain[1] - domain[0]) / (n - 1);
    return Array.from({ length: n }, (_, i) => domain[0] + i * step);
  };
  const xTicks = ticks(xDomain, 5);
  const yTicks = ticks(yDomain, 5);

  const fmtTick = (v: number) => {
    if (Math.abs(v) < 0.01 && v !== 0) return v.toExponential(1);
    if (Math.abs(v) >= 1000) return v.toExponential(1);
    return v.toFixed(Math.abs(v) < 10 ? 2 : 1);
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={`Scatterplot of ${yLabel} vs ${xLabel}${title ? ': ' + title : ''}`}>
      {title && <text x={width / 2} y={16} textAnchor="middle" className="font-serif" fontSize={13} fill={COLORS.ink}>{title}</text>}

      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={`ygrid-${i}`}>
          <line x1={margin.left} y1={yScale.toY(t)} x2={margin.left + plotW} y2={yScale.toY(t)} stroke={COLORS.divider} strokeWidth={0.5} />
          <text x={margin.left - 8} y={yScale.toY(t) + 4} textAnchor="end" fontSize={9} fill={COLORS.secondary} className="font-mono">{fmtTick(t)}</text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <g key={`xgrid-${i}`}>
          <line x1={xScale.toX(t)} y1={margin.top} x2={xScale.toX(t)} y2={margin.top + plotH} stroke={COLORS.divider} strokeWidth={0.5} />
          <text x={xScale.toX(t)} y={margin.top + plotH + 16} textAnchor="middle" fontSize={9} fill={COLORS.secondary} className="font-mono">{fmtTick(t)}</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />

      {/* Axis labels */}
      <text x={margin.left + plotW / 2} y={height - 8} textAnchor="middle" fontSize={11} fill={COLORS.ink}>{xLabel}{xUnit ? ` (${xUnit})` : ''}</text>
      <text x={14} y={margin.top + plotH / 2} textAnchor="middle" fontSize={11} fill={COLORS.ink}
        transform={`rotate(-90 14 ${margin.top + plotH / 2})`}>{yLabel}{yUnit ? ` (${yUnit})` : ''}</text>

      {/* Regression line */}
      {regressionLine && (
        <line
          x1={xScale.toX(regressionLine.xMin)}
          y1={yScale.toY(regressionLine.intercept + regressionLine.slope * regressionLine.xMin)}
          x2={xScale.toX(regressionLine.xMax)}
          y2={yScale.toY(regressionLine.intercept + regressionLine.slope * regressionLine.xMax)}
          stroke={COLORS.burgundy}
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      )}

      {/* Points */}
      {points.map(([x, y], i) => {
        const px = xScale.toX(x);
        const py = yScale.toY(y);
        const isSelected = selectedIndices?.has(i);
        const isHover = hover === i;
        const isHighlight = highlightIndex === i;
        const r = isHover || isSelected || isHighlight ? 5 : 3.5;
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r={r}
            fill={isHighlight ? COLORS.burgundy : isSelected ? COLORS.blue : COLORS.ink}
            fillOpacity={isHover || isSelected || isHighlight ? 1 : 0.7}
            stroke={COLORS.paper}
            strokeWidth={0.8}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelectPoint?.(i)}
            role="button"
            aria-label={`Point ${i + 1}: ${xLabel}=${x.toFixed(2)}, ${yLabel}=${y.toFixed(2)}`}
          >
            <title>{`#${i + 1}: ${xLabel}=${x.toFixed(2)}, ${yLabel}=${y.toFixed(2)}`}</title>
          </circle>
        );
      })}

      {/* Hover tooltip */}
      {hover !== null && (
        <g>
          <rect
            x={Math.min(xScale.toX(points[hover][0]) + 8, width - 120)}
            y={Math.max(yScale.toY(points[hover][1]) - 28, margin.top)}
            width={112} height={34} fill={COLORS.paper} stroke={COLORS.divider} strokeWidth={0.5}
          />
          <text
            x={Math.min(xScale.toX(points[hover][0]) + 14, width - 114)}
            y={Math.max(yScale.toY(points[hover][1]) - 16, margin.top + 12)}
            fontSize={9} fill={COLORS.ink} className="font-mono"
          >#{hover + 1}: {points[hover][0].toFixed(2)}, {points[hover][1].toFixed(2)}</text>
        </g>
      )}
    </svg>
  );
}

// ── Histogram ─────────────────────────────────────────────────────────────

interface HistogramProps {
  values: number[];
  label: string;
  unit?: string;
  title?: string;
  bins?: number;
  width?: number;
  height?: number;
  highlightRange?: [number, number];
}

export function Histogram({ values, label, unit, title, bins = 12, width = 480, height = 280, highlightRange }: HistogramProps) {
  const margin = { top: 28, right: 20, bottom: 45, left: 50 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const { binData, xDomain, maxCount } = useMemo(() => {
    if (values.length === 0) return { binData: [], xDomain: [0, 1] as [number, number], maxCount: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const binWidth = span / bins;
    const counts = new Array(bins).fill(0);
    for (const v of values) {
      let idx = Math.floor((v - min) / binWidth);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    }
    const bd = counts.map((c, i) => ({
      count: c,
      x0: min + i * binWidth,
      x1: min + (i + 1) * binWidth,
    }));
    return { binData: bd, xDomain: [min, max] as [number, number], maxCount: Math.max(...counts, 1) };
  }, [values, bins]);

  const xScale = linearScale(xDomain, [margin.left, margin.left + plotW]);
  const yScale = linearScale([0, maxCount], [margin.top + plotH, margin.top]);

  const fmtTick = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toExponential(1);
    return v.toFixed(Math.abs(v) < 10 ? 2 : 1);
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={`Histogram of ${label}${title ? ': ' + title : ''}`}>
      {title && <text x={width / 2} y={16} textAnchor="middle" className="font-serif" fontSize={13} fill={COLORS.ink}>{title}</text>}

      {/* Y ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const v = maxCount * f;
        const y = yScale.toY(v);
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke={COLORS.divider} strokeWidth={0.5} />
            <text x={margin.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill={COLORS.secondary} className="font-mono">{Math.round(v)}</text>
          </g>
        );
      })}

      {/* Bars */}
      {binData.map((b, i) => {
        const x0 = xScale.toX(b.x0);
        const x1 = xScale.toX(b.x1);
        const y = yScale.toY(b.count);
        const barW = Math.max(x1 - x0 - 1, 1);
        const inHighlight = highlightRange && b.x1 >= highlightRange[0] && b.x0 <= highlightRange[1];
        return (
          <rect key={i} x={x0 + 0.5} y={y} width={barW} height={margin.top + plotH - y}
            fill={inHighlight ? COLORS.burgundy : COLORS.blue} fillOpacity={0.7}
            stroke={COLORS.paper} strokeWidth={0.5}>
            <title>{`[${b.x0.toFixed(2)}, ${b.x1.toFixed(2)}): ${b.count}`}</title>
          </rect>
        );
      })}

      {/* X axis */}
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />

      {/* X ticks */}
      {binData.filter((_, i) => i % 2 === 0).map((b, i) => (
        <text key={i} x={xScale.toX(b.x0)} y={margin.top + plotH + 14} textAnchor="middle" fontSize={9} fill={COLORS.secondary} className="font-mono">
          {fmtTick(b.x0)}
        </text>
      ))}

      <text x={margin.left + plotW / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={COLORS.ink}>{label}{unit ? ` (${unit})` : ''}</text>
      <text x={14} y={margin.top + plotH / 2} textAnchor="middle" fontSize={11} fill={COLORS.ink}
        transform={`rotate(-90 14 ${margin.top + plotH / 2})`}>Count</text>
    </svg>
  );
}

// ── Box Plot ──────────────────────────────────────────────────────────────

interface BoxPlotProps {
  groups: Array<{ label: string; values: number[] }>;
  label: string;
  unit?: string;
  title?: string;
  width?: number;
  height?: number;
}

function quartiles(sorted: number[]): { q1: number; median: number; q3: number; min: number; max: number } {
  if (sorted.length === 0) return { q1: NaN, median: NaN, q3: NaN, min: NaN, max: NaN };
  const n = sorted.length;
  const q = (p: number) => {
    const pos = (n - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
  };
  return { q1: q(0.25), median: q(0.5), q3: q(0.75), min: sorted[0], max: sorted[n - 1] };
}

export function BoxPlot({ groups, label, unit, title, width = 480, height = 280 }: BoxPlotProps) {
  const margin = { top: 28, right: 20, bottom: 55, left: 55 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const stats = useMemo(() => groups.map(g => {
    const sorted = [...g.values].sort((a, b) => a - b);
    const qs = quartiles(sorted);
    const iqr = qs.q3 - qs.q1;
    const fenceLow = qs.q1 - 1.5 * iqr;
    const fenceHigh = qs.q3 + 1.5 * iqr;
    const outliers = sorted.filter(v => v < fenceLow || v > fenceHigh);
    const whiskerLow = sorted.find(v => v >= fenceLow) ?? qs.min;
    const whiskerHigh = [...sorted].reverse().find(v => v <= fenceHigh) ?? qs.max;
    return { ...qs, iqr, outliers, whiskerLow, whiskerHigh };
  }), [groups]);

  const allValues = groups.flatMap(g => g.values);
  const yDomain = useMemo(() => niceDomain(allValues, 0.1), [allValues]);
  const yScale = linearScale(yDomain, [margin.top + plotH, margin.top]);

  const groupW = plotW / groups.length;
  const boxW = Math.min(groupW * 0.5, 50);

  const fmtTick = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toExponential(1);
    return v.toFixed(Math.abs(v) < 10 ? 2 : 1);
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => yDomain[0] + f * (yDomain[1] - yDomain[0]));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={`Box plot of ${label} by group${title ? ': ' + title : ''}`}>
      {title && <text x={width / 2} y={16} textAnchor="middle" className="font-serif" fontSize={13} fill={COLORS.ink}>{title}</text>}

      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={margin.left} y1={yScale.toY(t)} x2={margin.left + plotW} y2={yScale.toY(t)} stroke={COLORS.divider} strokeWidth={0.5} />
          <text x={margin.left - 6} y={yScale.toY(t) + 3} textAnchor="end" fontSize={9} fill={COLORS.secondary} className="font-mono">{fmtTick(t)}</text>
        </g>
      ))}

      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />

      {stats.map((s, i) => {
        const cx = margin.left + groupW * (i + 0.5);
        return (
          <g key={i}>
            {/* Whiskers */}
            <line x1={cx} y1={yScale.toY(s.whiskerLow)} x2={cx} y2={yScale.toY(s.q1)} stroke={COLORS.secondary} strokeWidth={1} />
            <line x1={cx} y1={yScale.toY(s.q3)} x2={cx} y2={yScale.toY(s.whiskerHigh)} stroke={COLORS.secondary} strokeWidth={1} />
            <line x1={cx - 8} y1={yScale.toY(s.whiskerLow)} x2={cx + 8} y2={yScale.toY(s.whiskerLow)} stroke={COLORS.secondary} strokeWidth={1} />
            <line x1={cx - 8} y1={yScale.toY(s.whiskerHigh)} x2={cx + 8} y2={yScale.toY(s.whiskerHigh)} stroke={COLORS.secondary} strokeWidth={1} />

            {/* Box */}
            <rect x={cx - boxW / 2} y={yScale.toY(s.q3)} width={boxW} height={yScale.toY(s.q1) - yScale.toY(s.q3)}
              fill={COLORS.archive} stroke={COLORS.ink} strokeWidth={1} />

            {/* Median */}
            <line x1={cx - boxW / 2} y1={yScale.toY(s.median)} x2={cx + boxW / 2} y2={yScale.toY(s.median)} stroke={COLORS.burgundy} strokeWidth={2} />

            {/* Outliers */}
            {s.outliers.map((o, j) => (
              <circle key={j} cx={cx} cy={yScale.toY(o)} r={2.5} fill="none" stroke={COLORS.burgundy} strokeWidth={1}>
                <title>Outlier: {o.toFixed(2)}</title>
              </circle>
            ))}

            {/* Group label */}
            <text x={cx} y={margin.top + plotH + 16} textAnchor="middle" fontSize={10} fill={COLORS.ink}>{groups[i].label}</text>
          </g>
        );
      })}

      <text x={14} y={margin.top + plotH / 2} textAnchor="middle" fontSize={11} fill={COLORS.ink}
        transform={`rotate(-90 14 ${margin.top + plotH / 2})`}>{label}{unit ? ` (${unit})` : ''}</text>
    </svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  label: string;
  unit?: string;
  title?: string;
  width?: number;
  height?: number;
  horizontal?: boolean;
}

export function BarChart({ data, label, unit, title, width = 480, height = 280, horizontal }: BarChartProps) {
  const margin = { top: 28, right: 20, bottom: 55, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const yScale = linearScale([0, maxVal * 1.1], [margin.top + plotH, margin.top]);
  const barW = plotW / data.length * 0.7;
  const gap = plotW / data.length * 0.3;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={`Bar chart of ${label}${title ? ': ' + title : ''}`}>
      {title && <text x={width / 2} y={16} textAnchor="middle" className="font-serif" fontSize={13} fill={COLORS.ink}>{title}</text>}

      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const v = maxVal * 1.1 * f;
        return (
          <g key={i}>
            <line x1={margin.left} y1={yScale.toY(v)} x2={margin.left + plotW} y2={yScale.toY(v)} stroke={COLORS.divider} strokeWidth={0.5} />
            <text x={margin.left - 6} y={yScale.toY(v) + 3} textAnchor="end" fontSize={9} fill={COLORS.secondary} className="font-mono">{v.toFixed(1)}</text>
          </g>
        );
      })}

      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />

      {data.map((d, i) => {
        const x = margin.left + i * (barW + gap) + gap / 2;
        const y = yScale.toY(d.value);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={margin.top + plotH - y} fill={COLORS.blue} fillOpacity={0.75} stroke={COLORS.paper} strokeWidth={0.5}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            <text x={x + barW / 2} y={margin.top + plotH + 14} textAnchor="middle" fontSize={9} fill={COLORS.ink}
              transform={data.length > 6 ? `rotate(-30 ${x + barW / 2} ${margin.top + plotH + 14})` : undefined}>
              {d.label.length > 12 ? d.label.slice(0, 10) + '…' : d.label}
            </text>
          </g>
        );
      })}

      <text x={margin.left + plotW / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={COLORS.ink}>{label}{unit ? ` (${unit})` : ''}</text>
    </svg>
  );
}

// ── Residual Plot ─────────────────────────────────────────────────────────

interface ResidualPlotProps {
  residuals: Array<[number, number]>; // [x, residual]
  xLabel: string;
  title?: string;
  width?: number;
  height?: number;
}

export function ResidualPlot({ residuals, xLabel, title, width = 480, height = 280 }: ResidualPlotProps) {
  const margin = { top: 28, right: 20, bottom: 45, left: 55 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const xDomain = useMemo(() => niceDomain(residuals.map(r => r[0])), [residuals]);
  const yDomain = useMemo(() => {
    const vals = residuals.map(r => r[1]);
    if (vals.length === 0) return [-1, 1] as [number, number];
    const max = Math.max(Math.abs(Math.min(...vals)), Math.abs(Math.max(...vals)));
    return [-max * 1.1, max * 1.1] as [number, number];
  }, [residuals]);

  const xScale = linearScale(xDomain, [margin.left, margin.left + plotW]);
  const yScale = linearScale(yDomain, [margin.top + plotH, margin.top]);
  const zeroY = yScale.toY(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={`Residual plot: residuals vs ${xLabel}${title ? ': ' + title : ''}`}>
      {title && <text x={width / 2} y={16} textAnchor="middle" className="font-serif" fontSize={13} fill={COLORS.ink}>{title}</text>}

      {/* Zero line */}
      <line x1={margin.left} y1={zeroY} x2={margin.left + plotW} y2={zeroY} stroke={COLORS.burgundy} strokeWidth={1} strokeDasharray="3 3" />

      {/* Grid */}
      {[0, 0.5, 1].map((f, i) => {
        const v = yDomain[0] + f * (yDomain[1] - yDomain[0]);
        return (
          <g key={i}>
            <line x1={margin.left} y1={yScale.toY(v)} x2={margin.left + plotW} y2={yScale.toY(v)} stroke={COLORS.divider} strokeWidth={0.5} />
            <text x={margin.left - 6} y={yScale.toY(v) + 3} textAnchor="end" fontSize={9} fill={COLORS.secondary} className="font-mono">{v.toFixed(2)}</text>
          </g>
        );
      })}

      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />

      {residuals.map(([x, r], i) => (
        <circle key={i} cx={xScale.toX(x)} cy={yScale.toY(r)} r={3} fill={COLORS.blue} fillOpacity={0.7} stroke={COLORS.paper} strokeWidth={0.5}>
          <title>{`${xLabel}=${x.toFixed(2)}, residual=${r.toFixed(3)}`}</title>
        </circle>
      ))}

      <text x={margin.left + plotW / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={COLORS.ink}>{xLabel}</text>
      <text x={14} y={margin.top + plotH / 2} textAnchor="middle" fontSize={11} fill={COLORS.ink}
        transform={`rotate(-90 14 ${margin.top + plotH / 2})`}>Residuals</text>
    </svg>
  );
}

// ── Bootstrap Distribution ────────────────────────────────────────────────

interface BootstrapChartProps {
  estimates: number[];
  ciLower: number;
  ciUpper: number;
  statName: string;
  observedValue?: number;
  width?: number;
  height?: number;
}

export function BootstrapDistribution({ estimates, ciLower, ciUpper, statName, observedValue, width = 480, height = 280 }: BootstrapChartProps) {
  const margin = { top: 28, right: 20, bottom: 45, left: 50 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const bins = 30;
  const { binData, maxCount } = useMemo(() => {
    if (estimates.length === 0) return { binData: [], maxCount: 1 };
    const min = Math.min(...estimates);
    const max = Math.max(...estimates);
    const span = max - min || 1;
    const binWidth = span / bins;
    const counts = new Array(bins).fill(0);
    for (const v of estimates) {
      let idx = Math.floor((v - min) / binWidth);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    }
    return {
      binData: counts.map((c, i) => ({ count: c, x0: min + i * binWidth, x1: min + (i + 1) * binWidth })),
      maxCount: Math.max(...counts, 1),
    };
  }, [estimates, bins]);

  const xDomain = binData.length > 0 ? [binData[0].x0, binData[binData.length - 1].x1] : [0, 1];
  const xScale = linearScale(xDomain, [margin.left, margin.left + plotW]);
  const yScale = linearScale([0, maxCount], [margin.top + plotH, margin.top]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
      aria-label={`Bootstrap distribution of ${statName}`}>
      <text x={width / 2} y={16} textAnchor="middle" className="font-serif" fontSize={13} fill={COLORS.ink}>Bootstrap distribution: {statName}</text>

      {[0, 0.5, 1].map((f, i) => {
        const v = maxCount * f;
        return (
          <g key={i}>
            <line x1={margin.left} y1={yScale.toY(v)} x2={margin.left + plotW} y2={yScale.toY(v)} stroke={COLORS.divider} strokeWidth={0.5} />
            <text x={margin.left - 6} y={yScale.toY(v) + 3} textAnchor="end" fontSize={9} fill={COLORS.secondary} className="font-mono">{Math.round(v)}</text>
          </g>
        );
      })}

      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />

      {binData.map((b, i) => {
        const x0 = xScale.toX(b.x0);
        const x1 = xScale.toX(b.x1);
        const y = yScale.toY(b.count);
        const inCI = b.x1 >= ciLower && b.x0 <= ciUpper;
        return (
          <rect key={i} x={x0 + 0.5} y={y} width={Math.max(x1 - x0 - 1, 1)} height={margin.top + plotH - y}
            fill={inCI ? COLORS.evidenceGreen : COLORS.divider} fillOpacity={0.8}>
            <title>{`[${b.x0.toFixed(3)}, ${b.x1.toFixed(3)}): ${b.count}`}</title>
          </rect>
        );
      })}

      {/* CI lines */}
      <line x1={xScale.toX(ciLower)} y1={margin.top} x2={xScale.toX(ciLower)} y2={margin.top + plotH} stroke={COLORS.burgundy} strokeWidth={1.5} strokeDasharray="4 2" />
      <line x1={xScale.toX(ciUpper)} y1={margin.top} x2={xScale.toX(ciUpper)} y2={margin.top + plotH} stroke={COLORS.burgundy} strokeWidth={1.5} strokeDasharray="4 2" />
      <text x={xScale.toX(ciLower)} y={margin.top - 4} textAnchor="middle" fontSize={9} fill={COLORS.burgundy} className="font-mono">{ciLower.toFixed(3)}</text>
      <text x={xScale.toX(ciUpper)} y={margin.top - 4} textAnchor="middle" fontSize={9} fill={COLORS.burgundy} className="font-mono">{ciUpper.toFixed(3)}</text>

      {/* Observed value line */}
      {observedValue !== undefined && isFinite(observedValue) && (
        <line x1={xScale.toX(observedValue)} y1={margin.top} x2={xScale.toX(observedValue)} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1.5} />
      )}

      <text x={margin.left + plotW / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={COLORS.ink}>{statName} estimate</text>
    </svg>
  );
}

// ── Interactive Scatter (for learning centre — draggable point) ────────────

interface InteractiveScatterProps {
  points: Array<[number, number]>;
  draggableIndex: number;
  onChange: (points: Array<[number, number]>) => void;
  xLabel: string;
  yLabel: string;
  width?: number;
  height?: number;
}

export function InteractiveScatter({ points, draggableIndex, onChange, xLabel, yLabel, width = 400, height = 300 }: InteractiveScatterProps) {
  const [dragging, setDragging] = useState(false);
  const svgRef = useState<SVGSVGElement | null>(null);
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const xDomain = useMemo(() => niceDomain(points.map(p => p[0]), 0.15), [points]);
  const yDomain = useMemo(() => niceDomain(points.map(p => p[1]), 0.15), [points]);
  const xScale = linearScale(xDomain, [margin.left, margin.left + plotW]);
  const yScale = linearScale(yDomain, [margin.top + plotH, margin.top]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const newX = xScale.fromX(local.x);
    const newY = yScale.fromY(local.y);
    const newPoints = [...points];
    newPoints[draggableIndex] = [newX, newY];
    onChange(newPoints);
  }, [dragging, points, draggableIndex, xScale, yScale]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto touch-none"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      role="img"
      aria-label={`Interactive scatterplot. Drag the highlighted point to see how the correlation changes.`}
    >
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const xv = xDomain[0] + f * (xDomain[1] - xDomain[0]);
        const yv = yDomain[0] + f * (yDomain[1] - yDomain[0]);
        return (
          <g key={i}>
            <line x1={xScale.toX(xv)} y1={margin.top} x2={xScale.toX(xv)} y2={margin.top + plotH} stroke={COLORS.divider} strokeWidth={0.5} />
            <line x1={margin.left} y1={yScale.toY(yv)} x2={margin.left + plotW} y2={yScale.toY(yv)} stroke={COLORS.divider} strokeWidth={0.5} />
          </g>
        );
      })}

      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={COLORS.ink} strokeWidth={1} />

      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={xScale.toX(x)}
          cy={yScale.toY(y)}
          r={i === draggableIndex ? 7 : 4}
          fill={i === draggableIndex ? COLORS.burgundy : COLORS.ink}
          fillOpacity={0.8}
          stroke={COLORS.paper}
          strokeWidth={1}
          className={i === draggableIndex ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
          onMouseDown={() => i === draggableIndex && setDragging(true)}
        />
      ))}

      <text x={margin.left + plotW / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={COLORS.ink}>{xLabel}</text>
      <text x={14} y={margin.top + plotH / 2} textAnchor="middle" fontSize={11} fill={COLORS.ink}
        transform={`rotate(-90 14 ${margin.top + plotH / 2})`}>{yLabel}</text>
    </svg>
  );
}
