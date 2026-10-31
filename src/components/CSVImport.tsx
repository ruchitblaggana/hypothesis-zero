// CSV Import component — upload, preview, inspect, and import CSV datasets

import { useState, useRef, useCallback } from 'react';
import type { DatasetRecord, ColumnDef } from '@/lib/types';
import { parseCSV } from '@/lib/csv';
import { SectionHeader, Panel, WarningBox } from '@/components/ui';
import { saveDataset, genId } from '@/lib/storage';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface CSVImportProps {
  onImported: () => void;
}

export function CSVImport({ onImported }: CSVImportProps) {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseCSV> | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError('');
    setImported(false);
    setFileName(file.name);
    if (file.size > 5 * 1024 * 1024) {
      setError('File is larger than 5MB. Please use a smaller file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      try {
        const result = parseCSV(text, 10000);
        setParsed(result);
        setDatasetName(file.name.replace(/\.csv$/i, ''));
        setSelectedCols(new Set(result.headers));
      } catch (e) {
        setError('Failed to parse the CSV file: ' + (e as Error).message);
      }
    };
    reader.onerror = () => setError('Failed to read the file.');
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = () => {
    if (!parsed) return;
    const headers = parsed.headers.filter(h => selectedCols.has(h));
    if (headers.length === 0) {
      setError('Select at least one column to import.');
      return;
    }
    const columns: ColumnDef[] = headers.map(h => ({
      name: h,
      type: parsed.columnTypes[h] || 'categorical',
    }));
    const rows = parsed.rows.map(r => {
      const obj: Record<string, string | number | null> = {};
      for (const h of headers) {
        const v = r[h];
        if (v === null) {
          obj[h] = null;
        } else if (parsed.columnTypes[h] === 'numeric') {
          const n = parseFloat(v);
          obj[h] = isNaN(n) ? null : n;
        } else {
          obj[h] = v;
        }
      }
      return obj;
    });

    const record: DatasetRecord = {
      id: genId('csv-'),
      name: datasetName || fileName,
      description: description || `Imported from ${fileName}`,
      source: `User import — ${fileName}`,
      rows,
      columns,
      dictionary: {},
      generationMethod: 'Imported from CSV file',
      limitations: ['Imported data — origin and quality unknown', 'Column types auto-detected and may need correction'],
      suggestedInvestigations: [],
      researchQuestion: '',
      reproducibility: { seed: 0, params: `Imported ${rows.length} rows × ${columns.length} columns` },
      createdAt: Date.now(),
      version: 1,
    };

    saveDataset(record).then(() => {
      setImported(true);
      onImported();
    }).catch(e => setError('Failed to save: ' + e.message));
  };

  const reset = () => {
    setParsed(null);
    setFileName('');
    setDatasetName('');
    setDescription('');
    setSelectedCols(new Set());
    setImported(false);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader title="Import Dataset" subtitle="Upload a CSV file to analyze your own data. Files are processed entirely in your browser — nothing is uploaded to a server." />

      {imported ? (
        <Panel className="p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-evidence-green mb-4" />
          <h3 className="editorial-title text-xl text-ink mb-2">Dataset imported successfully</h3>
          <p className="text-sm text-ink-secondary mb-4">"{datasetName}" is now available in the Evidence Laboratory.</p>
          <button onClick={reset} className="btn-secondary">Import Another</button>
        </Panel>
      ) : (
        <>
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-divider p-12 text-center mb-6 transition-colors hover:border-ink cursor-pointer"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={40} className="mx-auto text-ink-secondary mb-4" />
            <p className="text-ink font-medium mb-1">Drop a CSV file here or click to browse</p>
            <p className="text-xs text-ink-secondary">Max 5MB · up to 10,000 rows · headers required</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {error && <WarningBox warnings={[error]} />}

          {parsed && (
            <div className="space-y-6">
              {parsed.warnings.length > 0 && <WarningBox warnings={parsed.warnings} />}

              {/* Metadata */}
              <Panel className="p-6">
                <div className="section-label mb-4">Dataset Metadata</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Dataset Name</label>
                    <input className="field-input" value={datasetName} onChange={e => setDatasetName(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Description (optional)</label>
                    <input className="field-input" value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                </div>
              </Panel>

              {/* Column selection */}
              <Panel className="p-6">
                <div className="section-label mb-4">Detected Columns ({parsed.headers.length})</div>
                <div className="space-y-2">
                  {parsed.headers.map(h => {
                    const type = parsed.columnTypes[h];
                    const selected = selectedCols.has(h);
                    return (
                      <div key={h} className="flex items-center gap-3 border-b border-divider/40 pb-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const next = new Set(selectedCols);
                            if (next.has(h)) next.delete(h); else next.add(h);
                            setSelectedCols(next);
                          }}
                          className="w-4 h-4 accent-burgundy"
                        />
                        <span className="font-mono text-sm text-ink flex-1">{h}</span>
                        <span className={`text-xs font-mono px-2 py-0.5 border ${type === 'numeric' ? 'border-research-blue/30 text-research-blue' : 'border-evidence-green/30 text-evidence-green'}`}>
                          {type}
                        </span>
                        <span className="text-xs text-ink-secondary font-mono">
                          {parsed.rows.filter(r => r[h] !== null).length} values
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* Preview */}
              <Panel className="p-4">
                <div className="section-label mb-3">Preview (first 10 rows)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-divider">
                        {parsed.headers.filter(h => selectedCols.has(h)).map(h => (
                          <th key={h} className="text-left px-2 py-1 font-mono text-ink">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-b border-divider/30">
                          {parsed.headers.filter(h => selectedCols.has(h)).map(h => (
                            <td key={h} className="px-2 py-1 font-mono text-ink-secondary">
                              {r[h] === null ? <span className="text-burgundy italic">—</span> : String(r[h]).slice(0, 30)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <div className="flex justify-end gap-3">
                <button onClick={reset} className="btn-ghost">Cancel</button>
                <button onClick={handleImport} className="btn-primary flex items-center gap-2">
                  <FileText size={16} /> Import Dataset
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
