import { ColumnMappingConfidence } from '../types/simulation';

interface PatternDefinition {
  target: 'dateCol' | 'newCasesCol' | 'totalCasesCol' | 'deathsCol' | 'totalDeathsCol' | 'recoveredCol';
  exactNames: string[];
  fuzzyTokens: string[];
  negativeTokens: string[];
}

const PATTERNS: PatternDefinition[] = [
  {
    target: 'dateCol',
    exactNames: ['date', 'date_reported', 'report_date', 'timestamp', 'day', 'time', 'observation_date', 'datetime'],
    fuzzyTokens: ['date', 'day', 'time'],
    negativeTokens: ['update', 'birth'],
  },
  {
    target: 'newCasesCol',
    exactNames: ['new_cases', 'daily_cases', 'cases_new', 'confirmed_cases', 'incident_cases', 'new_infections', 'daily_infections', 'cases'],
    fuzzyTokens: ['case', 'infect', 'new'],
    negativeTokens: ['death', 'recover', 'total', 'cumul', 'rate', 'pct', 'percent'],
  },
  {
    target: 'totalCasesCol',
    exactNames: ['total_cases', 'cumulative_cases', 'cum_cases', 'confirmed_total', 'total_infections'],
    fuzzyTokens: ['total', 'cumul', 'cases'],
    negativeTokens: ['death', 'recover', 'daily', 'new'],
  },
  {
    target: 'deathsCol',
    exactNames: ['deaths', 'death', 'new_deaths', 'daily_deaths', 'fatalities', 'daily_fatalities'],
    fuzzyTokens: ['death', 'fatal', 'mortality'],
    negativeTokens: ['total', 'cumul', 'rate', 'ratio', 'pct'],
  },
  {
    target: 'totalDeathsCol',
    exactNames: ['total_deaths', 'cumulative_deaths', 'cum_deaths', 'fatalities_total', 'total_fatalities'],
    fuzzyTokens: ['total', 'cumul', 'death', 'fatal'],
    negativeTokens: ['daily', 'new', 'rate'],
  },
  {
    target: 'recoveredCol',
    exactNames: ['recovered', 'recoveries', 'total_recovered', 'cumulative_recovered', 'daily_recovered', 'released'],
    fuzzyTokens: ['recov', 'discharge'],
    negativeTokens: ['death', 'fatal', 'case', 'rate'],
  },
];

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').trim();
}

/**
 * Computes match score between a column header name and a target pattern.
 */
function scoreColumn(header: string, sampleValues: any[], pattern: PatternDefinition): number {
  const norm = normalize(header);

  // Exact match
  if (pattern.exactNames.includes(norm)) {
    return 98;
  }

  let score = 0;

  // Negative tokens penalty
  for (const neg of pattern.negativeTokens) {
    if (norm.includes(neg)) {
      score -= 40;
    }
  }

  // Token matches
  for (const tok of pattern.fuzzyTokens) {
    if (norm.includes(tok)) {
      score += 35;
    }
  }

  // Sample values heuristic inspection
  if (sampleValues && sampleValues.length > 0) {
    const nonNulls = sampleValues.filter((v) => v !== null && v !== undefined && v !== '');

    if (pattern.target === 'dateCol') {
      const isDateCount = nonNulls.filter((v) => {
        const s = String(v).trim();
        // check YYYY-MM-DD or MM/DD/YYYY or sequential integer 1..N
        const isDateStr = !isNaN(Date.parse(s)) && (s.includes('-') || s.includes('/'));
        const isDayNum = /^\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 2000;
        return isDateStr || isDayNum;
      }).length;

      if (nonNulls.length > 0 && isDateCount / nonNulls.length > 0.7) {
        score += 30;
      }
    } else {
      // Numeric metrics
      const isNumCount = nonNulls.filter((v) => typeof v === 'number' || (!isNaN(Number(v)) && !String(v).includes('-'))).length;
      if (nonNulls.length > 0 && isNumCount / nonNulls.length > 0.8) {
        score += 20;
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function detectColumnMappings(
  headers: string[],
  sampleRows: Record<string, any>[]
): {
  mappings: {
    dateCol?: string;
    newCasesCol?: string;
    totalCasesCol?: string;
    deathsCol?: string;
    totalDeathsCol?: string;
    recoveredCol?: string;
  };
  confidences: Record<string, ColumnMappingConfidence>;
} {
  const mappings: Record<string, string | undefined> = {};
  const confidences: Record<string, ColumnMappingConfidence> = {};

  PATTERNS.forEach((pat) => {
    const scoredList: Array<{ column: string; confidence: number }> = [];

    headers.forEach((header) => {
      const samples = sampleRows.slice(0, 15).map((r) => r[header]);
      const conf = scoreColumn(header, samples, pat);
      if (conf > 25) {
        scoredList.push({ column: header, confidence: conf });
      }
    });

    scoredList.sort((a, b) => b.confidence - a.confidence);

    if (scoredList.length > 0 && scoredList[0].confidence >= 45) {
      mappings[pat.target] = scoredList[0].column;
      confidences[pat.target] = {
        detectedColumn: scoredList[0].column,
        confidence: scoredList[0].confidence,
        alternatives: scoredList.slice(1, 4),
      };
    } else {
      mappings[pat.target] = undefined;
      confidences[pat.target] = {
        detectedColumn: null,
        confidence: 0,
        alternatives: scoredList.slice(0, 3),
      };
    }
  });

  return {
    mappings: mappings as any,
    confidences,
  };
}
