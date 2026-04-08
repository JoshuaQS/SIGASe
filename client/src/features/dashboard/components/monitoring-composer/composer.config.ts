import type { AnalysisMode, ComposerFieldKey } from "./composer.types";

export const MODE_FIELDS = {
  "single-student": ["student", "status", "dateRange"],
  "all-students": ["status", "dateRange", "sortDirection", "topN"],
  // career_single: sin sortDirection ni topN (matriz funcional)
  "single-career": ["career", "status", "dateRange"],
  "all-careers": ["status", "dateRange", "sortDirection", "topN"],
} as const satisfies Record<AnalysisMode, readonly ComposerFieldKey[]>;

export const MODE_LAYOUT_SPANS: Record<
  AnalysisMode,
  { mode: number } & Partial<Record<ComposerFieldKey, number>>
> = {
  "single-student": {
    mode: 3,
    student: 4,
    status: 2,
    dateRange: 3,
  },
  "all-students": {
    mode: 3,
    status: 2,
    dateRange: 3,
    sortDirection: 2,
    topN: 2,
  },
  // career_single: sin spans de sortDirection ni topN
  "single-career": {
    mode: 3,
    career: 3,
    status: 2,
    dateRange: 3,
  },
  "all-careers": {
    mode: 3,
    status: 2,
    dateRange: 3,
    sortDirection: 2,
    topN: 2,
  },
};

/** Valores de topN permitidos para student_all */
export const TOP_N_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

/** Valores de topN permitidos para career_multi (máximo 10 según matriz) */
export const TOP_N_CAREER_MULTI_OPTIONS = [5, 10] as const;
