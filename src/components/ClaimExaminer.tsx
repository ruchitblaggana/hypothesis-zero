// Claim Examiner — examine statements against evidence

import { useState, useMemo, useEffect } from 'react';
import type { DatasetRecord, ClaimRecord, EvidenceStatus, AnalysisConfig } from '@/lib/types';
import { pearsonCorrelation, spearmanCorrelation, linearRegression, groupComparison, contingencyTable, fmt, fmtP, extractNumeric } from '@/lib/stats';
import { SectionHeader, Panel, Badge, WarningBox, EmptyState, ConfirmDialog } from '@/components/ui';
import { genId, saveClaim, deleteClaim } from '@/lib/storage';
import { Search, Scale, Plus, Trash2, Save } from 'lucide-react';

interface ClaimExaminerProps {
  datasets: DatasetRecord[];
  claims: ClaimRecord[];
  onClaimsChanged: () => void;
}

export function ClaimExaminer({ datasets, claims, onClaimsChanged }: ClaimExaminerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(claims[0]?.id || null);
  const [mode, setMode] = useState<'list' | 'editor'>(claims.length === 0 ? 'editor' : 'list');

  const selected = claims.find(c => c.id === selectedId);

  useEffect(() => {
    if (claims.length > 0 && !selectedId) setSelectedId(claims[0].id);
  }, [claims, selectedId]);

  if (mode === 'editor' || (mode === 'list' && !selected && claims.length === 0)) {
    return <ClaimEditor datasets={datasets} onSaved={(c) => { saveClaim(c).then(onClaimsChanged); setMode('list'); setSelectedId(c.id); }} onCancel={() => setMode('list')} />;
  }

  if (mode === 'list' && selected) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <SectionHeader number="C" title="Claim Examiner" subtitle="Examine whether the available evidence supports a specific statement." />
          <button onClick={() => setMode('editor')} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Claim</button>
        </div>

        {/* Claims list */}
        {claims.length > 1 && (
          <div className="mb-6 space-y-0">
            {claims.map(c => (
              <div key={c.id}
                className={`border-b border-divider py-4 cursor-pointer transition-colors -mx-4 px-4 ${selectedId === c.id ? 'bg-highlight/10' : 'hover:bg-highlight/5'}`}
                onClick={() => setSelectedId(c.id)}>
                <div className="flex items-center gap-3">
                  <Badge status={c.evidenceStatus} />
                  <span className="text-sm text-ink flex-1 truncate">{c.claim}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Claim detail */}
        <ClaimDetail claim={selected} datasets={datasets} onDelete={() => { deleteClaim(selected.id).then(onClaimsChanged); setSelectedId(null); }} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader number="C" title="Claim Examiner" subtitle="Examine whether the available evidence supports a specific statement." />
      <div className="flex justify-end mb-4">
        <button onClick={() => setMode('editor')} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Claim</button>
      </div>
      <EmptyState
        icon={<Scale size={48} />}
        title="No claims examined yet"
        message="Enter a statement to investigate whether the available evidence supports it. The system uses deterministic rules and actual analytical results — no AI verdicts."
        action={<button onClick={() => setMode('editor')} className="btn-primary flex items-center gap-2"><Plus size={16} /> Examine a Claim</button>}
      />
    </div>
  );
}

// ── Claim Editor ──────────────────────────────────────────────────────────
function ClaimEditor({ datasets, onSaved, onCancel }: { datasets: DatasetRecord[]; onSaved: (c: ClaimRecord) => void; onCancel: () => void }) {
  const [claim, setClaim] = useState('');
  const [datasetId, setDatasetId] = useState(datasets[0]?.id || '');
  const [method, setMethod] = useState<AnalysisConfig['method']>('correlation');
  const [primaryVar, setPrimaryVar] = useState('');
  const [secondaryVar, setSecondaryVar] = useState('');
  const [correlationType, setCorrelationType] = useState<'pearson' | 'spearman'>('pearson');
  const [reasoning, setReasoning] = useState('');
  const [limitations, setLimitations] = useState('');
  const [counterevidence, setCounterevidence] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [status, setStatus] = useState<EvidenceStatus>('notAssessed');

  const dataset = datasets.find(d => d.id === datasetId);
  const numericCols = dataset?.columns.filter(c => c.type === 'numeric') || [];

  useEffect(() => {
    if (numericCols.length >= 2) {
      setPrimaryVar(numericCols[0].name);
      setSecondaryVar(numericCols[1].name);
    }
  }, [datasetId]);

  // Auto-assess based on method
  const assessment = useMemo(() => {
    if (!dataset || !claim) return null;
    return assessClaim(claim, dataset, { method, primaryVar, secondaryVar, correlationType });
  }, [claim, dataset, method, primaryVar, secondaryVar, correlationType]);

  useEffect(() => {
    if (assessment) {
      setStatus(assessment.status);
      if (!reasoning) setReasoning(assessment.reasoning);
      if (!limitations) setLimitations(assessment.limitations.join('\n'));
    }
  }, [assessment]);

  const handleSave = () => {
    const record: ClaimRecord = {
      id: genId('claim-'),
      claim,
      datasetId,
      variables: [primaryVar, secondaryVar].filter(Boolean),
      method,
      config: { method, primaryVar, secondaryVar, correlationType },
      evidenceStatus: status,
      reasoning,
      limitations: limitations.split('\n').filter(Boolean),
      counterevidence,
      interpretation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaved(record);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader number="C" title="Examine a Claim" subtitle="Enter a statement, select evidence, and determine whether the data supports it." />

      <div className="space-y-6">
        <Panel className="p-6">
          <label className="field-label">Claim Statement</label>
          <textarea
            className="field-input min-h-[80px] font-serif text-base"
            placeholder='e.g., "Students who spend more time studying always achieve higher scores."'
            value={claim}
            onChange={e => setClaim(e.target.value)}
          />
          <div className="mt-3 text-xs text-ink-secondary bg-highlight/10 border border-highlight/30 p-3">
            <strong>Tip:</strong> Pay attention to absolute words like "always", "never", "proves". A dataset showing an average association cannot establish that something happens "always."
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Dataset</label>
              <select className="field-input" value={datasetId} onChange={e => setDatasetId(e.target.value)}>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Analytical Method</label>
              <select className="field-input" value={method} onChange={e => setMethod(e.target.value as AnalysisConfig['method'])}>
                <option value="correlation">Correlation</option>
                <option value="regression">Linear Regression</option>
                <option value="groupComparison">Group Comparison</option>
                <option value="contingency">Contingency Table</option>
              </select>
            </div>
          </div>

          {dataset && (method === 'correlation' || method === 'regression') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="field-label">Variable X</label>
                <select className="field-input" value={primaryVar} onChange={e => setPrimaryVar(e.target.value)}>
                  {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Variable Y</label>
                <select className="field-input" value={secondaryVar} onChange={e => setSecondaryVar(e.target.value)}>
                  {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              {method === 'correlation' && (
                <div className="md:col-span-2">
                  <label className="field-label">Correlation Type</label>
                  <select className="field-input max-w-xs" value={correlationType} onChange={e => setCorrelationType(e.target.value as 'pearson' | 'spearman')}>
                    <option value="pearson">Pearson (linear)</option>
                    <option value="spearman">Spearman (monotonic)</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </Panel>

        {assessment && (
          <Panel className="p-6">
            <div className="section-label mb-3">Automated Evidence Assessment</div>
            <div className="flex items-center gap-3 mb-4">
              <Badge status={assessment.status} />
              <span className="text-xs text-ink-secondary font-mono">Based on deterministic rules and actual calculations</span>
            </div>
            <div className="bg-archive border border-divider p-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {Object.entries(assessment.stats).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs text-ink-secondary font-mono">{k}</div>
                    <div className="font-mono text-ink">{typeof v === 'number' ? fmt(v) : v}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-ink">{assessment.reasoning}</p>
            </div>
            <WarningBox warnings={assessment.warnings} />
          </Panel>
        )}

        <Panel className="p-6">
          <label className="field-label">Evidence Status</label>
          <select className="field-input max-w-xs" value={status} onChange={e => setStatus(e.target.value as EvidenceStatus)}>
            <option value="supported">Evidence consistent with the claim</option>
            <option value="notSupported">Evidence inconsistent with the claim</option>
            <option value="inconclusive">Inconclusive</option>
            <option value="requiresFurther">Requires further investigation</option>
            <option value="notAssessed">Not assessed</option>
          </select>

          <div className="mt-4">
            <label className="field-label">Reasoning</label>
            <textarea className="field-input min-h-[100px]" value={reasoning} onChange={e => setReasoning(e.target.value)} placeholder="Explain the basis for this assessment..." />
          </div>

          <div className="mt-4">
            <label className="field-label">Limitations (one per line)</label>
            <textarea className="field-input min-h-[60px]" value={limitations} onChange={e => setLimitations(e.target.value)} />
          </div>

          <div className="mt-4">
            <label className="field-label">Counterevidence</label>
            <textarea className="field-input min-h-[60px]" value={counterevidence} onChange={e => setCounterevidence(e.target.value)} placeholder="What evidence goes against this claim?" />
          </div>

          <div className="mt-4">
            <label className="field-label">Final Interpretation</label>
            <textarea className="field-input min-h-[80px]" value={interpretation} onChange={e => setInterpretation(e.target.value)} placeholder="Your final interpretation with appropriate caution..." />
          </div>
        </Panel>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save size={16} /> Save Assessment</button>
        </div>
      </div>
    </div>
  );
}

// ── Claim Assessment Logic ────────────────────────────────────────────────
function assessClaim(
  claim: string,
  dataset: DatasetRecord,
  config: { method: string; primaryVar: string; secondaryVar: string; correlationType: 'pearson' | 'spearman' }
): { status: EvidenceStatus; reasoning: string; limitations: string[]; warnings: string[]; stats: Record<string, number | string> } {
  const warnings: string[] = [];
  const limitations: string[] = [];
  const stats: Record<string, number | string> = {};

  const hasAbsolute = /\b(always|never|proves|guaranteed|certain|definitely|every|all|none|impossible)\b/i.test(claim);
  const hasCausal = /\b(causes?|leads to|results in|due to|because of|effect of|impact of)\b/i.test(claim);

  let result: any = null;
  let methodLabel = '';

  if (config.method === 'correlation') {
    result = config.correlationType === 'pearson'
      ? pearsonCorrelation(dataset.rows, config.primaryVar, config.secondaryVar)
      : spearmanCorrelation(dataset.rows, config.primaryVar, config.secondaryVar);
    methodLabel = config.correlationType === 'pearson' ? 'Pearson correlation' : 'Spearman correlation';
    stats.coefficient = result.coefficient;
    stats.n = result.n;
    stats.pValue = result.pValue;
  } else if (config.method === 'regression') {
    result = linearRegression(dataset.rows, config.primaryVar, config.secondaryVar);
    methodLabel = 'linear regression';
    stats.slope = result.slope;
    stats.rSquared = result.rSquared;
    stats.pValue = result.pValueSlope;
  }

  warnings.push(...(result?.warnings || []));

  let status: EvidenceStatus = 'notAssessed';
  let reasoning = '';

  if (!result || isNaN(result.coefficient ?? result.slope)) {
    status = 'inconclusive';
    reasoning = `The ${methodLabel} could not be computed with the selected variables. The evidence is inconclusive.`;
  } else if (hasAbsolute) {
    status = 'notSupported';
    const absWord = claim.match(/\b(always|never|proves|guaranteed|certain|definitely|every|all|none|impossible)\b/i)?.[0] || 'absolute';
    reasoning = `The claim uses the word "${absWord}", which requires the relationship to hold without exception. The ${methodLabel} shows an average association (r = ${fmt(result.coefficient ?? 0)}), not a universal rule. Even a strong correlation does not mean the relationship holds in every case. Claims with absolute language are generally not supported by statistical association alone.`;
    limitations.push('Absolute claims cannot be established by correlation or regression alone');
    limitations.push('Individual variation means exceptions exist even in strong associations');
  } else if (hasCausal) {
    status = 'requiresFurther';
    reasoning = `The claim implies a causal relationship. The ${methodLabel} shows an association (r = ${fmt(result.coefficient ?? result.slope ?? 0)}), but association is not causation. A third variable (confounder) could explain the observed relationship, or the direction could be reversed. Further investigation with controlled experiments or causal inference methods is needed.`;
    limitations.push('Observational data cannot establish causation');
    limitations.push('Confounding variables have not been controlled');
  } else {
    const coef = result.coefficient ?? result.slope;
    const absCoef = Math.abs(coef);
    if (absCoef > 0.5 && !isNaN(result.pValue) && result.pValue < 0.05) {
      status = 'supported';
      reasoning = `The ${methodLabel} shows a ${absCoef > 0.7 ? 'strong' : 'moderate'} ${coef > 0 ? 'positive' : 'negative'} association (coefficient = ${fmt(coef)}, p = ${fmtP(result.pValue)}). The evidence is consistent with the claim, though this does not prove the claim is universally true.`;
    } else if (absCoef < 0.2 || (result.pValue !== undefined && result.pValue > 0.05)) {
      status = 'notSupported';
      reasoning = `The ${methodLabel} shows a weak or non-significant association (coefficient = ${fmt(coef)}, p = ${fmtP(result.pValue)}). The available evidence does not support the claim.`;
    } else {
      status = 'inconclusive';
      reasoning = `The ${methodLabel} shows a moderate association (coefficient = ${fmt(coef)}), but the evidence is not strong enough to clearly support or refute the claim. The result may be sensitive to analytical choices.`;
    }
    limitations.push('This assessment is based on a single statistical method');
    limitations.push('The result depends on the selected variables and dataset');
  }

  if (result?.n && result.n < 30) {
    limitations.push(`Small sample size (${result.n} observations) limits confidence`);
  }

  return { status, reasoning, limitations, warnings, stats };
}

// ── Claim Detail ──────────────────────────────────────────────────────────
function ClaimDetail({ claim, datasets, onDelete }: { claim: ClaimRecord; datasets: DatasetRecord[]; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dataset = datasets.find(d => d.id === claim.datasetId);

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="section-label mb-2">Claim Under Examination</div>
            <p className="font-serif text-lg text-ink italic">"{claim.claim}"</p>
          </div>
          <Badge status={claim.evidenceStatus} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 archive-divider pt-4">
          {dataset && <div><div className="section-label">Dataset</div><div className="text-sm text-ink">{dataset.name}</div></div>}
          {claim.method && <div><div className="section-label">Method</div><div className="text-sm text-ink font-mono">{claim.method}</div></div>}
          {claim.variables.length > 0 && <div><div className="section-label">Variables</div><div className="text-sm text-ink font-mono">{claim.variables.join(', ')}</div></div>}
          <div><div className="section-label">Assessed</div><div className="text-sm text-ink">{new Date(claim.updatedAt).toLocaleDateString()}</div></div>
        </div>
      </Panel>

      {claim.reasoning && (
        <Panel className="p-6">
          <div className="section-label mb-3">Reasoning</div>
          <p className="text-sm text-ink whitespace-pre-wrap">{claim.reasoning}</p>
        </Panel>
      )}

      {claim.limitations.length > 0 && (
        <Panel className="p-6">
          <div className="section-label mb-3">Limitations</div>
          <ul className="space-y-1">
            {claim.limitations.map((l, i) => <li key={i} className="text-sm text-ink flex gap-2"><span className="text-burgundy">—</span>{l}</li>)}
          </ul>
        </Panel>
      )}

      {claim.counterevidence && (
        <Panel className="p-6 border-l-2 border-burgundy">
          <div className="section-label mb-3 text-burgundy">Counterevidence</div>
          <p className="text-sm text-ink whitespace-pre-wrap">{claim.counterevidence}</p>
        </Panel>
      )}

      {claim.interpretation && (
        <Panel className="p-6 border-l-2 border-evidence-green">
          <div className="section-label mb-3 text-evidence-green">Final Interpretation</div>
          <p className="text-sm text-ink whitespace-pre-wrap">{claim.interpretation}</p>
        </Panel>
      )}

      <div className="flex justify-end">
        <button onClick={() => setConfirmDelete(true)} className="btn-ghost flex items-center gap-2 text-burgundy hover:bg-burgundy/10">
          <Trash2 size={16} /> Delete Claim
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this claim?"
        message="This will permanently remove the claim assessment."
        onConfirm={() => { setConfirmDelete(false); onDelete(); }}
        onCancel={() => setConfirmDelete(false)}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
