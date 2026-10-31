// Evidence Laboratory — the central analytical workspace

import { useState, useMemo, useEffect } from 'react';
import type { DatasetRecord, AnalysisConfig, AnalysisResultRecord } from '@/lib/types';
import {
  numericStats, categoricalStats, pearsonCorrelation, spearmanCorrelation,
  linearRegression, groupComparison, contingencyTable, bootstrap,
  fmt, fmtP, extractNumeric,
} from '@/lib/stats';
import { ScatterPlot, Histogram, BoxPlot, BarChart, ResidualPlot, BootstrapDistribution } from '@/components/charts';
import { SectionHeader, StatRow, WarningBox, Panel, Badge } from '@/components/ui';
import { genId } from '@/lib/storage';
import { Search, Table2, BarChart3, TrendingUp, GitCompare, Grid3x3, Shuffle, Save } from 'lucide-react';

interface LabProps {
  datasets: DatasetRecord[];
  selectedDatasetId?: string;
  onSaveResult?: (result: AnalysisResultRecord) => void;
}

type ViewMode = 'inspect' | 'descriptive' | 'correlation' | 'regression' | 'groupComparison' | 'contingency' | 'bootstrap';

export function EvidenceLab({ datasets, selectedDatasetId, onSaveResult }: LabProps) {
  const [datasetId, setDatasetId] = useState(selectedDatasetId || datasets[0]?.id || '');
  const [view, setView] = useState<ViewMode>('inspect');
  const [config, setConfig] = useState<AnalysisConfig>({ method: 'descriptive' });
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  useEffect(() => {
    if (selectedDatasetId) setDatasetId(selectedDatasetId);
  }, [selectedDatasetId]);

  const dataset = useMemo(() => datasets.find(d => d.id === datasetId), [datasets, datasetId]);

  const numericCols = useMemo(() => dataset?.columns.filter(c => c.type === 'numeric') || [], [dataset]);
  const categoricalCols = useMemo(() => dataset?.columns.filter(c => c.type === 'categorical') || [], [dataset]);

  // Reset config when dataset or view changes
  useEffect(() => {
    if (view === 'correlation') {
      setConfig({ method: 'correlation', primaryVar: numericCols[0]?.name, secondaryVar: numericCols[1]?.name, correlationType: 'pearson' });
    } else if (view === 'regression') {
      setConfig({ method: 'regression', primaryVar: numericCols[0]?.name, secondaryVar: numericCols[1]?.name });
    } else if (view === 'groupComparison') {
      setConfig({ method: 'groupComparison', statVar: numericCols[0]?.name, groupVar: categoricalCols[0]?.name });
    } else if (view === 'contingency') {
      setConfig({ method: 'contingency', rowVar: categoricalCols[0]?.name, colVar: categoricalCols[1]?.name });
    } else if (view === 'bootstrap') {
      setConfig({ method: 'bootstrap', bootstrapStat: 'mean', statVar: numericCols[0]?.name, bootstrapResamples: 1000, bootstrapSeed: 42 });
    } else if (view === 'descriptive') {
      setConfig({ method: 'descriptive', primaryVar: numericCols[0]?.name });
    }
  }, [view, numericCols, categoricalCols]);

  if (!dataset) {
    return <div className="p-8"><SectionHeader title="Evidence Laboratory" subtitle="Select a dataset to begin analysis." /></div>;
  }

  const views: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
    { id: 'inspect', label: 'Inspect', icon: <Table2 size={14} /> },
    { id: 'descriptive', label: 'Descriptive', icon: <BarChart3 size={14} /> },
    { id: 'correlation', label: 'Correlation', icon: <TrendingUp size={14} /> },
    { id: 'regression', label: 'Regression', icon: <TrendingUp size={14} /> },
    { id: 'groupComparison', label: 'Group Comparison', icon: <GitCompare size={14} /> },
    { id: 'contingency', label: 'Contingency', icon: <Grid3x3 size={14} /> },
    { id: 'bootstrap', label: 'Bootstrap', icon: <Shuffle size={14} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader number="B" title="Evidence Laboratory" subtitle="Select a dataset, inspect its variables, choose an analytical method, and run calculations against actual data." />

      {/* Dataset selector */}
      <div className="mb-6">
        <label className="field-label">Dataset</label>
        <select className="field-input max-w-md" value={datasetId} onChange={e => setDatasetId(e.target.value)}>
          {datasets.map(d => (
            <option key={d.id} value={d.id}>{d.name}{d.builtIn ? ' — built-in' : ''}</option>
          ))}
        </select>
      </div>

      {/* Dataset profile */}
      <DatasetProfile ds={dataset} />

      {/* View tabs */}
      <div className="flex gap-1 border-b border-divider mt-8 mb-6 overflow-x-auto">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
              view === v.id ? 'text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {v.icon}
            {v.label}
            {view === v.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-burgundy" />}
          </button>
        ))}
      </div>

      {/* View content */}
      {view === 'inspect' && (
        <DataInspector
          dataset={dataset}
          search={search}
          setSearch={setSearch}
          sortCol={sortCol}
          setSortCol={setSortCol}
          sortDir={sortDir}
          setSortDir={setSortDir}
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
        />
      )}

      {view === 'descriptive' && (
        <DescriptiveView dataset={dataset} config={config} setConfig={setConfig} numericCols={numericCols} categoricalCols={categoricalCols} onSaveResult={onSaveResult} />
      )}

      {view === 'correlation' && (
        <CorrelationView dataset={dataset} config={config} setConfig={setConfig} numericCols={numericCols} onSaveResult={onSaveResult} />
      )}

      {view === 'regression' && (
        <RegressionView dataset={dataset} config={config} setConfig={setConfig} numericCols={numericCols} onSaveResult={onSaveResult} />
      )}

      {view === 'groupComparison' && (
        <GroupComparisonView dataset={dataset} config={config} setConfig={setConfig} numericCols={numericCols} categoricalCols={categoricalCols} onSaveResult={onSaveResult} />
      )}

      {view === 'contingency' && (
        <ContingencyView dataset={dataset} config={config} setConfig={setConfig} categoricalCols={categoricalCols} onSaveResult={onSaveResult} />
      )}

      {view === 'bootstrap' && (
        <BootstrapView dataset={dataset} config={config} setConfig={setConfig} numericCols={numericCols} onSaveResult={onSaveResult} />
      )}
    </div>
  );
}

// ── Dataset Profile ───────────────────────────────────────────────────────
function DatasetProfile({ ds }: { ds: DatasetRecord }) {
  const profile = useMemo(() => {
    const nRows = ds.rows.length;
    const nCols = ds.columns.length;
    const missingByCol: Record<string, number> = {};
    for (const col of ds.columns) {
      missingByCol[col.name] = ds.rows.filter(r => r[col.name] === null || r[col.name] === undefined || r[col.name] === '').length;
    }
    // Duplicates
    const seen = new Set<string>();
    let dupes = 0;
    for (const r of ds.rows) {
      const key = JSON.stringify(r);
      if (seen.has(key)) dupes++;
      else seen.add(key);
    }
    return { nRows, nCols, missingByCol, dupes };
  }, [ds]);

  return (
    <Panel className="p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="section-label">Observations</div>
          <div className="stat-value text-lg">{profile.nRows}</div>
        </div>
        <div>
          <div className="section-label">Variables</div>
          <div className="stat-value text-lg">{profile.nCols}</div>
        </div>
        <div>
          <div className="section-label">Duplicate Rows</div>
          <div className="stat-value text-lg">{profile.dupes}</div>
        </div>
        <div>
          <div className="section-label">Source</div>
          <div className="text-sm text-ink-secondary">{ds.builtIn ? 'Built-in' : 'Imported'}</div>
        </div>
      </div>

      <div className="archive-divider pt-3">
        <div className="section-label mb-2">Variable Summary</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          {ds.columns.map(col => {
            const missing = profile.missingByCol[col.name] || 0;
            return (
              <div key={col.name} className="flex justify-between items-baseline py-1 text-sm border-b border-divider/40">
                <span className="font-mono text-ink">{col.name}</span>
                <span className="text-ink-secondary text-xs">
                  {col.type}
                  {missing > 0 && <span className="text-burgundy ml-2">missing: {missing}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {ds.limitations.length > 0 && (
        <div className="archive-divider pt-3 mt-3">
          <div className="section-label mb-2">Known Limitations</div>
          <ul className="space-y-1 text-sm text-ink-secondary">
            {ds.limitations.map((l, i) => <li key={i} className="flex gap-2"><span className="text-burgundy">—</span>{l}</li>)}
          </ul>
        </div>
      )}
    </Panel>
  );
}

// ── Data Inspector ────────────────────────────────────────────────────────
function DataInspector({
  dataset, search, setSearch, sortCol, setSortCol, sortDir, setSortDir, page, setPage, rowsPerPage,
}: any) {
  const filteredRows = useMemo(() => {
    let rows = dataset.rows;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r: Record<string, any>) =>
        Object.values(r).some(v => v !== null && String(v).toLowerCase().includes(s))
      );
    }
    if (sortCol) {
      rows = [...rows].sort((a: any, b: any) => {
        const av = a[sortCol], bv = b[sortCol];
        if (av === null) return 1;
        if (bv === null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return rows;
  }, [dataset, search, sortCol, sortDir]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const pageRows = filteredRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search observations..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="field-input"
          />
        </div>
        <span className="text-sm text-ink-secondary font-mono">{filteredRows.length} rows</span>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider bg-archive/50">
              <th className="px-3 py-2 text-left font-mono text-xs text-ink-secondary w-12">#</th>
              {dataset.columns.map((col: any) => (
                <th
                  key={col.name}
                  className="px-3 py-2 text-left cursor-pointer hover:bg-divider/30 select-none"
                  onClick={() => handleSort(col.name)}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-ink">{col.name}</span>
                    {sortCol === col.name && <span className="text-burgundy text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                  <span className="text-[10px] text-ink-secondary uppercase tracking-wider">{col.type}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row: Record<string, any>, i: number) => (
              <tr key={page * rowsPerPage + i} className="border-b border-divider/40 hover:bg-highlight/5">
                <td className="px-3 py-1.5 font-mono text-xs text-ink-secondary">{page * rowsPerPage + i + 1}</td>
                {dataset.columns.map((col: any) => {
                  const v = row[col.name];
                  return (
                    <td key={col.name} className={`px-3 py-1.5 font-mono text-xs ${v === null || v === undefined ? 'text-burgundy italic' : 'text-ink'}`}>
                      {v === null || v === undefined || v === '' ? '—' : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button>
          <span className="font-mono text-xs text-ink-secondary">Page {page + 1} of {totalPages}</span>
          <button className="btn-ghost" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}

      {/* Data dictionary */}
      <div className="mt-8">
        <div className="section-label mb-3">Data Dictionary</div>
        <Panel className="p-4">
          <dl className="space-y-2">
            {dataset.columns.map((col: any) => (
              <div key={col.name} className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b border-divider/40 pb-2 last:border-0">
                <dt className="font-mono text-ink">{col.name}</dt>
                <dd className="text-ink-secondary text-xs">{col.description || dataset.dictionary[col.name] || '—'}</dd>
                <dd className="text-ink-secondary text-xs font-mono">{col.unit || (col.type === 'categorical' ? 'categorical' : 'numeric')}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  );
}

// ── Descriptive View ──────────────────────────────────────────────────────
function DescriptiveView({ dataset, config, setConfig, numericCols, categoricalCols, onSaveResult }: any) {
  const col = config.primaryVar || numericCols[0]?.name;
  const colDef = dataset.columns.find((c: any) => c.name === col);

  if (!colDef) return <p className="text-ink-secondary">No numeric variables available.</p>;

  const isNumeric = colDef.type === 'numeric';
  const values = extractNumeric(dataset.rows, col);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="mb-4">
          <label className="field-label">Variable</label>
          <select className="field-input max-w-xs" value={col} onChange={e => setConfig({ ...config, primaryVar: e.target.value })}>
            {dataset.columns.map((c: any) => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
          </select>
        </div>

        {isNumeric ? (
          <NumericDescriptive dataset={dataset} col={col} values={values} />
        ) : (
          <CategoricalDescriptive dataset={dataset} col={col} />
        )}
      </div>

      <div>
        {isNumeric && values.length > 0 ? (
          <Panel className="p-4">
            <div className="section-label mb-3">Distribution</div>
            <Histogram values={values} label={col} unit={colDef.unit} title={`${col} — histogram`} />
            <div className="mt-4 text-xs text-ink-secondary">
              The histogram shows the frequency distribution of {col}. Each bar represents the count of observations within a range.
            </div>
          </Panel>
        ) : (
          <CategoricalChart dataset={dataset} col={col} />
        )}
      </div>

      {onSaveResult && (
        <div className="lg:col-span-2">
          <SaveResultButton
            onSave={() => onSaveResult({
              id: genId('ar-'),
              config: { ...config, method: 'descriptive' as const },
              resultSummary: `Descriptive statistics for ${col}`,
              stats: isNumeric
                ? Object.fromEntries(Object.entries(numericStats(dataset.rows, col)).map(([k, v]) => [k, typeof v === 'number' ? Number(v.toFixed(4)) : v]))
                : { valid: categoricalStats(dataset.rows, col).valid, missing: categoricalStats(dataset.rows, col).missing },
              warnings: [],
              timestamp: Date.now(),
              datasetVersion: dataset.version,
            })}
          />
        </div>
      )}
    </div>
  );
}

function NumericDescriptive({ dataset, col, values }: { dataset: DatasetRecord; col: string; values: number[] }) {
  const stats = useMemo(() => numericStats(dataset.rows, col), [dataset, col]);
  return (
    <Panel className="p-5">
      <div className="section-label mb-3">Descriptive Statistics — {col}</div>
      <StatRow label="Count (valid)" value={String(stats.count)} />
      <StatRow label="Missing" value={String(stats.missing)} />
      <StatRow label="Mean" value={fmt(stats.mean)} />
      <StatRow label="Median" value={fmt(stats.median)} />
      <StatRow label="Minimum" value={fmt(stats.min)} />
      <StatRow label="Maximum" value={fmt(stats.max)} />
      <StatRow label="Range" value={fmt(stats.range)} />
      <StatRow label="Variance (sample, n−1)" value={fmt(stats.variance)} />
      <StatRow label="Std. Deviation (sample)" value={fmt(stats.stdDev)} />
      <StatRow label="Q1 (25th percentile)" value={fmt(stats.q1)} />
      <StatRow label="Q3 (75th percentile)" value={fmt(stats.q3)} />
      <StatRow label="IQR" value={fmt(stats.iqr)} />
      <div className="mt-4 text-xs text-ink-secondary border-t border-divider pt-3">
        Variance and standard deviation use the sample formula (n−1 denominator).
        {values.length < 2 && <span className="text-burgundy block mt-1">With fewer than 2 observations, variance and SD are undefined.</span>}
      </div>
    </Panel>
  );
}

function CategoricalDescriptive({ dataset, col }: { dataset: DatasetRecord; col: string }) {
  const stats = useMemo(() => categoricalStats(dataset.rows, col), [dataset, col]);
  return (
    <Panel className="p-5">
      <div className="section-label mb-3">Category Frequencies — {col}</div>
      <StatRow label="Valid" value={String(stats.valid)} />
      <StatRow label="Missing" value={String(stats.missing)} />
      <StatRow label="Mode" value={stats.mode || '—'} emphasis />
      <div className="mt-4 archive-divider pt-3">
        <div className="section-label mb-2">Frequency Table</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider">
              <th className="text-left py-1 font-mono text-xs text-ink-secondary">Category</th>
              <th className="text-right py-1 font-mono text-xs text-ink-secondary">Count</th>
              <th className="text-right py-1 font-mono text-xs text-ink-secondary">Proportion</th>
            </tr>
          </thead>
          <tbody>
            {stats.counts.map((c, i) => (
              <tr key={i} className="border-b border-divider/40">
                <td className="py-1 font-mono text-xs text-ink">{c.category}</td>
                <td className="py-1 text-right font-mono text-xs">{c.count}</td>
                <td className="py-1 text-right font-mono text-xs">{(c.proportion * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CategoricalChart({ dataset, col }: { dataset: DatasetRecord; col: string }) {
  const stats = useMemo(() => categoricalStats(dataset.rows, col), [dataset, col]);
  return (
    <Panel className="p-4">
      <div className="section-label mb-3">Category Distribution</div>
      <BarChart
        data={stats.counts.map(c => ({ label: c.category, value: c.count }))}
        label={col}
        title={`${col} — category counts`}
      />
    </Panel>
  );
}

// ── Correlation View ──────────────────────────────────────────────────────
function CorrelationView({ dataset, config, setConfig, numericCols, onSaveResult }: any) {
  const xCol = config.primaryVar || numericCols[0]?.name;
  const yCol = config.secondaryVar || numericCols[1]?.name;
  const corrType = config.correlationType || 'pearson';

  const result = useMemo(() => {
    if (!xCol || !yCol) return null;
    return corrType === 'pearson'
      ? pearsonCorrelation(dataset.rows, xCol, yCol)
      : spearmanCorrelation(dataset.rows, xCol, yCol);
  }, [dataset, xCol, yCol, corrType]);

  const pairs = useMemo(() => {
    if (!xCol || !yCol) return [];
    return dataset.rows
      .filter((r: any) => r[xCol] !== null && r[yCol] !== null && r[xCol] !== '' && r[yCol] !== '')
      .map((r: any) => [parseFloat(r[xCol]), parseFloat(r[yCol])] as [number, number])
      .filter((p: [number, number]) => !isNaN(p[0]) && !isNaN(p[1]));
  }, [dataset, xCol, yCol]);

  if (numericCols.length < 2) {
    return <WarningBox warnings={['At least two numeric variables are required for correlation analysis.']} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="field-label">Variable X</label>
            <select className="field-input" value={xCol} onChange={e => setConfig({ ...config, primaryVar: e.target.value })}>
              {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Variable Y</label>
            <select className="field-input" value={yCol} onChange={e => setConfig({ ...config, secondaryVar: e.target.value })}>
              {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="field-label">Method</label>
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 text-sm border ${corrType === 'pearson' ? 'border-ink bg-ink text-paper' : 'border-divider text-ink-secondary hover:text-ink'}`}
              onClick={() => setConfig({ ...config, correlationType: 'pearson' })}
            >Pearson (linear)</button>
            <button
              className={`px-3 py-2 text-sm border ${corrType === 'spearman' ? 'border-ink bg-ink text-paper' : 'border-divider text-ink-secondary hover:text-ink'}`}
              onClick={() => setConfig({ ...config, correlationType: 'spearman' })}
            >Spearman (monotonic)</button>
          </div>
        </div>

        {result && (
          <Panel className="p-5">
            <div className="section-label mb-3">{corrType === 'pearson' ? 'Pearson' : 'Spearman'} Correlation</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center py-3 border border-divider">
                <div className="font-mono text-3xl text-burgundy font-semibold">{fmt(result.coefficient, 4)}</div>
                <div className="text-xs text-ink-secondary mt-1">coefficient (r)</div>
              </div>
              <div className="text-center py-3 border border-divider">
                <div className="font-mono text-3xl text-ink">{result.n}</div>
                <div className="text-xs text-ink-secondary mt-1">paired observations</div>
              </div>
            </div>
            <StatRow label="t-statistic" value={fmt(result.tStat, 4)} />
            <StatRow label="p-value (two-sided)" value={fmtP(result.pValue)} emphasis={result.pValue < 0.05} />
            <StatRow label="95% CI lower" value={fmt(result.ciLower, 4)} />
            <StatRow label="95% CI upper" value={fmt(result.ciUpper, 4)} />
            <WarningBox warnings={result.warnings} />
            <div className="mt-4 text-xs text-ink-secondary border-t border-divider pt-3">
              {corrType === 'pearson'
                ? 'Pearson r measures the strength and direction of a linear association. It is sensitive to outliers and assumes an approximately linear relationship.'
                : 'Spearman ρ measures monotonic association using ranks. It is more robust to outliers and does not require linearity.'}
              <br /><br />
              A correlation coefficient does not imply causation. A high r only indicates that the variables tend to move together — the reason may involve confounding, coincidence, or a common cause.
            </div>
          </Panel>
        )}
      </div>

      <div>
        {pairs.length > 0 && (
          <Panel className="p-4">
            <div className="section-label mb-3">Scatterplot</div>
            <ScatterPlot
              points={pairs}
              xLabel={xCol}
              yLabel={yCol}
              xUnit={dataset.columns.find((c: any) => c.name === xCol)?.unit}
              yUnit={dataset.columns.find((c: any) => c.name === yCol)?.unit}
              title={`${yCol} vs ${xCol}`}
            />
            <div className="mt-3 text-xs text-ink-secondary">
              Each point represents one observation. Hover over a point to see its coordinates. The scatterplot reveals the shape of the relationship — linear, non-linear, or absent.
            </div>
          </Panel>
        )}
      </div>

      {onSaveResult && result && (
        <div className="lg:col-span-2">
          <SaveResultButton
            onSave={() => onSaveResult({
              id: genId('ar-'),
              config: { ...config, method: 'correlation' as const },
              resultSummary: `${corrType === 'pearson' ? 'Pearson' : 'Spearman'} correlation ${xCol} vs ${yCol}: r = ${fmt(result.coefficient)}`,
              stats: {
                coefficient: Number(result.coefficient.toFixed(6)),
                n: result.n,
                pValue: result.pValue,
                ciLower: result.ciLower,
                ciUpper: result.ciUpper,
              },
              warnings: result.warnings,
              timestamp: Date.now(),
              datasetVersion: dataset.version,
            })}
          />
        </div>
      )}
    </div>
  );
}

// ── Regression View ───────────────────────────────────────────────────────
function RegressionView({ dataset, config, setConfig, numericCols, onSaveResult }: any) {
  const xCol = config.primaryVar || numericCols[0]?.name;
  const yCol = config.secondaryVar || numericCols[1]?.name;

  const result = useMemo(() => {
    if (!xCol || !yCol) return null;
    return linearRegression(dataset.rows, xCol, yCol);
  }, [dataset, xCol, yCol]);

  if (numericCols.length < 2) {
    return <WarningBox warnings={['At least two numeric variables are required for regression.']} />;
  }

  const residuals = result?.predictions.map(([x, , pred]) => [x, 0] as [number, number]) || [];
  const resPairs = result ? result.predictions.map(([x, y, pred]) => [x, y - pred] as [number, number]) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="field-label">Predictor (X)</label>
            <select className="field-input" value={xCol} onChange={e => setConfig({ ...config, primaryVar: e.target.value })}>
              {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Response (Y)</label>
            <select className="field-input" value={yCol} onChange={e => setConfig({ ...config, secondaryVar: e.target.value })}>
              {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {result && (
          <Panel className="p-5">
            <div className="section-label mb-3">Linear Regression Results</div>
            <div className="font-mono text-sm bg-archive p-3 mb-4 border border-divider">
              ŷ = {fmt(result.intercept, 4)} + {fmt(result.slope, 4)} × {xCol}
            </div>
            <StatRow label="Intercept (α)" value={fmt(result.intercept)} />
            <StatRow label="Slope (β)" value={fmt(result.slope)} emphasis />
            <StatRow label="R²" value={fmt(result.rSquared, 4)} />
            <StatRow label="Residual Std. Error" value={fmt(result.residualSE, 4)} />
            <StatRow label="SE (slope)" value={fmt(result.seSlope, 4)} />
            <StatRow label="t (slope)" value={fmt(result.tStatSlope, 4)} />
            <StatRow label="p-value (slope)" value={fmtP(result.pValueSlope)} emphasis={result.pValueSlope < 0.05} />
            <StatRow label="95% CI (slope)" value={`[${fmt(result.ciSlopeLower)}, ${fmt(result.ciSlopeUpper)}]`} />
            <StatRow label="Sample size" value={String(result.n)} />
            <WarningBox warnings={result.warnings} />
            <div className="mt-4 text-xs text-ink-secondary border-t border-divider pt-3">
              The slope estimates how much Y changes per unit change in X, on average.
              R² measures the proportion of variance in Y explained by the model.
              <br /><br />
              This model describes association, not causation. Prediction outside the observed range of X (extrapolation) is unreliable. The model assumes linearity, independence, homoscedasticity, and approximate normality of residuals.
            </div>
          </Panel>
        )}
      </div>

      <div className="space-y-6">
        {result && result.predictions.length > 0 && (
          <Panel className="p-4">
            <div className="section-label mb-3">Regression Line</div>
            <ScatterPlot
              points={result.predictions.map(([x, y]) => [x, y] as [number, number])}
              xLabel={xCol}
              yLabel={yCol}
              xUnit={dataset.columns.find((c: any) => c.name === xCol)?.unit}
              yUnit={dataset.columns.find((c: any) => c.name === yCol)?.unit}
              title={`${yCol} = ${fmt(result.intercept, 2)} + ${fmt(result.slope, 2)}·${xCol}`}
              regressionLine={{
                intercept: result.intercept,
                slope: result.slope,
                xMin: Math.min(...result.predictions.map(p => p[0])),
                xMax: Math.max(...result.predictions.map(p => p[0])),
              }}
            />
          </Panel>
        )}
        {result && resPairs.length > 0 && (
          <Panel className="p-4">
            <div className="section-label mb-3">Residual Plot</div>
            <ResidualPlot residuals={resPairs} xLabel={xCol} title="Residuals vs fitted values" />
            <div className="mt-3 text-xs text-ink-secondary">
              The residual plot helps assess model assumptions. If the residuals show a pattern (curvature, fan shape), the linear model may be inappropriate.
            </div>
          </Panel>
        )}
      </div>

      {onSaveResult && result && (
        <div className="lg:col-span-2">
          <SaveResultButton
            onSave={() => onSaveResult({
              id: genId('ar-'),
              config: { ...config, method: 'regression' as const },
              resultSummary: `Regression ${yCol} ~ ${xCol}: slope = ${fmt(result.slope)}, R² = ${fmt(result.rSquared)}`,
              stats: {
                intercept: Number(result.intercept.toFixed(6)),
                slope: Number(result.slope.toFixed(6)),
                rSquared: Number(result.rSquared.toFixed(6)),
                pValueSlope: result.pValueSlope,
                n: result.n,
              },
              warnings: result.warnings,
              timestamp: Date.now(),
              datasetVersion: dataset.version,
            })}
          />
        </div>
      )}
    </div>
  );
}

// ── Group Comparison View ─────────────────────────────────────────────────
function GroupComparisonView({ dataset, config, setConfig, numericCols, categoricalCols, onSaveResult }: any) {
  const valueCol = config.statVar || numericCols[0]?.name;
  const groupCol = config.groupVar || categoricalCols[0]?.name;

  const groupValues = useMemo(() => {
    if (!groupCol) return [];
    const set = new Set<string>();
    dataset.rows.forEach((r: any) => {
      const v = r[groupCol];
      if (v !== null && v !== undefined && v !== '') set.add(String(v));
    });
    return Array.from(set).sort();
  }, [dataset, groupCol]);

  const result = useMemo(() => {
    if (!valueCol || !groupCol || groupValues.length < 2) return null;
    return groupComparison(dataset.rows, valueCol, groupCol, groupValues[0], groupValues[1]);
  }, [dataset, valueCol, groupCol, groupValues]);

  if (numericCols.length === 0 || categoricalCols.length === 0) {
    return <WarningBox warnings={['A numeric variable and a categorical grouping variable are required for group comparison.']} />;
  }

  const boxGroups = groupValues.map((g: string) => ({
    label: g,
    values: dataset.rows
      .filter((r: any) => String(r[groupCol]) === g && r[valueCol] !== null && r[valueCol] !== '')
      .map((r: any) => parseFloat(r[valueCol]))
      .filter((v: number) => !isNaN(v)),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="field-label">Value Variable</label>
            <select className="field-input" value={valueCol} onChange={e => setConfig({ ...config, statVar: e.target.value })}>
              {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Grouping Variable</label>
            <select className="field-input" value={groupCol} onChange={e => setConfig({ ...config, groupVar: e.target.value })}>
              {categoricalCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4 text-xs text-ink-secondary">
          Comparing first two groups: <span className="font-mono text-ink">{groupValues[0]}</span> vs <span className="font-mono text-ink">{groupValues[1]}</span>
        </div>

        {result && (
          <Panel className="p-5">
            <div className="section-label mb-3">Welch's Two-Sample t-test</div>
            <StatRow label={`${result.group1Name} — n`} value={String(result.n1)} />
            <StatRow label={`${result.group1Name} — mean`} value={fmt(result.mean1)} />
            <StatRow label={`${result.group1Name} — median`} value={fmt(result.median1)} />
            <StatRow label={`${result.group1Name} — SD`} value={fmt(result.sd1)} />
            <div className="my-2 border-t border-divider" />
            <StatRow label={`${result.group2Name} — n`} value={String(result.n2)} />
            <StatRow label={`${result.group2Name} — mean`} value={fmt(result.mean2)} />
            <StatRow label={`${result.group2Name} — median`} value={fmt(result.median2)} />
            <StatRow label={`${result.group2Name} — SD`} value={fmt(result.sd2)} />
            <div className="my-2 border-t border-divider" />
            <StatRow label="Difference in means" value={fmt(result.meanDifference)} emphasis />
            <StatRow label="SE of difference" value={fmt(result.seDifference, 4)} />
            <StatRow label="t-statistic" value={fmt(result.tStat, 4)} />
            <StatRow label="Degrees of freedom (Welch)" value={fmt(result.df, 2)} />
            <StatRow label="p-value (two-sided)" value={fmtP(result.pValue)} emphasis={result.pValue < 0.05} />
            <StatRow label="95% CI (difference)" value={`[${fmt(result.ciLower)}, ${fmt(result.ciUpper)}]`} />
            <WarningBox warnings={result.warnings} />
            <div className="mt-4 text-xs text-ink-secondary border-t border-divider pt-3">
              Welch's t-test does not assume equal population variances, making it more robust than Student's t-test when group variances differ.
              <br /><br />
              A statistically significant result (small p-value) does not imply practical importance. Examine the difference in means and its confidence interval to assess the magnitude of the effect.
            </div>
          </Panel>
        )}
      </div>

      <div>
        {boxGroups.length > 0 && (
          <Panel className="p-4">
            <div className="section-label mb-3">Group Distributions</div>
            <BoxPlot groups={boxGroups} label={valueCol} unit={dataset.columns.find((c: any) => c.name === valueCol)?.unit} title={`${valueCol} by ${groupCol}`} />
            <div className="mt-3 text-xs text-ink-secondary">
              The box plot shows the median (burgundy line), IQR (box), whiskers (1.5×IQR range), and outliers (circles) for each group.
            </div>
          </Panel>
        )}
      </div>

      {onSaveResult && result && (
        <div className="lg:col-span-2">
          <SaveResultButton
            onSave={() => onSaveResult({
              id: genId('ar-'),
              config: { ...config, method: 'groupComparison' as const },
              resultSummary: `Group comparison ${valueCol} by ${groupCol}: diff = ${fmt(result.meanDifference)}, p = ${fmtP(result.pValue)}`,
              stats: {
                meanDifference: Number(result.meanDifference.toFixed(6)),
                tStat: Number(result.tStat.toFixed(4)),
                df: Number(result.df.toFixed(2)),
                pValue: result.pValue,
                n1: result.n1, n2: result.n2,
              },
              warnings: result.warnings,
              timestamp: Date.now(),
              datasetVersion: dataset.version,
            })}
          />
        </div>
      )}
    </div>
  );
}

// ── Contingency View ──────────────────────────────────────────────────────
function ContingencyView({ dataset, config, setConfig, categoricalCols, onSaveResult }: any) {
  const rowVar = config.rowVar || categoricalCols[0]?.name;
  const colVar = config.colVar || categoricalCols[1]?.name;

  const result = useMemo(() => {
    if (!rowVar || !colVar) return null;
    return contingencyTable(dataset.rows, rowVar, colVar);
  }, [dataset, rowVar, colVar]);

  if (categoricalCols.length < 2) {
    return <WarningBox warnings={['At least two categorical variables are required for contingency-table analysis.']} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div>
          <label className="field-label">Row Variable</label>
          <select className="field-input" value={rowVar} onChange={e => setConfig({ ...config, rowVar: e.target.value })}>
            {categoricalCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Column Variable</label>
          <select className="field-input" value={colVar} onChange={e => setConfig({ ...config, colVar: e.target.value })}>
            {categoricalCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {result && (
        <>
          <Panel className="p-5 overflow-x-auto">
            <div className="section-label mb-3">Cross-Tabulation: {rowVar} × {colVar}</div>
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-mono text-xs text-ink-secondary">{rowVar} \ {colVar}</th>
                  {result.colLabels.map((cl: string) => <th key={cl} className="px-3 py-2 text-right font-mono text-xs text-ink">{cl}</th>)}
                  <th className="px-3 py-2 text-right font-mono text-xs text-burgundy">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.rowLabels.map((rl: string, i: number) => (
                  <tr key={rl} className="border-t border-divider/40">
                    <td className="px-3 py-1.5 font-mono text-xs text-ink">{rl}</td>
                    {result.colLabels.map((_: string, j: number) => (
                      <td key={j} className="px-3 py-1.5 text-right font-mono text-xs text-ink">{result.counts[i][j]}</td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-burgundy">{result.rowTotals[i]}</td>
                  </tr>
                ))}
                <tr className="border-t border-ink">
                  <td className="px-3 py-1.5 font-mono text-xs text-burgundy">Total</td>
                  {result.colTotals.map((ct: number, j: number) => <td key={j} className="px-3 py-1.5 text-right font-mono text-xs text-burgundy">{ct}</td>)}
                  <td className="px-3 py-1.5 text-right font-mono text-xs text-burgundy font-semibold">{result.grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Panel className="p-5 overflow-x-auto">
              <div className="section-label mb-3">Row Percentages (%)</div>
              <table className="text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-xs text-ink-secondary"></th>
                    {result.colLabels.map((cl: string) => <th key={cl} className="px-3 py-2 text-right font-mono text-xs text-ink">{cl}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rowLabels.map((rl: string, i: number) => (
                    <tr key={rl} className="border-t border-divider/40">
                      <td className="px-3 py-1.5 font-mono text-xs text-ink">{rl}</td>
                      {result.colLabels.map((_: string, j: number) => (
                        <td key={j} className="px-3 py-1.5 text-right font-mono text-xs">{result.rowPercentages[i][j].toFixed(1)}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel className="p-5">
              <div className="section-label mb-3">Chi-Square Test</div>
              <StatRow label="Chi-square statistic" value={fmt(result.chiSquare, 4)} emphasis />
              <StatRow label="Degrees of freedom" value={String(result.df)} />
              <StatRow label="p-value" value={fmtP(result.pValue)} emphasis={result.pValue < 0.05} />
              <StatRow label="Total observations" value={String(result.grandTotal)} />
              <WarningBox warnings={result.warnings} />
              <div className="mt-4 text-xs text-ink-secondary border-t border-divider pt-3">
                The chi-square test evaluates whether the row and column variables are independent.
                The test is unreliable when many expected cell counts are below 5. In that case, consider Fisher's exact test or combining categories.
                <br /><br />
                A significant result indicates association, not causation.
              </div>
            </Panel>
          </div>
        </>
      )}

      {onSaveResult && result && (
        <SaveResultButton
          onSave={() => onSaveResult({
            id: genId('ar-'),
            config: { ...config, method: 'contingency' as const },
            resultSummary: `Contingency ${rowVar} × ${colVar}: χ² = ${fmt(result.chiSquare)}, p = ${fmtP(result.pValue)}`,
            stats: {
              chiSquare: Number(result.chiSquare.toFixed(4)),
              df: result.df,
              pValue: result.pValue,
              total: result.grandTotal,
            },
            warnings: result.warnings,
            timestamp: Date.now(),
            datasetVersion: dataset.version,
          })}
        />
      )}
    </div>
  );
}

// ── Bootstrap View ────────────────────────────────────────────────────────
function BootstrapView({ dataset, config, setConfig, numericCols, onSaveResult }: any) {
  const [runId, setRunId] = useState(0);
  const stat = config.bootstrapStat || 'mean';
  const resamples = config.bootstrapResamples || 1000;
  const seed = config.bootstrapSeed || 42;

  const result = useMemo(() => {
    if (stat === 'mean' || stat === 'median') {
      return bootstrap(dataset.rows, { stat, statVar: config.statVar || numericCols[0]?.name, resamples, seed });
    } else {
      return bootstrap(dataset.rows, { stat, primaryVar: config.primaryVar || numericCols[0]?.name, secondaryVar: config.secondaryVar || numericCols[1]?.name, resamples, seed });
    }
  }, [dataset, stat, config.statVar, config.primaryVar, config.secondaryVar, resamples, seed, runId]);

  if (numericCols.length === 0) {
    return <WarningBox warnings={['At least one numeric variable is required for bootstrap analysis.']} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="mb-4">
          <label className="field-label">Statistic to Bootstrap</label>
          <select className="field-input max-w-xs" value={stat} onChange={e => setConfig({ ...config, bootstrapStat: e.target.value as any })}>
            <option value="mean">Mean</option>
            <option value="median">Median</option>
            <option value="correlation">Correlation (Pearson r)</option>
            <option value="slope">Regression slope</option>
          </select>
        </div>

        {(stat === 'mean' || stat === 'median') && (
          <div className="mb-4">
            <label className="field-label">Variable</label>
            <select className="field-input max-w-xs" value={config.statVar || ''} onChange={e => setConfig({ ...config, statVar: e.target.value })}>
              {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}

        {(stat === 'correlation' || stat === 'slope') && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label">Variable X</label>
              <select className="field-input" value={config.primaryVar || ''} onChange={e => setConfig({ ...config, primaryVar: e.target.value })}>
                {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Variable Y</label>
              <select className="field-input" value={config.secondaryVar || ''} onChange={e => setConfig({ ...config, secondaryVar: e.target.value })}>
                {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="field-label">Resamples (10–10,000)</label>
            <input type="number" min={10} max={10000} className="field-input" value={resamples}
              onChange={e => setConfig({ ...config, bootstrapResamples: Math.min(10000, Math.max(10, parseInt(e.target.value) || 1000)) })} />
          </div>
          <div>
            <label className="field-label">Random Seed</label>
            <input type="number" className="field-input" value={seed}
              onChange={e => setConfig({ ...config, bootstrapSeed: parseInt(e.target.value) || 42 })} />
          </div>
        </div>

        <button className="btn-secondary mb-4" onClick={() => setRunId(runId + 1)}>Run Bootstrap</button>

        {result && (
          <Panel className="p-5">
            <div className="section-label mb-3">Bootstrap Results</div>
            <StatRow label="Original sample size" value={String(result.n)} />
            <StatRow label="Resamples completed" value={String(result.resamples)} />
            <StatRow label="Bootstrap mean" value={fmt(result.mean, 4)} />
            <StatRow label="Bootstrap median" value={fmt(result.median, 4)} />
            <StatRow label="Bootstrap SE" value={fmt(result.stdError, 4)} />
            <StatRow label="95% percentile CI" value={`[${fmt(result.ciLower, 4)}, ${fmt(result.ciUpper, 4)}]`} emphasis />
            <WarningBox warnings={result.warnings} />
            <div className="mt-4 text-xs text-ink-secondary border-t border-divider pt-3">
              The bootstrap resamples the original data with replacement to estimate the sampling distribution of a statistic.
              The 95% percentile interval is taken from the 2.5th and 97.5th percentiles of the bootstrap estimates.
              <br /><br />
              The bootstrap does not fix selection bias, non-response, or a non-representative sample. It estimates variability under resampling from the observed data, not from the true population.
            </div>
          </Panel>
        )}
      </div>

      <div>
        {result && result.estimates.length > 0 && (
          <Panel className="p-4">
            <div className="section-label mb-3">Bootstrap Distribution</div>
            <BootstrapDistribution
              estimates={result.estimates}
              ciLower={result.ciLower}
              ciUpper={result.ciUpper}
              statName={stat}
            />
            <div className="mt-3 text-xs text-ink-secondary">
              The green bars fall within the 95% percentile interval. The dashed burgundy lines mark the interval bounds.
              Using the same seed and configuration reproduces the identical distribution.
            </div>
          </Panel>
        )}
      </div>

      {onSaveResult && result && (
        <div className="lg:col-span-2">
          <SaveResultButton
            onSave={() => onSaveResult({
              id: genId('ar-'),
              config: { ...config, method: 'bootstrap' as const },
              resultSummary: `Bootstrap ${stat}: SE = ${fmt(result.stdError)}, 95% CI = [${fmt(result.ciLower)}, ${fmt(result.ciUpper)}]`,
              stats: {
                bootstrapMean: Number(result.mean.toFixed(6)),
                bootstrapSE: Number(result.stdError.toFixed(6)),
                ciLower: Number(result.ciLower.toFixed(6)),
                ciUpper: Number(result.ciUpper.toFixed(6)),
                resamples: result.resamples,
                seed,
              },
              warnings: result.warnings,
              timestamp: Date.now(),
              datasetVersion: dataset.version,
            })}
          />
        </div>
      )}
    </div>
  );
}

// ── Save Result Button ────────────────────────────────────────────────────
function SaveResultButton({ onSave }: { onSave: () => void }) {
  return (
    <button onClick={onSave} className="btn-primary flex items-center gap-2">
      <Save size={16} /> Save result to investigation
    </button>
  );
}
