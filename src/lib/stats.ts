// Statistical engine for Hypothesis Zero
// All calculations use sample formulas (n-1 denominator) for variance/SD unless noted.

import type { DatasetRecord } from './types';

// ── Basic numeric extraction ──────────────────────────────────────────────

export function extractNumeric(
  rows: Record<string, string | number | null>[],
  col: string
): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (!isNaN(n) && isFinite(n)) out.push(n);
  }
  return out;
}

export function extractPaired(
  rows: Record<string, string | number | null>[],
  xCol: string,
  yCol: string
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (const r of rows) {
    const xv = r[xCol];
    const yv = r[yCol];
    if (xv === null || xv === undefined || xv === '') continue;
    if (yv === null || yv === undefined || yv === '') continue;
    const x = typeof xv === 'number' ? xv : parseFloat(String(xv));
    const y = typeof yv === 'number' ? yv : parseFloat(String(yv));
    if (!isNaN(x) && isFinite(x) && !isNaN(y) && isFinite(y)) pairs.push([x, y]);
  }
  return pairs;
}

// ── Descriptive statistics ────────────────────────────────────────────────

export interface NumericStats {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  missing: number;
  valid: number;
}

export function numericStats(
  rows: Record<string, string | number | null>[],
  col: string
): NumericStats {
  const values = extractNumeric(rows, col);
  let missing = 0;
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined || v === '') {
      missing++;
    } else {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (isNaN(n) || !isFinite(n)) missing++;
    }
  }
  const count = values.length;
  if (count === 0) {
    return {
      count: 0, mean: NaN, median: NaN, min: NaN, max: NaN,
      range: NaN, variance: NaN, stdDev: NaN, q1: NaN, q3: NaN,
      iqr: NaN, missing, valid: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const median = quantile(sorted, 0.5);
  const min = sorted[0];
  const max = sorted[count - 1];
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  let variance = 0;
  if (count > 1) {
    const sqDiff = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
    variance = sqDiff / (count - 1); // sample variance
  }
  const stdDev = Math.sqrt(variance);

  return {
    count, mean, median, min, max, range: max - min,
    variance, stdDev, q1, q3, iqr: q3 - q1, missing, valid: count,
  };
}

export function quantile(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  // Linear interpolation (type 7, R default)
  const pos = (n - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

export interface CategoricalStats {
  counts: Array<{ category: string; count: number; proportion: number }>;
  mode: string | null;
  missing: number;
  valid: number;
}

export function categoricalStats(
  rows: Record<string, string | number | null>[],
  col: string
): CategoricalStats {
  const map = new Map<string, number>();
  let missing = 0;
  let valid = 0;
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined || v === '') {
      missing++;
      continue;
    }
    const key = String(v);
    map.set(key, (map.get(key) || 0) + 1);
    valid++;
  }
  const counts = Array.from(map.entries())
    .map(([category, count]) => ({ category, count, proportion: valid > 0 ? count / valid : 0 }))
    .sort((a, b) => b.count - a.count);
  return {
    counts,
    mode: counts.length > 0 ? counts[0].category : null,
    missing,
    valid,
  };
}

// ── Correlation ───────────────────────────────────────────────────────────

export interface CorrelationResult {
  coefficient: number;
  n: number;
  warnings: string[];
  tStat: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
}

export function pearsonCorrelation(
  rows: Record<string, string | number | null>[],
  xCol: string,
  yCol: string
): CorrelationResult {
  const pairs = extractPaired(rows, xCol, yCol);
  const n = pairs.length;
  const warnings: string[] = [];
  if (n < 3) {
    warnings.push('At least 3 paired observations are required for correlation.');
    return { coefficient: NaN, n, warnings, tStat: NaN, pValue: NaN, ciLower: NaN, ciUpper: NaN };
  }
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) {
    warnings.push('One or both variables have zero variance — correlation is undefined.');
    return { coefficient: NaN, n, warnings, tStat: NaN, pValue: NaN, ciLower: NaN, ciUpper: NaN };
  }
  const r = sxy / Math.sqrt(sxx * syy);
  // Clamp to [-1, 1] to guard floating point
  const rClamped = Math.max(-1, Math.min(1, r));

  // t-statistic and p-value (two-sided, t dist with n-2 df)
  const df = n - 2;
  const tStat = (rClamped * Math.sqrt(df)) / Math.sqrt(1 - rClamped * rClamped);
  const pValue = 2 * tCDFTail(Math.abs(tStat), df);

  // Fisher z confidence interval (95%)
  const { ciLower, ciUpper } = fisherZCI(rClamped, n, 0.95);

  return { coefficient: rClamped, n, warnings, tStat, pValue, ciLower, ciUpper };
}

export function spearmanCorrelation(
  rows: Record<string, string | number | null>[],
  xCol: string,
  yCol: string
): CorrelationResult {
  const pairs = extractPaired(rows, xCol, yCol);
  const n = pairs.length;
  const warnings: string[] = [];
  if (n < 3) {
    warnings.push('At least 3 paired observations are required for correlation.');
    return { coefficient: NaN, n, warnings, tStat: NaN, pValue: NaN, ciLower: NaN, ciUpper: NaN };
  }
  const xRanks = rank(pairs.map(p => p[0]));
  const yRanks = rank(pairs.map(p => p[1]));
  // Pearson on ranks
  const mx = mean(xRanks);
  const my = mean(yRanks);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xRanks[i] - mx;
    const dy = yRanks[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) {
    warnings.push('One or both variables have zero variance after ranking — Spearman correlation is undefined.');
    return { coefficient: NaN, n, warnings, tStat: NaN, pValue: NaN, ciLower: NaN, ciUpper: NaN };
  }
  const rho = sxy / Math.sqrt(sxx * syy);
  const rhoC = Math.max(-1, Math.min(1, rho));
  const df = n - 2;
  const tStat = (rhoC * Math.sqrt(df)) / Math.sqrt(1 - rhoC * rhoC);
  const pValue = 2 * tCDFTail(Math.abs(tStat), df);
  const { ciLower, ciUpper } = fisherZCI(rhoC, n, 0.95);
  return { coefficient: rhoC, n, warnings, tStat, pValue, ciLower, ciUpper };
}

function rank(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].v === indexed[i].v) j++;
    const avgRank = (i + j) / 2 + 1; // 1-based
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

function fisherZCI(r: number, n: number, confLevel: number): { ciLower: number; ciUpper: number } {
  if (n <= 3 || r === 1 || r === -1) {
    return { ciLower: NaN, ciUpper: NaN };
  }
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const seZ = 1 / Math.sqrt(n - 3);
  const alpha = 1 - confLevel;
  const zCrit = normalInverseCDF(1 - alpha / 2);
  const zLo = z - zCrit * seZ;
  const zHi = z + zCrit * seZ;
  return {
    ciLower: (Math.exp(2 * zLo) - 1) / (Math.exp(2 * zLo) + 1),
    ciUpper: (Math.exp(2 * zHi) - 1) / (Math.exp(2 * zHi) + 1),
  };
}

// ── Linear regression ─────────────────────────────────────────────────────

export interface RegressionResult {
  intercept: number;
  slope: number;
  n: number;
  rSquared: number;
  predictions: Array<[number, number, number]>; // [x, yActual, yPredicted]
  residuals: number[];
  warnings: string[];
  seSlope: number;
  tStatSlope: number;
  pValueSlope: number;
  ciSlopeLower: number;
  ciSlopeUpper: number;
  residualSE: number;
}

export function linearRegression(
  rows: Record<string, string | number | null>[],
  xCol: string,
  yCol: string
): RegressionResult {
  const pairs = extractPaired(rows, xCol, yCol);
  const n = pairs.length;
  const warnings: string[] = [];
  if (n < 3) {
    warnings.push('At least 3 observations are required for linear regression.');
    return emptyRegression(n);
  }
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) {
    warnings.push('The predictor variable has zero variance — regression slope is undefined.');
    return emptyRegression(n);
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const predictions: Array<[number, number, number]> = [];
  const residuals: number[] = [];
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i];
    const res = ys[i] - pred;
    predictions.push([xs[i], ys[i], pred]);
    residuals.push(res);
    ssRes += res * res;
  }
  const rSquared = syy > 0 ? 1 - ssRes / syy : (syy === 0 && ssRes === 0 ? 1 : NaN);
  const df = n - 2;
  const residualSE = df > 0 ? Math.sqrt(ssRes / df) : NaN;

  let seSlope = NaN, tStatSlope = NaN, pValueSlope = NaN, ciSlopeLower = NaN, ciSlopeUpper = NaN;
  if (df > 0 && sxx > 0 && isFinite(residualSE)) {
    seSlope = residualSE / Math.sqrt(sxx);
    if (seSlope > 0) {
      tStatSlope = slope / seSlope;
      pValueSlope = 2 * tCDFTail(Math.abs(tStatSlope), df);
      const tCrit = tInverseCDF(0.975, df);
      ciSlopeLower = slope - tCrit * seSlope;
      ciSlopeUpper = slope + tCrit * seSlope;
    }
  }

  return {
    intercept, slope, n, rSquared, predictions, residuals, warnings,
    seSlope, tStatSlope, pValueSlope, ciSlopeLower, ciSlopeUpper, residualSE,
  };
}

function emptyRegression(n: number): RegressionResult {
  return {
    intercept: NaN, slope: NaN, n, rSquared: NaN, predictions: [], residuals: [],
    warnings: [], seSlope: NaN, tStatSlope: NaN, pValueSlope: NaN,
    ciSlopeLower: NaN, ciSlopeUpper: NaN, residualSE: NaN,
  };
}

// ── Group comparison (Welch's t-test) ─────────────────────────────────────

export interface GroupComparisonResult {
  group1Name: string;
  group2Name: string;
  n1: number;
  n2: number;
  mean1: number;
  mean2: number;
  median1: number;
  median2: number;
  sd1: number;
  sd2: number;
  meanDifference: number;
  seDifference: number;
  tStat: number;
  df: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
  warnings: string[];
}

export function groupComparison(
  rows: Record<string, string | number | null>[],
  valueCol: string,
  groupCol: string,
  group1Value?: string,
  group2Value?: string
): GroupComparisonResult {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const g = r[groupCol];
    if (g === null || g === undefined || g === '') continue;
    const v = r[valueCol];
    if (v === null || v === undefined || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (isNaN(n) || !isFinite(n)) continue;
    const key = String(g);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }
  const groupKeys = Array.from(groups.keys()).sort();
  const warnings: string[] = [];
  if (groupKeys.length < 2) {
    warnings.push('At least two groups are required for a group comparison.');
    return emptyGroupComparison();
  }
  const g1Key = group1Value || groupKeys[0];
  const g2Key = group2Value || groupKeys[1];
  const g1 = groups.get(g1Key) || [];
  const g2 = groups.get(g2Key) || [];
  if (g1.length === 0 || g2.length === 0) {
    warnings.push(`One or both selected groups have no valid observations.`);
    return emptyGroupComparison(g1Key, g2Key);
  }
  const n1 = g1.length, n2 = g2.length;
  const mean1 = mean(g1), mean2 = mean(g2);
  const sd1 = sampleSD(g1), sd2 = sampleSD(g2);
  const meanDifference = mean1 - mean2;
  // Welch's
  const v1 = (sd1 * sd1) / n1;
  const v2 = (sd2 * sd2) / n2;
  const seDifference = Math.sqrt(v1 + v2);
  if (seDifference === 0) {
    warnings.push('Standard error of the difference is zero — test statistic is undefined.');
    return { ...emptyGroupComparison(g1Key, g2Key), n1, n2, mean1, mean2, meanDifference, warnings };
  }
  const tStat = meanDifference / seDifference;
  // Welch–Satterthwaite df
  const dfNum = (v1 + v2) ** 2;
  const dfDen = (v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1);
  const df = dfDen > 0 ? dfNum / dfDen : NaN;
  const pValue = isNaN(df) ? NaN : 2 * tCDFTail(Math.abs(tStat), df);
  const tCrit = isNaN(df) ? NaN : tInverseCDF(0.975, df);
  const ciLower = meanDifference - tCrit * seDifference;
  const ciUpper = meanDifference + tCrit * seDifference;

  if (n1 < 5 || n2 < 5) warnings.push('Small group sizes — results may be unreliable.');
  if (n1 < 2 || n2 < 2) warnings.push('At least one group has fewer than 2 observations — variance cannot be estimated.');

  return {
    group1Name: g1Key, group2Name: g2Key, n1, n2, mean1, mean2,
    median1: median(g1), median2: median(g2), sd1, sd2, meanDifference,
    seDifference, tStat, df, pValue, ciLower, ciUpper, warnings,
  };
}

function emptyGroupComparison(g1 = '', g2 = ''): GroupComparisonResult {
  return {
    group1Name: g1, group2Name: g2, n1: 0, n2: 0, mean1: NaN, mean2: NaN,
    median1: NaN, median2: NaN, sd1: NaN, sd2: NaN, meanDifference: NaN,
    seDifference: NaN, tStat: NaN, df: NaN, pValue: NaN, ciLower: NaN,
    ciUpper: NaN, warnings: [],
  };
}

// ── Contingency table + Chi-square ────────────────────────────────────────

export interface ContingencyResult {
  rowLabels: string[];
  colLabels: string[];
  counts: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  rowPercentages: number[][];
  colPercentages: number[][];
  expected: number[][];
  chiSquare: number;
  df: number;
  pValue: number;
  warnings: string[];
}

export function contingencyTable(
  rows: Record<string, string | number | null>[],
  rowVar: string,
  colVar: string
): ContingencyResult {
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const cellMap = new Map<string, number>();
  let grandTotal = 0;
  for (const r of rows) {
    const rv = r[rowVar];
    const cv = r[colVar];
    if (rv === null || rv === undefined || rv === '') continue;
    if (cv === null || cv === undefined || cv === '') continue;
    const rk = String(rv);
    const ck = String(cv);
    rowSet.add(rk);
    colSet.add(ck);
    const key = rk + '\0' + ck;
    cellMap.set(key, (cellMap.get(key) || 0) + 1);
    grandTotal++;
  }
  const rowLabels = Array.from(rowSet).sort();
  const colLabels = Array.from(colSet).sort();
  const nr = rowLabels.length, nc = colLabels.length;
  const counts: number[][] = Array.from({ length: nr }, () => new Array(nc).fill(0));
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < nc; j++) {
      counts[i][j] = cellMap.get(rowLabels[i] + '\0' + colLabels[j]) || 0;
    }
  }
  const rowTotals = counts.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = colLabels.map((_, j) => counts.reduce((sum, row) => sum + row[j], 0));
  const rowPercentages = counts.map((row, i) =>
    row.map(c => rowTotals[i] > 0 ? (c / rowTotals[i]) * 100 : 0));
  const colPercentages = counts.map((row, i) =>
    row.map((c, j) => colTotals[j] > 0 ? (c / colTotals[j]) * 100 : 0));
  const expected: number[][] = Array.from({ length: nr }, () => new Array(nc).fill(0));
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < nc; j++) {
      expected[i][j] = grandTotal > 0 ? (rowTotals[i] * colTotals[j]) / grandTotal : 0;
    }
  }
  const warnings: string[] = [];
  let chiSquare = 0;
  let validChi = true;
  let lowExpectedCount = 0;
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < nc; j++) {
      const e = expected[i][j];
      if (e < 5) lowExpectedCount++;
      if (e === 0) {
        validChi = false;
        continue;
      }
      chiSquare += ((counts[i][j] - e) ** 2) / e;
    }
  }
  const df = (nr - 1) * (nc - 1);
  let pValue = NaN;
  if (validChi && df > 0) {
    pValue = chiSquareCDF(chiSquare, df);
  } else if (!validChi) {
    warnings.push('At least one expected cell count is zero — chi-square statistic is not valid.');
  }
  if (lowExpectedCount > 0 && validChi) {
    const ratio = lowExpectedCount / (nr * nc);
    if (ratio > 0.2) {
      warnings.push(`${lowExpectedCount} of ${nr * nc} expected cell counts are below 5 (${(ratio * 100).toFixed(0)}%). The chi-square approximation may be unreliable. Consider Fisher's exact test or combining categories.`);
    }
  }
  if (grandTotal < 20) {
    warnings.push('Total sample size is below 20 — chi-square results should be interpreted with caution.');
  }
  if (nr < 2 || nc < 2) {
    warnings.push('A 2×2 or larger table is required for a meaningful chi-square test.');
  }

  return {
    rowLabels, colLabels, counts, rowTotals, colTotals, grandTotal,
    rowPercentages, colPercentages, expected, chiSquare, df, pValue, warnings,
  };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

export interface BootstrapResult {
  estimates: number[];
  mean: number;
  median: number;
  stdError: number;
  ciLower: number;
  ciUpper: number;
  n: number;
  resamples: number;
  warnings: string[];
}

// Mulberry32 PRNG for reproducibility
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bootstrap(
  rows: Record<string, string | number | null>[],
  config: {
    stat: 'mean' | 'median' | 'correlation' | 'slope';
    statVar?: string;
    primaryVar?: string;
    secondaryVar?: string;
    resamples: number;
    seed: number;
  }
): BootstrapResult {
  const warnings: string[] = [];
  const rng = mulberry32(config.seed);
  const resamples = Math.min(Math.max(10, config.resamples), 10000);

  let data: number[] | Array<[number, number]>;
  let computeStat: () => number;

  if (config.stat === 'correlation' || config.stat === 'slope') {
    const pairs = extractPaired(rows, config.primaryVar!, config.secondaryVar!);
    data = pairs;
    if (pairs.length < 3) {
      warnings.push('At least 3 paired observations are required.');
      return emptyBootstrap(resamples, warnings);
    }
    computeStat = () => {
      // Resample with replacement
      const sample: Array<[number, number]> = [];
      for (let i = 0; i < pairs.length; i++) {
        const idx = Math.floor(rng() * pairs.length);
        sample.push(pairs[idx]);
      }
      if (config.stat === 'correlation') {
        const r = pearsonCorrelation(sample.map(p => ({ x: p[0], y: p[1] })), 'x', 'y');
        return r.coefficient;
      } else {
        const reg = linearRegression(sample.map(p => ({ x: p[0], y: p[1] })), 'x', 'y');
        return reg.slope;
      }
    };
  } else {
    const values = extractNumeric(rows, config.statVar!);
    data = values;
    if (values.length < 2) {
      warnings.push('At least 2 valid observations are required.');
      return emptyBootstrap(resamples, warnings);
    }
    computeStat = () => {
      const sample: number[] = [];
      for (let i = 0; i < values.length; i++) {
        const idx = Math.floor(rng() * values.length);
        sample.push(values[idx]);
      }
      return config.stat === 'mean' ? mean(sample) : median(sample);
    };
  }

  const estimates: number[] = [];
  for (let i = 0; i < resamples; i++) {
    const val = computeStat();
    if (isFinite(val)) estimates.push(val);
  }
  if (estimates.length === 0) {
    warnings.push('No valid bootstrap estimates were produced.');
    return emptyBootstrap(resamples, warnings);
  }
  estimates.sort((a, b) => a - b);
  const n = Array.isArray(data) && Array.isArray(data[0]) ? (data as Array<[number, number]>).length : (data as number[]).length;
  const pct = (p: number) => {
    const idx = p * (estimates.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return estimates[lo];
    return estimates[lo] + (idx - lo) * (estimates[hi] - estimates[lo]);
  };
  return {
    estimates,
    mean: mean(estimates),
    median: median(estimates),
    stdError: sampleSD(estimates),
    ciLower: pct(0.025),
    ciUpper: pct(0.975),
    n,
    resamples: estimates.length,
    warnings,
  };
}

function emptyBootstrap(resamples: number, warnings: string[]): BootstrapResult {
  return { estimates: [], mean: NaN, median: NaN, stdError: NaN, ciLower: NaN, ciUpper: NaN, n: 0, resamples, warnings };
}

// ── Outlier detection ─────────────────────────────────────────────────────

export function detectOutliers(
  rows: Record<string, string | number | null>[],
  col: string,
  method: 'iqr' | 'zscore' = 'iqr'
): Array<{ index: number; value: number; reason: string }> {
  const values = extractNumeric(rows, col);
  if (values.length < 4) return [];
  const outliers: Array<{ index: number; value: number; reason: string }> = [];
  if (method === 'iqr') {
    const stats = numericStats(rows, col);
    const lower = stats.q1 - 1.5 * stats.iqr;
    const upper = stats.q3 + 1.5 * stats.iqr;
    rows.forEach((r, i) => {
      const v = r[col];
      if (v === null || v === undefined || v === '') return;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (isNaN(n) || !isFinite(n)) return;
      if (n < lower) outliers.push({ index: i, value: n, reason: `Below lower fence (${lower.toFixed(2)})` });
      else if (n > upper) outliers.push({ index: i, value: n, reason: `Above upper fence (${upper.toFixed(2)})` });
    });
  } else {
    const stats = numericStats(rows, col);
    const sd = stats.stdDev;
    if (sd === 0 || isNaN(sd)) return [];
    rows.forEach((r, i) => {
      const v = r[col];
      if (v === null || v === undefined || v === '') return;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (isNaN(n) || !isFinite(n)) return;
      const z = Math.abs(n - stats.mean) / sd;
      if (z > 3) outliers.push({ index: i, value: n, reason: `|z| = ${z.toFixed(2)} > 3` });
    });
  }
  return outliers;
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return quantile(s, 0.5);
}

export function sampleSD(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, v) => acc + (v - m) ** 2, 0) / (xs.length - 1));
}

export function populationSD(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, v) => acc + (v - m) ** 2, 0) / xs.length);
}

// ── Statistical distribution functions ────────────────────────────────────

// Normal CDF (Abramowitz & Stegun approximation)
export function normalCDF(x: number): number {
  const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937;
  const b4 = -1.821255978, b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;
  const ax = Math.abs(x);
  if (ax > 37) return x < 0 ? 0 : 1;
  const t = 1 / (1 + p * ax);
  const phi = c * Math.exp(-ax * ax / 2) * ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  return x < 0 ? phi : 1 - phi;
}

// Inverse normal CDF (Acklam's algorithm)
export function normalInverseCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// Log-gamma (Lanczos approximation)
function logGamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Incomplete gamma function (regularized lower) via series + continued fraction
function lowerIncompleteGamma(s: number, x: number): number {
  if (x <= 0) return 0;
  if (x < s + 1) {
    // Series expansion
    let term = 1 / s;
    let sum = term;
    for (let i = 1; i < 100; i++) {
      term *= x / (s + i);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  } else {
    // Continued fraction
    let b = x + 1 - s;
    let c = 1e30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 100; i++) {
      const an = -i * (i - s);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-12) break;
    }
    return 1 - h * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }
}

// Chi-square CDF
export function chiSquareCDF(x: number, df: number): number {
  if (df <= 0) return NaN;
  if (x <= 0) return 0;
  return lowerIncompleteGamma(df / 2, x / 2);
}

// Student's t CDF — uses the regularized incomplete beta function
function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logBeta(a, b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta);
  if (x < (a + 1) / (a + b + 2)) {
    // Continued fraction (Lentz's method)
    let cf = 1;
    let f = 1;
    let c = 0;
    let d = 1;
    for (let i = 0; i < 200; i++) {
      const m = Math.floor(i / 2);
      let numerator: number;
      if (i === 0) numerator = 1;
      else if (i % 2 === 0) numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
      else numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
      d = 1 + numerator / d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + numerator / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = d * c;
      f *= delta;
      if (Math.abs(delta - 1) < 1e-12) break;
    }
    cf = f;
    return front * cf / a;
  } else {
    return 1 - incompleteBeta(b, a, 1 - x);
  }
}

// Student's t CDF: P(T <= t) with df degrees of freedom
export function tCDF(t: number, df: number): number {
  if (df <= 0) return NaN;
  const x = df / (df + t * t);
  const ib = incompleteBeta(df / 2, 0.5, x);
  if (t > 0) return 1 - 0.5 * ib;
  return 0.5 * ib;
}

export function tCDFTail(t: number, df: number): number {
  // Upper tail: P(T > |t|) * 2 already handled by callers using 2 * tCDFTail
  if (df <= 0 || isNaN(t)) return NaN;
  const x = df / (df + t * t);
  return 0.5 * incompleteBeta(df / 2, 0.5, x);
}

// Inverse t CDF via bisection
export function tInverseCDF(p: number, df: number): number {
  if (df <= 0) return NaN;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  let lo = -100, hi = 100;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const cdf = tCDF(mid, df);
    if (cdf < p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-10) break;
  }
  return (lo + hi) / 2;
}

// ── Formatting helpers ────────────────────────────────────────────────────

export function fmt(x: number | null | undefined, digits = 4): string {
  if (x === null || x === undefined || isNaN(x) || !isFinite(x)) return '—';
  if (Math.abs(x) < 0.0001 && x !== 0) return x.toExponential(2);
  return x.toFixed(digits);
}

export function fmtP(p: number | null | undefined): string {
  if (p === null || p === undefined || isNaN(p) || !isFinite(p)) return '—';
  if (p < 0.0001) return '< 0.0001';
  return p.toFixed(4);
}

// ── Dataset helpers ───────────────────────────────────────────────────────

export function datasetProfile(ds: DatasetRecord) {
  const nRows = ds.rows.length;
  const nCols = ds.columns.length;
  const missingByCol: Record<string, number> = {};
  const duplicates = findDuplicates(ds.rows);
  for (const col of ds.columns) {
    let missing = 0;
    for (const r of ds.rows) {
      const v = r[col.name];
      if (v === null || v === undefined || v === '') missing++;
    }
    missingByCol[col.name] = missing;
  }
  return { nRows, nCols, missingByCol, duplicates: duplicates.length, columns: ds.columns };
}

function findDuplicates(rows: Record<string, string | number | null>[]): number[] {
  const seen = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const key = JSON.stringify(r);
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(i);
  });
  const dupes: number[] = [];
  for (const indices of seen.values()) {
    if (indices.length > 1) dupes.push(...indices.slice(1));
  }
  return dupes;
}

// Simple hash for dataset integrity
export function datasetHash(ds: DatasetRecord): string {
  const str = JSON.stringify({ rows: ds.rows, columns: ds.columns, version: ds.version });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return 'h' + Math.abs(hash).toString(36);
}
