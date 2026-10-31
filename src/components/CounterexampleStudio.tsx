// Counterexample Studio — challenge conclusions by modifying analysis copies

import { useState, useMemo, useEffect } from 'react';
import type { DatasetRecord, CounterexampleRecord, ModificationRecord } from '@/lib/types';
import { pearsonCorrelation, spearmanCorrelation, linearRegression, detectOutliers, fmt, fmtP, extractNumeric, extractPaired, numericStats } from '@/lib/stats';
import { ScatterPlot } from '@/components/charts';
import { SectionHeader, Panel, WarningBox, EmptyState, StatRow } from '@/components/ui';
import { genId, saveCounterexample, getAllCounterexamples, deleteCounterexample } from '@/lib/storage';
import { ShieldQuestion, Plus, Trash2, RotateCcw, ArrowRight } from 'lucide-react';

interface CounterexampleProps {
  datasets: DatasetRecord[];
  onCounterexamplesChanged: () => void;
}

export function CounterexampleStudio({ datasets, onCounterexamplesChanged }: CounterexampleProps) {
  const [datasetId, setDatasetId] = useState(datasets[0]?.id || '');
  const [mode, setMode] = useState<'setup' | 'outlier' | 'subgroup' | 'sensitivity' | 'hypothetical'>('setup');
  const [savedList, setSavedList] = useState<CounterexampleRecord[]>([]);

  const loadSaved = () => getAllCounterexamples().then(setSavedList);
  useEffect(() => { loadSaved(); }, []);

  const dataset = datasets.find(d => d.id === datasetId);
  const numericCols = dataset?.columns.filter(c => c.type === 'numeric') || [];
  const categoricalCols = dataset?.columns.filter(c => c.type === 'categorical') || [];

  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  useEffect(() => {
    if (numericCols.length >= 2) { setXCol(numericCols[0].name); setYCol(numericCols[1].name); }
  }, [datasetId]);

  if (!dataset || numericCols.length < 2) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <SectionHeader number="D" title="Counterexample Studio" subtitle="Challenge your conclusion by testing how changes to the evidence affect results." />
        <WarningBox warnings={['At least two numeric variables are required for counterexample analysis.']} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader number="D" title="Counterexample Studio" subtitle="Test whether a conclusion survives reasonable changes to the evidence. The original dataset is never modified — all changes apply to an analytical copy." />

      <div className="mb-6">
        <label className="field-label">Dataset</label>
        <select className="field-input max-w-md" value={datasetId} onChange={e => setDatasetId(e.target.value)}>
          {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 border-b border-divider mb-6 overflow-x-auto">
        {[
          { id: 'setup' as const, label: 'Baseline' },
          { id: 'outlier' as const, label: 'Outlier Investigation' },
          { id: 'subgroup' as const, label: 'Subgroup Analysis' },
          { id: 'sensitivity' as const, label: 'Sensitivity' },
          { id: 'hypothetical' as const, label: 'Hypothetical' },
        ].map(t => (
          <button key={t.id} onClick={() => setMode(t.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${mode === t.id ? 'text-ink' : 'text-ink-secondary hover:text-ink'}`}>
            {t.label}
            {mode === t.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-burgundy" />}
          </button>
        ))}
      </div>

      {/* Variable selectors */}
      <div className="grid grid-cols-2 gap-3 max-w-md mb-6">
        <div>
          <label className="field-label">Variable X</label>
          <select className="field-input" value={xCol} onChange={e => setXCol(e.target.value)}>
            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Variable Y</label>
          <select className="field-input" value={yCol} onChange={e => setYCol(e.target.value)}>
            {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {mode === 'setup' && <BaselineView dataset={dataset} xCol={xCol} yCol={yCol} />}
      {mode === 'outlier' && <OutlierView dataset={dataset} xCol={xCol} yCol={yCol} onSave={(r) => { saveCounterexample(r).then(() => { loadSaved(); onCounterexamplesChanged(); }); }} />}
      {mode === 'subgroup' && <SubgroupView dataset={dataset} xCol={xCol} yCol={yCol} categoricalCols={categoricalCols} />}
      {mode === 'sensitivity' && <SensitivityView dataset={dataset} xCol={xCol} yCol={yCol} />}
      {mode === 'hypothetical' && <HypotheticalView dataset={dataset} xCol={xCol} yCol={yCol} onSave={(r) => { saveCounterexample(r).then(() => { loadSaved(); onCounterexamplesChanged(); }); }} />}

      {/* Saved counterexamples */}
      {savedList.length > 0 && (
        <div className="mt-12">
          <div className="section-label mb-4">Saved Counterexamples</div>
          <div className="space-y-3">
            {savedList.map(ce => {
              const ds = datasets.find(d => d.id === ce.datasetId);
              return (
                <Panel key={ce.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-mono text-burgundy uppercase tracking-wider text-xs mb-1">{ce.modifications.map(m => m.type).join(', ')}</div>
                      <div className="text-sm text-ink">{ce.description}</div>
                      <div className="text-xs text-ink-secondary mt-1 font-mono">{ds?.name || 'Unknown dataset'}</div>
                      <div className="text-xs text-ink-secondary mt-2">{ce.stabilityNotes}</div>
                    </div>
                    <button onClick={() => deleteCounterexample(ce.id).then(() => { loadSaved(); onCounterexamplesChanged(); })}
                      className="text-ink-secondary hover:text-burgundy p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Baseline View ─────────────────────────────────────────────────────────
function BaselineView({ dataset, xCol, yCol }: { dataset: DatasetRecord; xCol: string; yCol: string }) {
  const corr = useMemo(() => pearsonCorrelation(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);
  const reg = useMemo(() => linearRegression(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);
  const pairs = useMemo(() => extractPaired(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Panel className="p-5">
        <div className="section-label mb-3">Baseline Analysis (Original Data)</div>
        <StatRow label="Pearson r" value={fmt(corr.coefficient)} emphasis />
        <StatRow label="Spearman ρ" value={fmt(spearmanCorrelation(dataset.rows, xCol, yCol).coefficient)} />
        <StatRow label="Regression slope" value={fmt(reg.slope)} />
        <StatRow label="R²" value={fmt(reg.rSquared)} />
        <StatRow label="n" value={String(corr.n)} />
        <div className="mt-4 text-xs text-ink-secondary border-t border-divider pt-3">
          This is the baseline result using the original, unmodified dataset. All counterexample analyses will compare against these values.
        </div>
      </Panel>
      <Panel className="p-4">
        <ScatterPlot points={pairs} xLabel={xCol} yLabel={yCol} title="Original data — baseline" />
      </Panel>
    </div>
  );
}

// ── Outlier View ──────────────────────────────────────────────────────────
function OutlierView({ dataset, xCol, yCol, onSave }: { dataset: DatasetRecord; xCol: string; yCol: string; onSave: (r: CounterexampleRecord) => void }) {
  const [excludeIndices, setExcludeIndices] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const outliers = useMemo(() => detectOutliers(dataset.rows, xCol), [dataset, xCol]);
  const yOutliers = useMemo(() => detectOutliers(dataset.rows, yCol), [dataset, yCol]);
  const allOutlierIndices = useMemo(() => {
    const set = new Set<number>();
    outliers.forEach(o => set.add(o.index));
    yOutliers.forEach(o => set.add(o.index));
    return Array.from(set).sort((a, b) => a - b);
  }, [outliers, yOutliers]);

  const modifiedRows = useMemo(() => dataset.rows.filter((_, i) => !excludeIndices.has(i)), [dataset, excludeIndices]);

  const originalCorr = useMemo(() => pearsonCorrelation(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);
  const modifiedCorr = useMemo(() => pearsonCorrelation(modifiedRows, xCol, yCol), [modifiedRows, xCol, yCol]);
  const originalReg = useMemo(() => linearRegression(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);
  const modifiedReg = useMemo(() => linearRegression(modifiedRows, xCol, yCol), [modifiedRows, xCol, yCol]);

  const corrChanged = Math.abs(originalCorr.coefficient - modifiedCorr.coefficient) > 0.1;
  const slopeChanged = Math.abs(originalReg.slope - modifiedReg.slope) > 0.5;
  const directionChanged = Math.sign(originalCorr.coefficient) !== Math.sign(modifiedCorr.coefficient) && Math.abs(originalCorr.coefficient) > 0.05;

  const handleSave = () => {
    onSave({
      id: genId('ce-'),
      datasetId: dataset.id,
      description: `Excluded ${excludeIndices.size} observation(s): ${reason || 'no reason given'}`,
      modifications: Array.from(excludeIndices).map(i => ({
        type: 'exclude' as const,
        description: `Excluded row ${i + 1}`,
        details: { index: i, reason },
      })),
      originalSummary: `r = ${fmt(originalCorr.coefficient)}, slope = ${fmt(originalReg.slope)}`,
      modifiedSummary: `r = ${fmt(modifiedCorr.coefficient)}, slope = ${fmt(modifiedReg.slope)}`,
      stabilityNotes: directionChanged ? 'Direction reversed — conclusion is unstable' : corrChanged || slopeChanged ? 'Magnitude changed materially' : 'Minimal change — conclusion appears stable',
      createdAt: Date.now(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="section-label mb-3">Potential Outliers (IQR Method, 1.5×IQR)</div>
        {allOutlierIndices.length === 0 ? (
          <p className="text-sm text-ink-secondary">No potential outliers detected in either variable.</p>
        ) : (
          <div className="space-y-2">
            {allOutlierIndices.map(i => {
              const row = dataset.rows[i];
              return (
                <div key={i} className="flex items-center gap-3 text-sm border-b border-divider/40 pb-2">
                  <input
                    type="checkbox"
                    checked={excludeIndices.has(i)}
                    onChange={() => {
                      const next = new Set(excludeIndices);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      setExcludeIndices(next);
                    }}
                    className="w-4 h-4 accent-burgundy"
                  />
                  <span className="font-mono text-xs text-ink-secondary">Row {i + 1}</span>
                  <span className="font-mono text-xs text-ink">{xCol}={row[xCol]}, {yCol}={row[yCol]}</span>
                  {outliers.some(o => o.index === i) && <Badge label="X outlier" />}
                  {yOutliers.some(o => o.index === i) && <Badge label="Y outlier" />}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {excludeIndices.size > 0 && (
        <>
          <Panel className="p-5">
            <label className="field-label">Reason for Exclusion</label>
            <input className="field-input" placeholder="e.g., Data entry error, measurement malfunction" value={reason} onChange={e => setReason(e.target.value)} />
            <div className="mt-3 text-xs text-ink-secondary bg-highlight/10 border border-highlight/30 p-3">
              <strong>Important:</strong> Outliers should not be removed merely because they produce an inconvenient result. Exclusion requires a documented justification.
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel className="p-5">
              <div className="section-label mb-3">Comparison: Original vs Modified</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-divider">
                    <th className="text-left py-2 font-mono text-xs text-ink-secondary">Statistic</th>
                    <th className="text-right py-2 font-mono text-xs text-ink-secondary">Original</th>
                    <th className="text-right py-2 font-mono text-xs text-ink-secondary">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-divider/40">
                    <td className="py-2 text-sm">Pearson r</td>
                    <td className="text-right font-mono text-sm">{fmt(originalCorr.coefficient)}</td>
                    <td className={`text-right font-mono text-sm ${corrChanged ? 'text-burgundy font-semibold' : ''}`}>{fmt(modifiedCorr.coefficient)}</td>
                  </tr>
                  <tr className="border-b border-divider/40">
                    <td className="py-2 text-sm">Regression slope</td>
                    <td className="text-right font-mono text-sm">{fmt(originalReg.slope)}</td>
                    <td className={`text-right font-mono text-sm ${slopeChanged ? 'text-burgundy font-semibold' : ''}`}>{fmt(modifiedReg.slope)}</td>
                  </tr>
                  <tr className="border-b border-divider/40">
                    <td className="py-2 text-sm">R²</td>
                    <td className="text-right font-mono text-sm">{fmt(originalReg.rSquared)}</td>
                    <td className="text-right font-mono text-sm">{fmt(modifiedReg.rSquared)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm">n</td>
                    <td className="text-right font-mono text-sm">{originalCorr.n}</td>
                    <td className="text-right font-mono text-sm">{modifiedCorr.n}</td>
                  </tr>
                </tbody>
              </table>

              {(directionChanged || corrChanged || slopeChanged) && (
                <div className="mt-4 border-l-2 border-burgundy bg-burgundy/5 px-4 py-3">
                  <div className="font-mono text-xs uppercase tracking-wider text-burgundy mb-1">Stability Warning</div>
                  <p className="text-sm text-ink">
                    {directionChanged
                      ? 'The direction of the correlation reversed after exclusion. The original conclusion is unstable.'
                      : 'The magnitude of the result changed materially after exclusion. The original conclusion is sensitive to this observation.'}
                  </p>
                </div>
              )}
              {!directionChanged && !corrChanged && !slopeChanged && (
                <div className="mt-4 border-l-2 border-evidence-green bg-evidence-green/5 px-4 py-3">
                  <div className="font-mono text-xs uppercase tracking-wider text-evidence-green mb-1">Stable</div>
                  <p className="text-sm text-ink">The conclusion does not materially change after exclusion.</p>
                </div>
              )}

              <button onClick={handleSave} className="btn-primary mt-4 w-full">Save Counterexample</button>
              {savedNotice && <div className="text-xs text-evidence-green mt-2 text-center">Saved successfully.</div>}
            </Panel>

            <Panel className="p-4">
              <div className="section-label mb-3">Modified Data (excluded points shown faded)</div>
              <ScatterPlot
                points={extractPaired(dataset.rows, xCol, yCol)}
                xLabel={xCol} yLabel={yCol}
                selectedIndices={excludeIndices}
                onSelectPoint={(i) => {
                  const next = new Set(excludeIndices);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  setExcludeIndices(next);
                }}
                title="Click points to exclude/restore"
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

// ── Subgroup View ─────────────────────────────────────────────────────────
function SubgroupView({ dataset, xCol, yCol, categoricalCols }: { dataset: DatasetRecord; xCol: string; yCol: string; categoricalCols: any[] }) {
  const [groupVar, setGroupVar] = useState(categoricalCols[0]?.name || '');

  const groups = useMemo(() => {
    if (!groupVar) return [];
    const map = new Map<string, typeof dataset.rows>();
    for (const r of dataset.rows) {
      const g = r[groupVar];
      if (g === null || g === undefined || g === '') continue;
      const key = String(g);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dataset, groupVar]);

  const overallCorr = useMemo(() => pearsonCorrelation(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);
  const groupCorrs = useMemo(() => groups.map(([name, rows]) => ({
    name,
    corr: pearsonCorrelation(rows, xCol, yCol),
  })), [groups, xCol, yCol]);

  const reversal = overallCorr.coefficient !== null && groupCorrs.every(g => !isNaN(g.corr.coefficient)) &&
    groupCorrs.length >= 2 && Math.sign(overallCorr.coefficient) !== Math.sign(groupCorrs[0].corr.coefficient) &&
    Math.sign(overallCorr.coefficient) !== Math.sign(groupCorrs[1].corr.coefficient);

  if (categoricalCols.length === 0) {
    return <WarningBox warnings={['A categorical variable is required for subgroup analysis.']} />;
  }

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <label className="field-label">Grouping Variable</label>
        <select className="field-input" value={groupVar} onChange={e => setGroupVar(e.target.value)}>
          {categoricalCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <Panel className="p-5">
        <div className="section-label mb-3">Subgroup Comparison</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider">
              <th className="text-left py-2 font-mono text-xs text-ink-secondary">Group</th>
              <th className="text-right py-2 font-mono text-xs text-ink-secondary">n</th>
              <th className="text-right py-2 font-mono text-xs text-ink-secondary">Pearson r</th>
              <th className="text-right py-2 font-mono text-xs text-ink-secondary">Direction</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b-2 border-ink bg-archive/50">
              <td className="py-2 font-mono text-sm text-burgundy">Overall (aggregate)</td>
              <td className="text-right font-mono">{overallCorr.n}</td>
              <td className="text-right font-mono text-sm font-semibold text-burgundy">{fmt(overallCorr.coefficient)}</td>
              <td className="text-right font-mono text-xs">{overallCorr.coefficient > 0 ? 'positive' : 'negative'}</td>
            </tr>
            {groupCorrs.map(g => (
              <tr key={g.name} className="border-b border-divider/40">
                <td className="py-2 font-mono text-sm text-ink">{g.name}</td>
                <td className="text-right font-mono">{g.corr.n}</td>
                <td className="text-right font-mono text-sm">{fmt(g.corr.coefficient)}</td>
                <td className="text-right font-mono text-xs">{g.corr.coefficient > 0 ? 'positive' : 'negative'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {reversal && (
        <div className="border-l-4 border-burgundy bg-burgundy/10 px-6 py-4">
          <div className="font-mono text-sm uppercase tracking-wider text-burgundy mb-2">Simpson's Paradox Detected</div>
          <p className="text-sm text-ink">
            The overall correlation is <strong>{overallCorr.coefficient > 0 ? 'positive' : 'negative'}</strong>, but within every subgroup
            the correlation is <strong>{groupCorrs[0].corr.coefficient > 0 ? 'positive' : 'negative'}</strong>. The aggregate conclusion
            reverses when the data is disaggregated. This happens because group composition differs — groups with different baseline
            levels are combined, masking the within-group pattern.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groupCorrs.map(g => {
          const rows = groups.find(([name]) => name === g.name)?.[1] || [];
          const pairs = extractPaired(rows, xCol, yCol);
          return (
            <Panel key={g.name} className="p-4">
              <div className="section-label mb-2">{g.name} (n={g.corr.n}, r={fmt(g.corr.coefficient)})</div>
              <ScatterPlot points={pairs} xLabel={xCol} yLabel={yCol} title={`${g.name} only`} />
            </Panel>
          );
        })}
      </div>

      <div className="text-xs text-ink-secondary bg-archive border border-divider p-4">
        <strong>Why does the aggregate differ from subgroups?</strong> When groups have different means on both X and Y, combining them
        can create or mask a relationship that doesn't exist within any single group. Always check whether subgroup analysis
        changes the conclusion before trusting an aggregate result.
      </div>
    </div>
  );
}

// ── Sensitivity View ──────────────────────────────────────────────────────
function SensitivityView({ dataset, xCol, yCol }: { dataset: DatasetRecord; xCol: string; yCol: string }) {
  const pearson = useMemo(() => pearsonCorrelation(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);
  const spearman = useMemo(() => spearmanCorrelation(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);
  const reg = useMemo(() => linearRegression(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);

  // Log-transform comparison
  const logRows = useMemo(() => {
    return dataset.rows.map(r => {
      const x = r[xCol], y = r[yCol];
      if (x === null || y === null || x === '' || y === '') return r;
      const xv = typeof x === 'number' ? x : parseFloat(String(x));
      const yv = typeof y === 'number' ? y : parseFloat(String(y));
      if (xv <= 0 || yv <= 0 || isNaN(xv) || isNaN(yv)) return r;
      return { ...r, [xCol]: Math.log(xv), [yCol]: Math.log(yv) };
    });
  }, [dataset, xCol, yCol]);
  const logCorr = useMemo(() => pearsonCorrelation(logRows, xCol, yCol), [logRows, xCol, yCol]);

  // Exclude top 10% of X
  const xVals = extractNumeric(dataset.rows, xCol).sort((a, b) => a - b);
  const top10Idx = Math.floor(xVals.length * 0.9);
  const threshold = xVals[top10Idx];
  const trimmedRows = dataset.rows.filter(r => {
    const v = r[xCol];
    if (v === null || v === '') return false;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return !isNaN(n) && n <= threshold;
  });
  const trimmedCorr = useMemo(() => pearsonCorrelation(trimmedRows, xCol, yCol), [trimmedRows, xCol, yCol]);

  const checks = [
    { label: 'Pearson r', value: pearson.coefficient, note: 'Linear association — sensitive to outliers' },
    { label: 'Spearman ρ', value: spearman.coefficient, note: 'Monotonic association — robust to outliers' },
    { label: 'Log-transformed r', value: logCorr.coefficient, note: 'After log(X) and log(Y) — for positive values only' },
    { label: 'Trimmed r (top 10% X removed)', value: trimmedCorr.coefficient, note: `X ≤ ${fmt(threshold, 2)}` },
  ];

  const values = checks.map(c => c.value).filter(v => !isNaN(v));
  const range = values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;
  const stable = range < 0.2;

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="section-label mb-3">Sensitivity Analysis: Alternative Analytical Choices</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider">
              <th className="text-left py-2 font-mono text-xs text-ink-secondary">Analytical Choice</th>
              <th className="text-right py-2 font-mono text-xs text-ink-secondary">Result</th>
              <th className="text-left py-2 font-mono text-xs text-ink-secondary pl-4">Note</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c, i) => (
              <tr key={i} className="border-b border-divider/40">
                <td className="py-2 text-sm">{c.label}</td>
                <td className="text-right font-mono text-sm">{fmt(c.value)}</td>
                <td className="text-xs text-ink-secondary pl-4">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className={`border-l-2 px-4 py-3 ${stable ? 'border-evidence-green bg-evidence-green/5' : 'border-burgundy bg-burgundy/5'}`}>
        <div className={`font-mono text-xs uppercase tracking-wider mb-1 ${stable ? 'text-evidence-green' : 'text-burgundy'}`}>
          {stable ? 'Stable across choices' : 'Sensitive to analytical choice'}
        </div>
        <p className="text-sm text-ink">
          {stable
            ? `The correlation coefficient ranges from ${fmt(Math.min(...values))} to ${fmt(Math.max(...values))} across different reasonable analytical choices. The conclusion appears robust.`
            : `The correlation coefficient ranges from ${fmt(Math.min(...values))} to ${fmt(Math.max(...values))} — a range of ${fmt(range)}. The conclusion is sensitive to the analytical method chosen.`}
        </p>
      </div>

      <div className="text-xs text-ink-secondary bg-archive border border-divider p-4">
        Sensitivity analysis checks whether a conclusion depends on specific analytical choices. If the result changes
        substantially under reasonable alternatives, the original conclusion should be stated with caution.
      </div>
    </div>
  );
}

// ── Hypothetical View ─────────────────────────────────────────────────────
function HypotheticalView({ dataset, xCol, yCol, onSave }: { dataset: DatasetRecord; xCol: string; yCol: string; onSave: (r: CounterexampleRecord) => void }) {
  const [hx, setHx] = useState('');
  const [hy, setHy] = useState('');
  const [label, setLabel] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const originalCorr = useMemo(() => pearsonCorrelation(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);
  const originalReg = useMemo(() => linearRegression(dataset.rows, xCol, yCol), [dataset, xCol, yCol]);

  const modifiedRows = useMemo(() => {
    if (hx === '' || hy === '') return dataset.rows;
    const xv = parseFloat(hx), yv = parseFloat(hy);
    if (isNaN(xv) || isNaN(yv)) return dataset.rows;
    const hypotheticalRow: Record<string, string | number | null> = { ...dataset.rows[0] };
    dataset.columns.forEach(c => { if (c.name !== xCol && c.name !== yCol) hypotheticalRow[c.name] = null; });
    hypotheticalRow[xCol] = xv;
    hypotheticalRow[yCol] = yv;
    hypotheticalRow['_hypothetical'] = 'HYPOTHETICAL';
    return [...dataset.rows, hypotheticalRow];
  }, [dataset, xCol, yCol, hx, hy]);

  const modifiedCorr = useMemo(() => pearsonCorrelation(modifiedRows, xCol, yCol), [modifiedRows, xCol, yCol]);
  const modifiedReg = useMemo(() => linearRegression(modifiedRows, xCol, yCol), [modifiedRows, xCol, yCol]);

  const directionChanged = Math.sign(originalCorr.coefficient) !== Math.sign(modifiedCorr.coefficient) && Math.abs(originalCorr.coefficient) > 0.05;

  const handleSave = () => {
    onSave({
      id: genId('ce-'),
      datasetId: dataset.id,
      description: `Added hypothetical observation (${xCol}=${hx}, ${yCol}=${hy}): ${label || 'no description'}`,
      modifications: [{
        type: 'addHypothetical' as const,
        description: `Hypothetical: ${xCol}=${hx}, ${yCol}=${hy}`,
        details: { x: parseFloat(hx), y: parseFloat(hy), label },
      }],
      originalSummary: `r = ${fmt(originalCorr.coefficient)}, slope = ${fmt(originalReg.slope)}`,
      modifiedSummary: `r = ${fmt(modifiedCorr.coefficient)}, slope = ${fmt(modifiedReg.slope)}`,
      stabilityNotes: directionChanged ? 'Direction reversed by hypothetical observation' : 'Magnitude changed',
      createdAt: Date.now(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="section-label mb-3">Add a Hypothetical Observation</div>
        <p className="text-sm text-ink-secondary mb-4">
          Add a hypothetical data point to explore how new evidence could change the conclusion. This point is clearly labeled as hypothetical and never mixed into the original dataset.
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <label className="field-label">{xCol}</label>
            <input type="number" className="field-input" value={hx} onChange={e => setHx(e.target.value)} placeholder="Enter value" />
          </div>
          <div>
            <label className="field-label">{yCol}</label>
            <input type="number" className="field-input" value={hy} onChange={e => setHy(e.target.value)} placeholder="Enter value" />
          </div>
        </div>
        <div className="mt-3 max-w-md">
          <label className="field-label">Description</label>
          <input className="field-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Why is this hypothetical point interesting?" />
        </div>
      </Panel>

      {hx !== '' && hy !== '' && !isNaN(parseFloat(hx)) && !isNaN(parseFloat(hy)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel className="p-5">
            <div className="section-label mb-3">Impact Comparison</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider">
                  <th className="text-left py-2 font-mono text-xs text-ink-secondary">Statistic</th>
                  <th className="text-right py-2 font-mono text-xs text-ink-secondary">Original</th>
                  <th className="text-right py-2 font-mono text-xs text-ink-secondary">With Hypothetical</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-divider/40">
                  <td className="py-2">Pearson r</td>
                  <td className="text-right font-mono">{fmt(originalCorr.coefficient)}</td>
                  <td className={`text-right font-mono ${directionChanged ? 'text-burgundy font-semibold' : ''}`}>{fmt(modifiedCorr.coefficient)}</td>
                </tr>
                <tr className="border-b border-divider/40">
                  <td className="py-2">Slope</td>
                  <td className="text-right font-mono">{fmt(originalReg.slope)}</td>
                  <td className="text-right font-mono">{fmt(modifiedReg.slope)}</td>
                </tr>
                <tr>
                  <td className="py-2">n</td>
                  <td className="text-right font-mono">{originalCorr.n}</td>
                  <td className="text-right font-mono">{modifiedCorr.n}</td>
                </tr>
              </tbody>
            </table>
            <button onClick={handleSave} className="btn-primary mt-4 w-full">Save Counterexample</button>
            {savedNotice && <div className="text-xs text-evidence-green mt-2 text-center">Saved successfully.</div>}
          </Panel>

          <Panel className="p-4">
            <div className="section-label mb-3">Scatterplot with Hypothetical Point</div>
            <ScatterPlot
              points={extractPaired(modifiedRows, xCol, yCol)}
              xLabel={xCol} yLabel={yCol}
              highlightIndex={modifiedRows.length - 1}
              title="Hypothetical point highlighted in burgundy"
            />
          </Panel>
        </div>
      )}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="text-[10px] font-mono uppercase tracking-wider text-burgundy border border-burgundy/30 px-1.5 py-0.5">{label}</span>;
}
