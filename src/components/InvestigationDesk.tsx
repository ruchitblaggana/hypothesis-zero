// Investigation Desk — editorial index of investigations

import { useState, useMemo } from 'react';
import type { InvestigationRecord, DatasetRecord } from '@/lib/types';
import { SectionHeader, Panel, Badge, EmptyState, ConfirmDialog } from '@/components/ui';
import { Plus, FileText, Clock, AlertCircle, Archive } from 'lucide-react';

interface DeskProps {
  investigations: InvestigationRecord[];
  datasets: DatasetRecord[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function InvestigationDesk({ investigations, datasets, onOpen, onNew, onDelete }: DeskProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'number' | 'status'>('recent');

  const sorted = useMemo(() => {
    const items = [...investigations];
    if (sortBy === 'recent') items.sort((a, b) => b.lastActivity - a.lastActivity);
    else if (sortBy === 'number') items.sort((a, b) => a.number - b.number);
    else if (sortBy === 'status') {
      const order = { draft: 0, inProgress: 1, completed: 2, archived: 3 };
      items.sort((a, b) => order[a.status] - order[b.status]);
    }
    return items;
  }, [investigations, sortBy]);

  const getDataset = (id?: string) => datasets.find(d => d.id === id);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <SectionHeader number="A" title="Investigation Desk" subtitle="An editorial index of ongoing and completed research investigations. Create a new investigation or continue an existing one." />
        <button onClick={onNew} className="btn-primary flex items-center gap-2 self-start">
          <Plus size={16} /> New Investigation
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-ink-secondary font-mono">Sort by</span>
        {(['recent', 'number', 'status'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`text-xs px-2 py-1 font-mono uppercase tracking-wider transition-colors ${sortBy === s ? 'text-ink border-b border-burgundy' : 'text-ink-secondary hover:text-ink'}`}
          >
            {s === 'recent' ? 'Recent' : s === 'number' ? 'Number' : 'Status'}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="No investigations yet"
          message="Start your first investigation to begin examining evidence, formulating hypotheses, and drawing evidence-based conclusions."
          action={<button onClick={onNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Start Investigation</button>}
        />
      ) : (
        <div className="space-y-0">
          {sorted.map((inv, i) => {
            const ds = getDataset(inv.datasetId);
            const latestAnalysis = inv.analyses[inv.analyses.length - 1];
            return (
              <div
                key={inv.id}
                className="border-b border-divider py-6 cursor-pointer group hover:bg-highlight/5 transition-colors -mx-4 px-4"
                onClick={() => onOpen(inv.id)}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-8">
                  {/* Number */}
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-xs text-burgundy uppercase tracking-[0.2em]">№ {String(inv.number).padStart(2, '0')}</div>
                    <Badge status={inv.status} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="editorial-title text-xl text-ink group-hover:text-burgundy transition-colors">{inv.title}</h3>
                    <p className="text-sm text-ink-secondary mt-1 line-clamp-2">
                      <span className="underline decoration-divider underline-offset-2">{inv.researchQuestion}</span>
                    </p>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs font-mono text-ink-secondary">
                      {ds && <span>Dataset: {ds.name}</span>}
                      <span>Analyses: {inv.analyses.length}</span>
                      {latestAnalysis && <span>Latest: {latestAnalysis.resultSummary.slice(0, 50)}…</span>}
                      <span className="flex items-center gap-1"><Clock size={11} /> {formatTime(inv.lastActivity)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start" onClick={e => e.stopPropagation()}>
                    {!inv.title.startsWith('The ') && !inv.title.includes('Assumption') && (
                      <button
                        onClick={() => setConfirmDelete(inv.id)}
                        className="text-ink-secondary hover:text-burgundy transition-colors p-1"
                        aria-label="Delete investigation"
                      >
                        <Archive size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete investigation?"
        message="This will permanently remove the investigation and all its analyses. This cannot be undone."
        onConfirm={() => { if (confirmDelete) onDelete(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
