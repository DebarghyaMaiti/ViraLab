import React, { useState, useRef } from 'react';
import {
  Database,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Sliders,
  Table as TableIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { parseDelimitedText, parseJsonDataset } from '../data/parser';
import { detectColumnMappings } from '../data/columnDetector';
import { runDataQualityAudit, normalizeDatasetRows } from '../data/dataQuality';
import { syntheticHistoricalOutbreakCsv } from '../data/presets';
import { DatasetRecord, QualityReport, ColumnMappingConfidence } from '../types/simulation';

interface DataCenterProps {
  onDatasetLoaded: (records: DatasetRecord[], metadata: any) => void;
  isLearningMode: boolean;
  onNavigateToFitting: () => void;
}

export const DataCenter: React.FC<DataCenterProps> = ({
  onDatasetLoaded,
  isLearningMode,
  onNavigateToFitting,
}) => {
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMappings, setColumnMappings] = useState<{
    dateCol?: string;
    newCasesCol?: string;
    totalCasesCol?: string;
    deathsCol?: string;
    totalDeathsCol?: string;
    recoveredCol?: string;
  }>({});
  const [confidences, setConfidences] = useState<Record<string, ColumnMappingConfidence>>({});
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [cleaningOption, setCleaningOption] = useState<'keep' | 'interpolate' | 'drop_invalid'>('keep');
  const [cleanedRecords, setCleanedRecords] = useState<DatasetRecord[]>([]);
  const [cleanOps, setCleanOps] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [parseError, setParseError] = useState<string | null>(null);
  const pageSize = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process text into table, detect columns and run quality audit
  const processRawData = (text: string, sourceName: string) => {
    setParseError(null);
    try {
      let table;
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        table = parseJsonDataset(text);
      } else {
        table = parseDelimitedText(text);
      }

      setFileName(sourceName);
      setRawText(text);
      setParsedHeaders(table.headers);
      setRawRows(table.rows);

      // Intelligent column detection
      const { mappings, confidences: confs } = detectColumnMappings(table.headers, table.rows);
      setColumnMappings(mappings);
      setConfidences(confs);

      // Run Quality audit
      const report = runDataQualityAudit(table.rows, mappings);
      setQualityReport(report);

      // Normalize records
      const { cleanedRecords: records, cleanOpsApplied } = normalizeDatasetRows(
        table.rows,
        mappings,
        cleaningOption
      );
      setCleanedRecords(records);
      setCleanOps(cleanOpsApplied);
      setPage(1);

      onDatasetLoaded(records, {
        sourceName,
        rowCount: records.length,
        timestamp: new Date().toISOString(),
        quality: report,
      });
    } catch (err: any) {
      setParseError(`Data parsing error: ${err.message || 'Invalid dataset format'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processRawData(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadSynthetic = () => {
    processRawData(syntheticHistoricalOutbreakCsv, 'synthetic_historical_outbreak.csv');
  };

  const handleUpdateMapping = (field: string, newCol: string) => {
    const updated = { ...columnMappings, [field]: newCol || undefined };
    setColumnMappings(updated);
    const report = runDataQualityAudit(rawRows, updated);
    setQualityReport(report);
    const { cleanedRecords: records, cleanOpsApplied } = normalizeDatasetRows(
      rawRows,
      updated,
      cleaningOption
    );
    setCleanedRecords(records);
    setCleanOps(cleanOpsApplied);
    onDatasetLoaded(records, {
      sourceName: fileName,
      rowCount: records.length,
      timestamp: new Date().toISOString(),
      quality: report,
    });
  };

  const handleApplyCleaning = (option: 'keep' | 'interpolate' | 'drop_invalid') => {
    setCleaningOption(option);
    const { cleanedRecords: records, cleanOpsApplied } = normalizeDatasetRows(
      rawRows,
      columnMappings,
      option
    );
    setCleanedRecords(records);
    setCleanOps(cleanOpsApplied);
    onDatasetLoaded(records, {
      sourceName: fileName,
      rowCount: records.length,
      timestamp: new Date().toISOString(),
      quality: qualityReport,
      cleanOpsApplied,
    });
  };

  return (
    <div id="data-center" className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            <span>Data Center & Ingestion Pipeline</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ingest empirical epidemiological time-series, perform automated schema resolution, run data quality audits, and inspect provenance.
          </p>
        </div>

        {cleanedRecords.length > 0 && (
          <button
            onClick={onNavigateToFitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <span>Proceed to Model Fitting</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {parseError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{parseError}</span>
          </div>
          <button
            onClick={() => setParseError(null)}
            className="text-rose-700 dark:text-rose-400 hover:underline text-[11px] font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone & Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Box */}
        <div className="md:col-span-2 p-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-center transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.tsv,.json,.txt"
            className="hidden"
          />
          <UploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Upload Epidemiological Time-Series
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Supports CSV, TSV, or JSON formats with date, daily incident cases, cumulative totals, and fatalities.
          </p>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Browse Local Files
            </button>
          </div>
        </div>

        {/* Preset Outbreak Dataset Card */}
        <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-sm mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Synthetic Outbreak Dataset</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Load a pre-calibrated 40-day empirical outbreak time-series with noisy incidence counts, cumulative hospitalizations, and deaths for immediate testing.
            </p>
          </div>

          <button
            onClick={handleLoadSynthetic}
            className="mt-6 w-full py-2.5 px-3 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Load 40-Day Synthetic Dataset</span>
          </button>
        </div>
      </div>

      {cleanedRecords.length > 0 && (
        <div className="space-y-6">
          {/* Column Schema Mapping Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Schema Resolution & Intelligent Column Mapping</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Confidence ratings computed from semantic header matching and value distribution inspection
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Source: {fileName} ({cleanedRecords.length} rows)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Column */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date / Time Index
                </label>
                <select
                  value={columnMappings.dateCol || ''}
                  onChange={(e) => handleUpdateMapping('dateCol', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">-- None / Auto-index --</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h} {confidences.dateCol?.detectedColumn === h ? `(${confidences.dateCol.confidence}% confidence)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* New Cases */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Daily New Cases
                </label>
                <select
                  value={columnMappings.newCasesCol || ''}
                  onChange={(e) => handleUpdateMapping('newCasesCol', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">-- None --</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h} {confidences.newCasesCol?.detectedColumn === h ? `(${confidences.newCasesCol.confidence}% confidence)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Cases */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cumulative Total Cases
                </label>
                <select
                  value={columnMappings.totalCasesCol || ''}
                  onChange={(e) => handleUpdateMapping('totalCasesCol', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">-- None --</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h} {confidences.totalCasesCol?.detectedColumn === h ? `(${confidences.totalCasesCol.confidence}% confidence)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Daily Deaths */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Deaths
                </label>
                <select
                  value={columnMappings.deathsCol || ''}
                  onChange={(e) => handleUpdateMapping('deathsCol', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">-- None --</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h} {confidences.deathsCol?.detectedColumn === h ? `(${confidences.deathsCol.confidence}% confidence)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Deaths */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cumulative Total Deaths
                </label>
                <select
                  value={columnMappings.totalDeathsCol || ''}
                  onChange={(e) => handleUpdateMapping('totalDeathsCol', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">-- None --</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h} {confidences.totalDeathsCol?.detectedColumn === h ? `(${confidences.totalDeathsCol.confidence}% confidence)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quality Report & Cleaning Actions */}
          {qualityReport && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  {qualityReport.valid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Data Quality Audit Report ({qualityReport.issues.length} findings)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Sanitization:</span>
                  <button
                    onClick={() => handleApplyCleaning('keep')}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      cleaningOption === 'keep'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Keep Raw
                  </button>
                  <button
                    onClick={() => handleApplyCleaning('interpolate')}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      cleaningOption === 'interpolate'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Clamp Negatives & Fill
                  </button>
                  <button
                    onClick={() => handleApplyCleaning('drop_invalid')}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      cleaningOption === 'drop_invalid'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Drop Invalid
                  </button>
                </div>
              </div>

              {qualityReport.issues.length > 0 ? (
                <div className="space-y-2">
                  {qualityReport.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {issue.severity === 'error' ? (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : issue.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <span className="text-slate-800 dark:text-slate-200">{issue.message}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {issue.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Passed all integrity validations. Monotonicity preserved, no negative incidence counts, zero duplicate dates.
                </p>
              )}
            </div>
          )}

          {/* Interactive Preview Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-slate-400" />
                <span>Sanitized Time-Series Preview ({cleanedRecords.length} records)</span>
              </h3>

              {/* Pagination */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">
                  Page {page} of {Math.ceil(cleanedRecords.length / pageSize)}
                </span>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={page >= Math.ceil(cleanedRecords.length / pageSize)}
                  onClick={() => setPage(page + 1)}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 px-3 font-semibold">Day Index</th>
                    <th className="py-2 px-3 font-semibold">Date / Timestamp</th>
                    <th className="py-2 px-3 font-semibold">Daily Cases</th>
                    <th className="py-2 px-3 font-semibold">Cumulative Cases</th>
                    <th className="py-2 px-3 font-semibold">Daily Deaths</th>
                    <th className="py-2 px-3 font-semibold">Total Deaths</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {cleanedRecords.slice((page - 1) * pageSize, page * pageSize).map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400">{rec.dayIndex}</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">
                        {rec.date}
                      </td>
                      <td className="py-2 px-3 text-amber-600 font-bold">{rec.newCases.toLocaleString()}</td>
                      <td className="py-2 px-3">{rec.totalCases?.toLocaleString() || '—'}</td>
                      <td className="py-2 px-3 text-red-600 font-bold">{rec.deaths.toLocaleString()}</td>
                      <td className="py-2 px-3">{rec.totalDeaths?.toLocaleString() || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
