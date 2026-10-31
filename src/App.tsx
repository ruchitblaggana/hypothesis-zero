import { useState, useEffect, useCallback } from 'react';
import type { InvestigationRecord, DatasetRecord, ClaimRecord } from '@/lib/types';
import { getAllDatasets, getAllInvestigations, getAllClaims, saveInvestigation, deleteInvestigation, deleteDataset, saveDataset, isIndexedDBAvailable, resetAllData, genId } from '@/lib/storage';
import { buildBuiltinDatasets, buildGuidedInvestigations } from '@/lib/datasets';

import { InvestigationDesk } from '@/components/InvestigationDesk';
import { InvestigationEditor } from '@/components/InvestigationEditor';
import { EvidenceLab } from '@/components/EvidenceLab';
import { ClaimExaminer } from '@/components/ClaimExaminer';
import { CounterexampleStudio } from '@/components/CounterexampleStudio';
import { CSVImport } from '@/components/CSVImport';
import { EvidenceArchive } from '@/components/EvidenceArchive';
import { LearningCentre } from '@/components/LearningCentre';
import { DeveloperSection } from '@/components/DeveloperSection';
import { ConfirmDialog } from '@/components/ui';

import { FlaskConical, FileText, Scale, ShieldQuestion, Database, BookOpen, User, Upload, Search, Menu, X } from 'lucide-react';

type Page = 'desk' | 'lab' | 'claims' | 'counterexample' | 'archive' | 'learning' | 'developer' | 'import';

const NAV_ITEMS: Array<{ id: Page; label: string; icon: React.ReactNode; section: string }> = [
  { id: 'desk', label: 'Investigation Desk', icon: <FileText size={16} />, section: 'A' },
  { id: 'lab', label: 'Evidence Laboratory', icon: <FlaskConical size={16} />, section: 'B' },
  { id: 'claims', label: 'Claim Examiner', icon: <Scale size={16} />, section: 'C' },
  { id: 'counterexample', label: 'Counterexample Studio', icon: <ShieldQuestion size={16} />, section: 'D' },
  { id: 'archive', label: 'Evidence Archive', icon: <Database size={16} />, section: 'F' },
  { id: 'learning', label: 'Learning Centre', icon: <BookOpen size={16} />, section: '15' },
  { id: 'developer', label: 'Developer / About', icon: <User size={16} />, section: 'G' },
];

function App() {
  const [page, setPage] = useState<Page>('desk');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [investigations, setInvestigations] = useState<InvestigationRecord[]>([]);
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [editingInvestigationId, setEditingInvestigationId] = useState<string | null>(null);
  const [storageAvailable] = useState(isIndexedDBAvailable());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ds, invs, cls] = await Promise.all([
        getAllDatasets(),
        getAllInvestigations(),
        getAllClaims(),
      ]);
      setDatasets(ds);
      setInvestigations(invs);
      setClaims(cls);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNewInvestigation = () => {
    const now = Date.now();
    const maxNum = Math.max(0, ...investigations.filter(i => !i.id.startsWith('guided-')).map(i => i.number));
    const newInv: InvestigationRecord = {
      id: genId('inv-'),
      number: maxNum + 1,
      title: 'Untitled Investigation',
      researchQuestion: '',
      background: '',
      reason: '',
      relevantVariables: [],
      hypothesis: {},
      analyses: [],
      notebook: [],
      challengeNotes: '',
      conclusion: {
        evidenceSuggests: '', doesNotEstablish: '', hypothesisSupported: 'notAssessed',
        limitations: [], alternativeExplanations: [], nextSteps: '',
      },
      status: 'draft',
      lastActivity: now,
      createdAt: now,
      updatedAt: now,
    };
    saveInvestigation(newInv).then(() => {
      loadData();
      setEditingInvestigationId(newInv.id);
    });
  };

  const handleOpenInvestigation = (id: string) => {
    setEditingInvestigationId(id);
  };

  const handleUpdateInvestigation = (inv: InvestigationRecord) => {
    setInvestigations(prev => prev.map(i => i.id === inv.id ? inv : i));
    saveInvestigation(inv).catch(e => console.error('Save failed:', e));
  };

  const handleDeleteInvestigation = (id: string) => {
    deleteInvestigation(id).then(() => {
      loadData();
      if (editingInvestigationId === id) setEditingInvestigationId(null);
    });
  };

  const handleDeleteDataset = (id: string) => {
    deleteDataset(id).then(() => loadData());
  };

  const editingInvestigation = editingInvestigationId
    ? investigations.find(i => i.id === editingInvestigationId)
    : null;

  const navigate = (p: string) => {
    setPage(p as Page);
    setMobileNavOpen(false);
    setEditingInvestigationId(null);
  };

  if (!storageAvailable) {
    return (
      <div className="min-h-screen bg-archive flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="editorial-title text-2xl text-ink mb-4">Storage Unavailable</h1>
          <p className="text-sm text-ink-secondary">
            This browser does not support IndexedDB, which Hypothesis Zero uses to store datasets and investigations.
            Please try a different browser to access all features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-archive">
      {/* Header */}
      <header className="border-b border-divider bg-paper sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => navigate('desk')} className="flex items-center gap-3 group">
              <div className="w-9 h-9 border-2 border-ink flex items-center justify-center group-hover:border-burgundy transition-colors">
                <span className="font-serif text-lg font-semibold text-ink group-hover:text-burgundy transition-colors">H₀</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-serif text-lg font-medium text-ink leading-none">Hypothesis Zero</div>
                <div className="font-mono text-[10px] text-ink-secondary uppercase tracking-[0.2em] mt-0.5">Test the evidence</div>
              </div>
            </button>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors relative ${
                    page === item.id && !editingInvestigation ? 'text-ink' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {item.icon}
                  <span className="hidden xl:inline">{item.label}</span>
                  {page === item.id && !editingInvestigation && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-burgundy" />}
                </button>
              ))}
              <button onClick={() => navigate('import')} className="btn-secondary ml-3 !py-1.5 !px-3 flex items-center gap-1.5">
                <Upload size={14} /> <span className="hidden xl:inline">Import CSV</span>
              </button>
            </nav>

            {/* Mobile menu button */}
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="lg:hidden p-2 text-ink">
              {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileNavOpen && (
          <nav className="lg:hidden border-t border-divider bg-paper">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors border-b border-divider/40 ${
                  page === item.id ? 'text-ink bg-highlight/10' : 'text-ink-secondary'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button onClick={() => navigate('import')} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary border-b border-divider/40">
              <Upload size={16} /> Import CSV
            </button>
          </nav>
        )}
      </header>

      {/* Page content */}
      <main>
        {editingInvestigation ? (
          <InvestigationEditor
            investigation={editingInvestigation}
            datasets={datasets}
            onUpdate={handleUpdateInvestigation}
            onBack={() => setEditingInvestigationId(null)}
          />
        ) : page === 'desk' ? (
          <InvestigationDesk
            investigations={investigations}
            datasets={datasets}
            onOpen={handleOpenInvestigation}
            onNew={handleNewInvestigation}
            onDelete={handleDeleteInvestigation}
          />
        ) : page === 'lab' ? (
          <EvidenceLab datasets={datasets} />
        ) : page === 'claims' ? (
          <ClaimExaminer
            datasets={datasets}
            claims={claims}
            onClaimsChanged={loadData}
          />
        ) : page === 'counterexample' ? (
          <CounterexampleStudio datasets={datasets} onCounterexamplesChanged={loadData} />
        ) : page === 'import' ? (
          <CSVImport onImported={loadData} />
        ) : page === 'archive' ? (
          <EvidenceArchive
            investigations={investigations}
            datasets={datasets}
            claims={claims}
            onOpenInvestigation={handleOpenInvestigation}
            onDeleteInvestigation={handleDeleteInvestigation}
            onDeleteDataset={handleDeleteDataset}
          />
        ) : page === 'learning' ? (
          <LearningCentre onNavigate={navigate} />
        ) : page === 'developer' ? (
          <DeveloperSection />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-divider mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="font-serif text-sm text-ink">Hypothesis Zero</div>
              <div className="font-mono text-[10px] text-ink-secondary uppercase tracking-[0.2em] mt-1">Don't trust the answer. Test the evidence.</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-secondary font-mono">
              <span>By Ruchit Blaggana</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline">All calculations run in your browser</span>
              <button onClick={() => setShowResetConfirm(true)} className="text-burgundy hover:underline">Reset all data</button>
            </div>
          </div>
        </div>
      </footer>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset all data?"
        message="This will permanently delete all imported datasets, custom investigations, claim assessments, and counterexamples. Built-in datasets and guided investigations will be restored. This cannot be undone."
        onConfirm={async () => {
          const { resetAllData } = await import('@/lib/storage');
          await resetAllData();
          setShowResetConfirm(false);
          loadData();
          navigate('desk');
        }}
        onCancel={() => setShowResetConfirm(false)}
        confirmLabel="Reset everything"
        danger
      />
    </div>
  );
}

export default App;
