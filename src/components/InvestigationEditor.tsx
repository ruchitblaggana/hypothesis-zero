// Investigation Editor — full investigation workflow with notebook and report

import { useState, useMemo, useEffect } from 'react';
import type { InvestigationRecord, DatasetRecord, AnalysisResultRecord, HypothesisRecord, ConclusionRecord } from '@/lib/types';
import { SectionHeader, Panel, Badge, WarningBox, Tabs } from '@/components/ui';
import { EvidenceLab } from './EvidenceLab';
import { genId, saveInvestigation } from '@/lib/storage';
import { fmt, datasetHash } from '@/lib/stats';
import { csvFromRows } from '@/lib/csv';
import { Notebook, FileText, FlaskConical, Swords, Download, Printer, Save } from 'lucide-react';

interface EditorProps {
  investigation: InvestigationRecord;
  datasets: DatasetRecord[];
  onUpdate: (inv: InvestigationRecord) => void;
  onBack: () => void;
}

type Tab = 'overview' | 'hypothesis' | 'evidence' | 'challenge' | 'notebook' | 'conclusion' | 'report';

export function InvestigationEditor({ investigation, datasets, onUpdate, onBack }: EditorProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [inv, setInv] = useState(investigation);

  useEffect(() => setInv(investigation), [investigation]);

  const dataset = useMemo(() => datasets.find(d => d.id === inv.datasetId), [datasets, inv.datasetId]);

  const update = (changes: Partial<InvestigationRecord>) => {
    const updated = { ...inv, ...changes, lastActivity: Date.now(), updatedAt: Date.now() };
    setInv(updated);
    onUpdate(updated);
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Question', icon: <FileText size={14} /> },
    { id: 'hypothesis', label: 'Hypothesis', icon: <FlaskConical size={14} /> },
    { id: 'evidence', label: 'Evidence Lab', icon: <FlaskConical size={14} /> },
    { id: 'challenge', label: 'Challenge', icon: <Swords size={14} /> },
    { id: 'notebook', label: 'Notebook', icon: <Notebook size={14} /> },
    { id: 'conclusion', label: 'Conclusion', icon: <FileText size={14} /> },
    { id: 'report', label: 'Report', icon: <Printer size={14} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="btn-ghost mb-4">← Back to Investigation Desk</button>
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-xs text-burgundy uppercase tracking-[0.25em]">№ {String(inv.number).padStart(2, '0')}</span>
          <Badge status={inv.status} />
        </div>
        <h1 className="editorial-title text-3xl md:text-4xl text-ink">{inv.title}</h1>
        <p className="text-ink-secondary mt-2 underline decoration-divider underline-offset-4">{inv.researchQuestion}</p>
      </div>

      {/* Status controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-xs font-mono text-ink-secondary uppercase tracking-wider">Status:</label>
        <select
          className="field-input max-w-[180px]"
          value={inv.status}
          onChange={e => update({ status: e.target.value as InvestigationRecord['status'] })}
        >
          <option value="draft">Draft</option>
          <option value="inProgress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <span className="text-xs text-ink-secondary font-mono ml-auto">
          {inv.analyses.length} saved analyses · Updated {new Date(inv.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex gap-1 border-b border-divider mb-6 overflow-x-auto no-print">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
              tab === t.id ? 'text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {t.icon}
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-burgundy" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab inv={inv} update={update} datasets={datasets} />}
      {tab === 'hypothesis' && <HypothesisTab inv={inv} update={update} />}
      {tab === 'evidence' && (
        <EvidenceLab
          datasets={datasets}
          selectedDatasetId={inv.datasetId}
          onSaveResult={(result: AnalysisResultRecord) => {
            update({ analyses: [...inv.analyses, result], status: inv.status === 'draft' ? 'inProgress' : inv.status });
          }}
        />
      )}
      {tab === 'challenge' && <ChallengeTab inv={inv} update={update} dataset={dataset} />}
      {tab === 'notebook' && <NotebookTab inv={inv} update={update} />}
      {tab === 'conclusion' && <ConclusionTab inv={inv} update={update} />}
      {tab === 'report' && <ReportTab inv={inv} dataset={dataset} />}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────
function OverviewTab({ inv, update, datasets }: { inv: InvestigationRecord; update: (c: Partial<InvestigationRecord>) => void; datasets: DatasetRecord[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Panel className="p-6">
        <div className="section-label mb-4">Investigation Details</div>
        <div className="space-y-4">
          <div>
            <label className="field-label">Title</label>
            <input className="field-input" value={inv.title} onChange={e => update({ title: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Research Question</label>
            <textarea className="field-input min-h-[80px]" value={inv.researchQuestion} onChange={e => update({ researchQuestion: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Background</label>
            <textarea className="field-input min-h-[100px]" value={inv.background} onChange={e => update({ background: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Reason for Investigating</label>
            <textarea className="field-input min-h-[60px]" value={inv.reason} onChange={e => update({ reason: e.target.value })} />
          </div>
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel className="p-6">
          <div className="section-label mb-4">Dataset Selection</div>
          <select className="field-input" value={inv.datasetId || ''} onChange={e => update({ datasetId: e.target.value })}>
            <option value="">— Select a dataset —</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}{d.builtIn ? ' (built-in)' : ''}</option>)}
          </select>
          {inv.datasetId && (
            <div className="mt-4 text-sm text-ink-secondary">
              {(() => {
                const ds = datasets.find(d => d.id === inv.datasetId);
                return ds ? (
                  <div>
                    <p>{ds.description}</p>
                    <div className="mt-2 font-mono text-xs text-ink-secondary">
                      {ds.rows.length} observations · {ds.columns.length} variables
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </Panel>

        <Panel className="p-6">
          <div className="section-label mb-4">Relevant Variables</div>
          <input
            className="field-input"
            placeholder="Comma-separated variable names"
            value={inv.relevantVariables.join(', ')}
            onChange={e => update({ relevantVariables: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          />
          <div className="mt-4">
            <label className="field-label">Expected Relationship</label>
            <input className="field-input" value={inv.expectedRelationship || ''} onChange={e => update({ expectedRelationship: e.target.value })} />
          </div>
        </Panel>

        {inv.analyses.length > 0 && (
          <Panel className="p-6">
            <div className="section-label mb-4">Saved Analyses ({inv.analyses.length})</div>
            <div className="space-y-2">
              {inv.analyses.map((a, i) => (
                <div key={a.id} className="text-sm border-b border-divider/40 pb-2 last:border-0">
                  <div className="font-mono text-xs text-burgundy">{i + 1}. {a.config.method}</div>
                  <div className="text-ink">{a.resultSummary}</div>
                  <div className="text-xs text-ink-secondary font-mono">{new Date(a.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

// ── Hypothesis Tab ────────────────────────────────────────────────────────
function HypothesisTab({ inv, update }: { inv: InvestigationRecord; update: (c: Partial<InvestigationRecord>) => void }) {
  const h = inv.hypothesis || {};
  const setH = (changes: Partial<HypothesisRecord>) => update({ hypothesis: { ...h, ...changes } });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Panel className="p-6">
        <div className="section-label mb-4">Analysis Type</div>
        <div className="flex gap-2 mb-6">
          <button
            className={`px-3 py-2 text-sm border ${h.analysisType === 'confirmatory' ? 'border-ink bg-ink text-paper' : 'border-divider text-ink-secondary'}`}
            onClick={() => setH({ analysisType: 'confirmatory' })}
          >Confirmatory</button>
          <button
            className={`px-3 py-2 text-sm border ${h.analysisType === 'exploratory' ? 'border-ink bg-ink text-paper' : 'border-divider text-ink-secondary'}`}
            onClick={() => setH({ analysisType: 'exploratory' })}
          >Exploratory</button>
        </div>

        {h.analysisType === 'confirmatory' ? (
          <div className="space-y-4">
            <div>
              <label className="field-label">Null Hypothesis (H₀)</label>
              <textarea className="field-input min-h-[60px]" placeholder="e.g., There is no association between study time and assessment scores."
                value={h.null || ''} onChange={e => setH({ null: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Alternative Hypothesis (H₁)</label>
              <textarea className="field-input min-h-[60px]" placeholder="e.g., There is a positive association between study time and assessment scores."
                value={h.alternative || ''} onChange={e => setH({ alternative: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Expected Direction</label>
              <select className="field-input" value={h.expectedDirection || 'unknown'} onChange={e => setH({ expectedDirection: e.target.value as HypothesisRecord['expectedDirection'] })}>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="none">No direction</option>
                <option value="unknown">Unknown / Not specified</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="text-sm text-ink-secondary bg-archive p-4 border border-divider">
            <p className="mb-2">Exploratory analysis does not require a formal null hypothesis.</p>
            <p>Record your expectations and planned approach below. Exploratory findings should be interpreted with caution — they suggest patterns, not confirmed effects.</p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className="field-label">Population / Sample</label>
            <input className="field-input" placeholder="e.g., 80 synthetic student observations"
              value={h.population || ''} onChange={e => setH({ population: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Planned Analytical Method</label>
            <input className="field-input" placeholder="e.g., Pearson correlation, linear regression"
              value={h.plannedMethod || ''} onChange={e => setH({ plannedMethod: e.target.value })} />
          </div>
        </div>
      </Panel>

      <Panel className="p-6">
        <div className="section-label mb-4">Assumptions</div>
        <p className="text-sm text-ink-secondary mb-4">List the assumptions required by your chosen method. Understanding assumptions is critical — violating them can produce misleading results.</p>
        <textarea
          className="field-input min-h-[200px]"
          placeholder="e.g.,&#10;- Observations are independent&#10;- The relationship is approximately linear&#10;- No extreme outliers&#10;- The sample is representative"
          value={(h.assumptions || []).join('\n')}
          onChange={e => setH({ assumptions: e.target.value.split('\n').filter(Boolean) })}
        />
        <div className="mt-4 text-xs text-ink-secondary bg-highlight/10 border border-highlight/30 p-3">
          <strong>Note:</strong> Not every investigation requires a formal null-hypothesis significance test. Descriptive and exploratory analyses are valid approaches. The key is to define your expectations before examining the final result, to avoid post-hoc reasoning.
        </div>
      </Panel>
    </div>
  );
}

// ── Challenge Tab ─────────────────────────────────────────────────────────
function ChallengeTab({ inv, update, dataset }: { inv: InvestigationRecord; update: (c: Partial<InvestigationRecord>) => void; dataset?: DatasetRecord }) {
  const prompts = [
    'Is the result driven by one outlier?',
    'Does the relationship remain when the sample is split by group?',
    'Are missing observations affecting the result?',
    'Is the sample too small to support a confident conclusion?',
    'Could a third variable (confounder) explain the observed association?',
    'Would a different correlation method (Pearson vs Spearman) change the interpretation?',
    'Does the conclusion depend on a specific threshold or grouping?',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Panel className="p-6">
        <div className="section-label mb-4">Challenge Your Conclusion</div>
        <p className="text-sm text-ink-secondary mb-4">
          A conclusion is stronger if it survives reasonable challenges. Consider these questions about your analysis:
        </p>
        <ul className="space-y-2">
          {prompts.map((p, i) => (
            <li key={i} className="text-sm text-ink flex gap-2 items-start">
              <span className="text-burgundy font-mono text-xs mt-0.5">?</span>
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <label className="field-label">Challenge Notes</label>
          <textarea
            className="field-input min-h-[200px]"
            placeholder="Document which challenges you explored, what you found, and whether the conclusion changed..."
            value={inv.challengeNotes}
            onChange={e => update({ challengeNotes: e.target.value })}
          />
        </div>
      </Panel>

      <Panel className="p-6">
        <div className="section-label mb-4">Sensitivity Checks</div>
        <p className="text-sm text-ink-secondary mb-4">
          Visit the Counterexample Studio to actively test how outlier exclusion, subgroup analysis, and analytical alternatives affect your result.
        </p>
        {dataset && (
          <div className="bg-archive border border-divider p-4">
            <div className="text-xs font-mono text-ink-secondary mb-2">Current dataset: {dataset.name}</div>
            <div className="text-xs text-ink-secondary">
              The Counterexample Studio creates a modified copy of this dataset — the original data is never changed.
            </div>
          </div>
        )}
        {inv.analyses.length > 0 && (
          <div className="mt-4">
            <div className="section-label mb-2">Saved Analyses to Compare</div>
            <div className="space-y-1">
              {inv.analyses.map((a, i) => (
                <div key={a.id} className="text-xs font-mono text-ink-secondary border-b border-divider/40 py-1">
                  {i + 1}. {a.resultSummary}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── Notebook Tab ──────────────────────────────────────────────────────────
function NotebookTab({ inv, update }: { inv: InvestigationRecord; update: (c: Partial<InvestigationRecord>) => void }) {
  const sections = ['Research Question', 'Hypothesis', 'Evidence', 'Method', 'Results', 'Challenge', 'Limitations', 'Conclusion', 'Next Steps'];

  const getSectionBody = (heading: string): string => {
    const entry = inv.notebook.find(n => n.heading === heading);
    return entry?.body || '';
  };

  const setSectionBody = (heading: string, body: string) => {
    const existing = inv.notebook.find(n => n.heading === heading);
    let notebook;
    if (existing) {
      notebook = inv.notebook.map(n => n.heading === heading ? { ...n, body, updatedAt: Date.now() } : n);
    } else {
      notebook = [...inv.notebook, { id: genId('nb-'), heading, body, updatedAt: Date.now() }];
    }
    update({ notebook });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h3 className="editorial-title text-xl text-ink mb-2">Research Notebook</h3>
        <p className="text-sm text-ink-secondary">Each section connects to your investigation. Notes are saved automatically.</p>
      </div>
      <div className="space-y-6">
        {sections.map(heading => (
          <Panel key={heading} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs text-burgundy uppercase tracking-wider">{sections.indexOf(heading) + 1}</span>
              <h4 className="editorial-title text-lg text-ink">{heading}</h4>
            </div>
            <textarea
              className="field-input min-h-[100px] font-serif text-sm"
              placeholder={`Record your ${heading.toLowerCase()}...`}
              value={getSectionBody(heading)}
              onChange={e => setSectionBody(heading, e.target.value)}
            />
          </Panel>
        ))}
      </div>
    </div>
  );
}

// ── Conclusion Tab ────────────────────────────────────────────────────────
function ConclusionTab({ inv, update }: { inv: InvestigationRecord; update: (c: Partial<InvestigationRecord>) => void }) {
  const c = inv.conclusion;
  const setC = (changes: Partial<ConclusionRecord>) => update({ conclusion: { ...c, ...changes } });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h3 className="editorial-title text-xl text-ink mb-2">Conclusion</h3>
        <p className="text-sm text-ink-secondary">Record what the evidence supports, what it does not establish, and what remains uncertain.</p>
      </div>

      <div className="space-y-6">
        <Panel className="p-6">
          <label className="field-label">What the evidence suggests</label>
          <textarea className="field-input min-h-[100px]" value={c.evidenceSuggests} onChange={e => setC({ evidenceSuggests: e.target.value })} />
        </Panel>

        <Panel className="p-6">
          <label className="field-label">What the evidence does NOT establish</label>
          <textarea className="field-input min-h-[100px]" value={c.doesNotEstablish} onChange={e => setC({ doesNotEstablish: e.target.value })} />
        </Panel>

        <Panel className="p-6">
          <label className="field-label">Hypothesis Assessment</label>
          <select className="field-input" value={c.hypothesisSupported} onChange={e => setC({ hypothesisSupported: e.target.value as ConclusionRecord['hypothesisSupported'] })}>
            <option value="notAssessed">Not assessed</option>
            <option value="supported">Supported under the selected method</option>
            <option value="notSupported">Not supported by the available evidence</option>
            <option value="inconclusive">Inconclusive</option>
            <option value="requiresFurther">Requires further investigation</option>
          </select>
          <div className="mt-3">
            <Badge status={c.hypothesisSupported} />
          </div>
        </Panel>

        <Panel className="p-6">
          <label className="field-label">Limitations (one per line)</label>
          <textarea className="field-input min-h-[100px]" value={c.limitations.join('\n')} onChange={e => setC({ limitations: e.target.value.split('\n').filter(Boolean) })} />
        </Panel>

        <Panel className="p-6">
          <label className="field-label">Alternative Explanations (one per line)</label>
          <textarea className="field-input min-h-[80px]" value={c.alternativeExplanations.join('\n')} onChange={e => setC({ alternativeExplanations: e.target.value.split('\n').filter(Boolean) })} />
        </Panel>

        <Panel className="p-6">
          <label className="field-label">What evidence would help next?</label>
          <textarea className="field-input min-h-[80px]" value={c.nextSteps} onChange={e => setC({ nextSteps: e.target.value })} />
        </Panel>
      </div>
    </div>
  );
}

// ── Report Tab ────────────────────────────────────────────────────────────
function ReportTab({ inv, dataset }: { inv: InvestigationRecord; dataset?: DatasetRecord }) {
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(inv, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investigation-${inv.number}-${inv.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!dataset) return;
    const csv = csvFromRows(dataset.rows, dataset.columns.map(c => c.name));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-${dataset.name.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap gap-3 mb-6 no-print">
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2"><Printer size={16} /> Print / Save as PDF</button>
        <button onClick={exportJSON} className="btn-secondary flex items-center gap-2"><Download size={16} /> Export JSON</button>
        {dataset && <button onClick={exportCSV} className="btn-secondary flex items-center gap-2"><Download size={16} /> Export Dataset CSV</button>}
      </div>

      <Panel className="p-8 md:p-12">
        {/* Report header */}
        <div className="border-b-2 border-ink pb-4 mb-6">
          <div className="font-mono text-xs text-burgundy uppercase tracking-[0.25em] mb-2">Investigation № {String(inv.number).padStart(2, '0')}</div>
          <h1 className="editorial-title text-3xl text-ink mb-2">{inv.title}</h1>
          <p className="text-ink-secondary">Hypothesis Zero — Research Report</p>
          <p className="font-mono text-xs text-ink-secondary mt-2">{new Date(inv.updatedAt).toLocaleDateString()}</p>
        </div>

        {/* Research question */}
        <ReportSection title="Research Question">
          <p className="font-serif text-lg">{inv.researchQuestion}</p>
        </ReportSection>

        {/* Background */}
        {inv.background && <ReportSection title="Background">
          <p>{inv.background}</p>
        </ReportSection>}

        {/* Hypothesis */}
        {inv.hypothesis && (inv.hypothesis.null || inv.hypothesis.alternative) && (
          <ReportSection title="Hypothesis">
            {inv.hypothesis.analysisType && <p className="text-sm text-ink-secondary mb-2">Analysis type: {inv.hypothesis.analysisType}</p>}
            {inv.hypothesis.null && <p><strong>H₀:</strong> {inv.hypothesis.null}</p>}
            {inv.hypothesis.alternative && <p><strong>H₁:</strong> {inv.hypothesis.alternative}</p>}
            {inv.hypothesis.assumptions && inv.hypothesis.assumptions.length > 0 && (
              <div className="mt-3">
                <strong>Assumptions:</strong>
                <ul className="list-disc ml-6 mt-1">
                  {inv.hypothesis.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </ReportSection>
        )}

        {/* Dataset */}
        {dataset && <ReportSection title="Dataset">
          <p><strong>{dataset.name}</strong> — {dataset.description}</p>
          <p className="font-mono text-xs mt-2">{dataset.rows.length} observations · {dataset.columns.length} variables · {dataset.source}</p>
          {dataset.generationMethod && <p className="text-sm text-ink-secondary mt-2"><strong>Generation:</strong> {dataset.generationMethod}</p>}
        </ReportSection>}

        {/* Results */}
        {inv.analyses.length > 0 && <ReportSection title="Statistical Results">
          <div className="space-y-3">
            {inv.analyses.map((a, i) => (
              <div key={a.id} className="border-l-2 border-research-blue pl-4">
                <div className="font-mono text-xs text-research-blue uppercase tracking-wider">Analysis {i + 1}: {a.config.method}</div>
                <p className="text-sm">{a.resultSummary}</p>
                {Object.keys(a.stats).length > 0 && (
                  <table className="text-xs font-mono mt-2">
                    <tbody>
                      {Object.entries(a.stats).map(([k, v]) => (
                        <tr key={k}><td className="text-ink-secondary pr-4">{k}</td><td>{typeof v === 'number' ? fmt(v) : v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {a.warnings.length > 0 && <div className="text-xs text-burgundy mt-1">⚠ {a.warnings.join('; ')}</div>}
              </div>
            ))}
          </div>
        </ReportSection>}

        {/* Challenge */}
        {inv.challengeNotes && <ReportSection title="Challenge">
          <p className="text-sm whitespace-pre-wrap">{inv.challengeNotes}</p>
        </ReportSection>}

        {/* Limitations */}
        {inv.conclusion.limitations.length > 0 && <ReportSection title="Limitations">
          <ul className="list-disc ml-6">
            {inv.conclusion.limitations.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </ReportSection>}

        {/* Conclusion */}
        {(inv.conclusion.evidenceSuggests || inv.conclusion.doesNotEstablish) && (
          <ReportSection title="Conclusion">
            <div className="mb-3"><Badge status={inv.conclusion.hypothesisSupported} /></div>
            {inv.conclusion.evidenceSuggests && <p><strong>Evidence suggests:</strong> {inv.conclusion.evidenceSuggests}</p>}
            {inv.conclusion.doesNotEstablish && <p className="mt-2"><strong>Does not establish:</strong> {inv.conclusion.doesNotEstablish}</p>}
            {inv.conclusion.alternativeExplanations.length > 0 && (
              <div className="mt-3">
                <strong>Alternative explanations:</strong>
                <ul className="list-disc ml-6">
                  {inv.conclusion.alternativeExplanations.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            {inv.conclusion.nextSteps && <p className="mt-3"><strong>Next steps:</strong> {inv.conclusion.nextSteps}</p>}
          </ReportSection>
        )}

        {/* Reproducibility */}
        <ReportSection title="Reprocibility">
          <table className="text-xs font-mono w-full">
            <tbody>
              <tr><td className="text-ink-secondary">Investigation ID</td><td>{inv.id}</td></tr>
              <tr><td className="text-ink-secondary">Created</td><td>{new Date(inv.createdAt).toISOString()}</td></tr>
              <tr><td className="text-ink-secondary">Last updated</td><td>{new Date(inv.updatedAt).toISOString()}</td></tr>
              {dataset && <tr><td className="text-ink-secondary">Dataset</td><td>{dataset.name} (v{dataset.version})</td></tr>}
              {dataset && <tr><td className="text-ink-secondary">Dataset hash</td><td>{datasetHash(dataset)}</td></tr>}
              {dataset && dataset.reproducibility && <tr><td className="text-ink-secondary">Seed</td><td>{dataset.reproducibility.seed}</td></tr>}
              <tr><td className="text-ink-secondary">Analyses saved</td><td>{inv.analyses.length}</td></tr>
            </tbody>
          </table>
        </ReportSection>

        <div className="border-t border-divider mt-8 pt-4 text-center">
          <p className="font-mono text-xs text-ink-secondary">
            Generated by Hypothesis Zero — Don't trust the answer. Test the evidence.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="editorial-title text-xl text-ink border-b border-divider pb-1 mb-3">{title}</h2>
      <div className="text-sm text-ink space-y-2">{children}</div>
    </div>
  );
}
