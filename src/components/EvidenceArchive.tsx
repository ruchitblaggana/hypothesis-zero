// Evidence Archive — searchable collection of investigations, datasets, and reports

import { useState, useMemo } from 'react';
import type { InvestigationRecord, DatasetRecord, ClaimRecord } from '@/lib/types';
import { SectionHeader, Panel, Badge, EmptyState } from '@/components/ui';
import { Search, FolderOpen, Database, FileText, Trash2 } from 'lucide-react';

interface ArchiveProps {
  investigations: InvestigationRecord[];
  datasets: DatasetRecord[];
  claims: ClaimRecord[];
  onOpenInvestigation: (id: string) => void;
  onDeleteInvestigation: (id: string) => void;
  onDeleteDataset: (id: string) => void;
}

export function EvidenceArchive({ investigations, datasets, claims, onOpenInvestigation, onDeleteInvestigation, onDeleteDataset }: ArchiveProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'investigations' | 'datasets' | 'claims'>('all');

  const filteredInvestigations = useMemo(() => {
    if (filter !== 'all' && filter !== 'investigations') return [];
    if (!search) return investigations;
    const s = search.toLowerCase();
    return investigations.filter(i =>
      i.title.toLowerCase().includes(s) ||
      i.researchQuestion.toLowerCase().includes(s) ||
      i.background.toLowerCase().includes(s)
    );
  }, [investigations, search, filter]);

  const filteredDatasets = useMemo(() => {
    if (filter !== 'all' && filter !== 'datasets') return [];
    if (!search) return datasets;
    const s = search.toLowerCase();
    return datasets.filter(d => d.name.toLowerCase().includes(s) || d.description.toLowerCase().includes(s));
  }, [datasets, search, filter]);

  const filteredClaims = useMemo(() => {
    if (filter !== 'all' && filter !== 'claims') return [];
    if (!search) return claims;
    const s = search.toLowerCase();
    return claims.filter(c => c.claim.toLowerCase().includes(s));
  }, [claims, search, filter]);

  const hasContent = filteredInvestigations.length > 0 || filteredDatasets.length > 0 || filteredClaims.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader number="F" title="Evidence Archive" subtitle="A searchable collection of investigations, datasets, and claim assessments. Reopen and reproduce previous analyses." />

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search the archive..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="field-input flex-1"
        />
        <div className="flex gap-1">
          {(['all', 'investigations', 'datasets', 'claims'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${filter === f ? 'bg-ink text-paper' : 'border border-divider text-ink-secondary hover:text-ink'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {!hasContent ? (
        <EmptyState icon={<FolderOpen size={48} />} title="Archive is empty" message="Investigations, datasets, and claim assessments will appear here once created." />
      ) : (
        <div className="space-y-8">
          {/* Investigations */}
          {filteredInvestigations.length > 0 && (
            <div>
              <div className="section-label mb-3 flex items-center gap-2"><FileText size={14} /> Investigations ({filteredInvestigations.length})</div>
              <div className="space-y-0">
                {filteredInvestigations.map(inv => (
                  <div key={inv.id} className="border-b border-divider py-4 flex items-center gap-4 cursor-pointer hover:bg-highlight/5 -mx-4 px-4"
                    onClick={() => onOpenInvestigation(inv.id)}>
                    <span className="font-mono text-xs text-burgundy">№ {String(inv.number).padStart(2, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink truncate">{inv.title}</div>
                      <div className="text-xs text-ink-secondary truncate">{inv.researchQuestion}</div>
                    </div>
                    <Badge status={inv.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datasets */}
          {filteredDatasets.length > 0 && (
            <div>
              <div className="section-label mb-3 flex items-center gap-2"><Database size={14} /> Datasets ({filteredDatasets.length})</div>
              <div className="space-y-0">
                {filteredDatasets.map(ds => (
                  <div key={ds.id} className="border-b border-divider py-4 flex items-center gap-4 -mx-4 px-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink truncate">{ds.name}</div>
                      <div className="text-xs text-ink-secondary truncate">{ds.rows.length} rows · {ds.columns.length} variables · {ds.source}</div>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 border ${ds.builtIn ? 'border-divider text-ink-secondary' : 'border-evidence-green/30 text-evidence-green'}`}>
                      {ds.builtIn ? 'built-in' : 'user'}
                    </span>
                    {!ds.builtIn && (
                      <button onClick={() => onDeleteDataset(ds.id)} className="text-ink-secondary hover:text-burgundy p-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claims */}
          {filteredClaims.length > 0 && (
            <div>
              <div className="section-label mb-3 flex items-center gap-2"><FileText size={14} /> Claim Assessments ({filteredClaims.length})</div>
              <div className="space-y-0">
                {filteredClaims.map(c => (
                  <div key={c.id} className="border-b border-divider py-4 flex items-center gap-4 -mx-4 px-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink italic truncate">"{c.claim}"</div>
                    </div>
                    <Badge status={c.evidenceStatus} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
