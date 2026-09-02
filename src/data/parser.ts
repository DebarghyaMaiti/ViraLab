/**
 * Robust CSV / TSV / JSON parser with delimiter detection and sanitization.
 */

export interface ParsedTable {
  headers: string[];
  rows: Record<string, any>[];
  rowCount: number;
}

export function parseDelimitedText(text: string): ParsedTable {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('File content is empty.');
  }

  // Detect delimiter: comma, tab, or semicolon
  const firstLine = cleanText.split('\n')[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount >= semiCount) delimiter = '\t';
  else if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';

  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Dataset must contain at least a header row and one data row.');
  }

  const rawHeaders = splitLine(lines[0], delimiter);
  const headers = rawHeaders.map((h, i) => h.trim().replace(/^["']|["']$/g, '') || `Column_${i + 1}`);

  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitLine(lines[i], delimiter);
    if (rawCols.length === 0 || (rawCols.length === 1 && !rawCols[0].trim())) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((header, colIdx) => {
      const valStr = (rawCols[colIdx] || '').trim().replace(/^["']|["']$/g, '');
      if (valStr === '' || valStr.toLowerCase() === 'na' || valStr.toLowerCase() === 'null') {
        rowObj[header] = null;
      } else {
        const numVal = Number(valStr.replace(/,/g, ''));
        if (!isNaN(numVal) && isFinite(numVal) && !valStr.includes('-') && !valStr.includes('/')) {
          rowObj[header] = numVal;
        } else {
          rowObj[header] = valStr;
        }
      }
    });
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
  };
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function parseJsonDataset(jsonString: string): ParsedTable {
  const parsed = JSON.parse(jsonString);
  let arrayData: any[] = [];

  if (Array.isArray(parsed)) {
    arrayData = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // Check common container properties: data, records, rows, items
    const possibleKeys = ['data', 'records', 'rows', 'items', 'observations'];
    for (const key of possibleKeys) {
      if (Array.isArray(parsed[key])) {
        arrayData = parsed[key];
        break;
      }
    }
    if (arrayData.length === 0) {
      // If object of key-values, try object values
      const firstVal = Object.values(parsed)[0];
      if (Array.isArray(firstVal)) {
        arrayData = firstVal;
      } else {
        arrayData = [parsed];
      }
    }
  }

  if (arrayData.length === 0) {
    throw new Error('No structured records found in JSON data.');
  }

  // Extract all unique keys as headers
  const headerSet = new Set<string>();
  arrayData.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((k) => headerSet.add(k));
    }
  });

  const headers = Array.from(headerSet);
  return {
    headers,
    rows: arrayData,
    rowCount: arrayData.length,
  };
}
