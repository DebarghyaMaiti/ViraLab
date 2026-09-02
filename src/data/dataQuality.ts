import { DataQualityIssue, DatasetRecord, QualityReport } from '../types/simulation';

export function runDataQualityAudit(
  rows: Record<string, any>[],
  columnMappings: {
    dateCol?: string;
    newCasesCol?: string;
    totalCasesCol?: string;
    deathsCol?: string;
    totalDeathsCol?: string;
    recoveredCol?: string;
  }
): QualityReport {
  const issues: DataQualityIssue[] = [];
  const totalRows = rows.length;

  if (totalRows === 0) {
    return {
      valid: false,
      hasErrors: true,
      hasWarnings: false,
      issues: [
        {
          type: 'missing',
          severity: 'error',
          column: 'dataset',
          count: 0,
          message: 'Dataset contains 0 rows of data.',
        },
      ],
      cleanOpsApplied: [],
      totalRows: 0,
      usableRows: 0,
    };
  }

  // 1. Date checks
  const dateCol = columnMappings.dateCol;
  const seenDates = new Set<string>();
  let duplicateDateCount = 0;
  let invalidDateCount = 0;
  let missingDateCount = 0;

  if (dateCol) {
    rows.forEach((r, idx) => {
      const val = r[dateCol];
      if (val === null || val === undefined || val === '') {
        missingDateCount++;
      } else {
        const valStr = String(val).trim();
        const parsedTime = Date.parse(valStr);
        const isNumericIndex = !isNaN(Number(valStr)) && Number(valStr) >= 0;

        if (isNaN(parsedTime) && !isNumericIndex) {
          invalidDateCount++;
        } else {
          if (seenDates.has(valStr)) {
            duplicateDateCount++;
          } else {
            seenDates.add(valStr);
          }
        }
      }
    });

    if (missingDateCount > 0) {
      issues.push({
        type: 'missing',
        severity: 'warning',
        column: dateCol,
        count: missingDateCount,
        message: `${missingDateCount} row(s) have missing date or time index values.`,
      });
    }

    if (invalidDateCount > 0) {
      issues.push({
        type: 'invalid_date',
        severity: 'error',
        column: dateCol,
        count: invalidDateCount,
        message: `${invalidDateCount} row(s) have unparseable or malformed date strings.`,
      });
    }

    if (duplicateDateCount > 0) {
      issues.push({
        type: 'duplicate',
        severity: 'warning',
        column: dateCol,
        count: duplicateDateCount,
        message: `${duplicateDateCount} duplicate observation timestamp(s) detected.`,
      });
    }
  }

  // 2. Cases checks
  const casesCol = columnMappings.newCasesCol || columnMappings.totalCasesCol;
  if (casesCol) {
    let negativeCases = 0;
    let missingCases = 0;
    const values: number[] = [];

    rows.forEach((r) => {
      const val = r[casesCol];
      if (val === null || val === undefined || val === '') {
        missingCases++;
      } else {
        const num = Number(val);
        if (isNaN(num)) {
          missingCases++;
        } else {
          if (num < 0) negativeCases++;
          values.push(num);
        }
      }
    });

    if (missingCases > 0) {
      issues.push({
        type: 'missing',
        severity: 'warning',
        column: casesCol,
        count: missingCases,
        message: `${missingCases} observation(s) in "${casesCol}" have missing/null values.`,
      });
    }

    if (negativeCases > 0) {
      issues.push({
        type: 'negative',
        severity: 'error',
        column: casesCol,
        count: negativeCases,
        message: `${negativeCases} negative case values detected in "${casesCol}".`,
      });
    }

    // Outlier check (simple 6x median threshold)
    if (values.length > 10) {
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (median > 5) {
        const extremeOutliers = values.filter((v) => v > median * 12).length;
        if (extremeOutliers > 0) {
          issues.push({
            type: 'outlier',
            severity: 'info',
            column: casesCol,
            count: extremeOutliers,
            message: `${extremeOutliers} potential outlier value(s) exceed 12x median.`,
          });
        }
      }
    }
  }

  // 3. Monotonicity check on cumulative deaths / cases
  const totalDeathsCol = columnMappings.totalDeathsCol;
  if (totalDeathsCol) {
    let nonMonotonicCount = 0;
    let prev = -1;

    rows.forEach((r) => {
      const val = Number(r[totalDeathsCol]);
      if (!isNaN(val)) {
        if (prev >= 0 && val < prev) {
          nonMonotonicCount++;
        }
        prev = val;
      }
    });

    if (nonMonotonicCount > 0) {
      issues.push({
        type: 'non_monotonic',
        severity: 'warning',
        column: totalDeathsCol,
        count: nonMonotonicCount,
        message: `${nonMonotonicCount} cumulative death count drops detected (retroactive revisions).`,
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasWarnings = issues.some((i) => i.severity === 'warning');

  return {
    valid: !hasErrors,
    hasErrors,
    hasWarnings,
    issues,
    cleanOpsApplied: [],
    totalRows,
    usableRows: totalRows - invalidDateCount,
  };
}

/**
 * Standardize and sanitize rows into DatasetRecord array according to mappings.
 */
export function normalizeDatasetRows(
  rows: Record<string, any>[],
  mappings: {
    dateCol?: string;
    newCasesCol?: string;
    totalCasesCol?: string;
    deathsCol?: string;
    totalDeathsCol?: string;
    recoveredCol?: string;
  },
  cleanOption: 'keep' | 'interpolate' | 'drop_invalid' = 'keep'
): { cleanedRecords: DatasetRecord[]; cleanOpsApplied: string[] } {
  const cleanOpsApplied: string[] = [];
  const records: DatasetRecord[] = [];

  let prevTotalCases = 0;
  let prevTotalDeaths = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx];

    let dateVal = mappings.dateCol ? String(raw[mappings.dateCol] || `Day ${idx + 1}`) : `Day ${idx + 1}`;
    let newCases = mappings.newCasesCol ? Number(raw[mappings.newCasesCol]) : undefined;
    let totalCases = mappings.totalCasesCol ? Number(raw[mappings.totalCasesCol]) : undefined;
    let deaths = mappings.deathsCol ? Number(raw[mappings.deathsCol]) : undefined;
    let totalDeaths = mappings.totalDeathsCol ? Number(raw[mappings.totalDeathsCol]) : undefined;
    let recovered = mappings.recoveredCol ? Number(raw[mappings.recoveredCol]) : undefined;

    // Convert total cases to daily cases if only total is available
    if (newCases === undefined && totalCases !== undefined && !isNaN(totalCases)) {
      newCases = Math.max(0, totalCases - prevTotalCases);
      prevTotalCases = totalCases;
    }

    // Convert daily cases to cumulative if only daily is available
    if (totalCases === undefined && newCases !== undefined && !isNaN(newCases)) {
      prevTotalCases += Math.max(0, newCases);
      totalCases = prevTotalCases;
    }

    // Convert total deaths to daily deaths if needed
    if (deaths === undefined && totalDeaths !== undefined && !isNaN(totalDeaths)) {
      deaths = Math.max(0, totalDeaths - prevTotalDeaths);
      prevTotalDeaths = totalDeaths;
    }

    // Handle invalid / negative values
    if (cleanOption === 'drop_invalid') {
      if ((newCases !== undefined && (isNaN(newCases) || newCases < 0)) || (deaths !== undefined && deaths < 0)) {
        continue;
      }
    } else if (cleanOption === 'interpolate') {
      if (newCases !== undefined && (isNaN(newCases) || newCases < 0)) {
        newCases = 0;
      }
      if (deaths !== undefined && (isNaN(deaths) || deaths < 0)) {
        deaths = 0;
      }
    }

    records.push({
      date: dateVal,
      dayIndex: idx + 1,
      newCases: newCases !== undefined && !isNaN(newCases) ? Math.max(0, newCases) : 0,
      totalCases: totalCases !== undefined && !isNaN(totalCases) ? Math.max(0, totalCases) : undefined,
      deaths: deaths !== undefined && !isNaN(deaths) ? Math.max(0, deaths) : 0,
      totalDeaths: totalDeaths !== undefined && !isNaN(totalDeaths) ? Math.max(0, totalDeaths) : undefined,
      recovered: recovered !== undefined && !isNaN(recovered) ? Math.max(0, recovered) : undefined,
    });
  }

  if (cleanOption === 'drop_invalid') {
    cleanOpsApplied.push('Dropped rows containing negative or unparseable incidence values.');
  } else if (cleanOption === 'interpolate') {
    cleanOpsApplied.push('Clamped negative incidence values to zero and filled missing observations.');
  }

  return {
    cleanedRecords: records,
    cleanOpsApplied,
  };
}
