// CSV parser for Hypothesis Zero — handles quoted fields, commas in quotes, missing cells

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string | null>[];
  warnings: string[];
  columnTypes: Record<string, 'numeric' | 'categorical'>;
}

export function parseCSV(text: string, maxRows = 10000): ParsedCSV {
  const warnings: string[] = [];
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        lines.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }

  if (lines.length === 0) {
    warnings.push('The file appears to be empty.');
    return { headers: [], rows: [], warnings, columnTypes: {} };
  }

  const headers = lines[0].map(h => h.trim());
  if (headers.some(h => h === '')) {
    warnings.push('One or more header cells are empty. Empty headers will be named "column_N".');
  }
  headers.forEach((h, i) => {
    if (h === '') headers[i] = `column_${i + 1}`;
  });

  const dataRows = lines.slice(1);
  if (dataRows.length > maxRows) {
    warnings.push(`File has ${dataRows.length} data rows. Only the first ${maxRows} will be imported.`);
  }
  const limited = dataRows.slice(0, maxRows);

  const rows: Record<string, string | null>[] = [];
  for (const rawRow of limited) {
    if (rawRow.length === 1 && rawRow[0].trim() === '') continue; // skip blank lines
    const obj: Record<string, string | null> = {};
    for (let j = 0; j < headers.length; j++) {
      const val = rawRow[j] !== undefined ? rawRow[j].trim() : '';
      obj[headers[j]] = val === '' ? null : val;
    }
    rows.push(obj);
  }

  // Detect column types
  const columnTypes: Record<string, 'numeric' | 'categorical'> = {};
  for (const h of headers) {
    let numericCount = 0;
    let total = 0;
    for (const r of rows) {
      const v = r[h];
      if (v === null) continue;
      total++;
      const n = parseFloat(v);
      if (!isNaN(n) && isFinite(n) && /^-?\d*\.?\d+([eE][-+]?\d+)?$/.test(v)) {
        numericCount++;
      }
    }
    columnTypes[h] = total > 0 && numericCount / total > 0.8 ? 'numeric' : 'categorical';
  }

  // Check for inconsistent row lengths
  const expectedLen = headers.length;
  let inconsistent = 0;
  for (const r of dataRows) {
    if (r.length !== expectedLen && !(r.length === 1 && r[0].trim() === '')) inconsistent++;
  }
  if (inconsistent > 0) {
    warnings.push(`${inconsistent} rows have a different number of fields than the header. Extra or missing fields were handled by position.`);
  }

  return { headers, rows, warnings, columnTypes };
}

export function csvFromRows(
  rows: Record<string, string | number | null>[],
  columns: string[]
): string {
  const header = columns.join(',');
  const lines = rows.map(r =>
    columns.map(c => {
      const v = r[c];
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}
