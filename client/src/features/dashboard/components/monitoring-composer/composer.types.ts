export type AnalysisMode =
  | "single-student"
  | "all-students"
  | "single-career"
  | "all-careers";

export type AccessStatus = "ALL" | "SUCCESS" | "FAILED";

export type SortDirection = "desc" | "asc";

export interface DateRangeValue {
  from?: Date;
  to?: Date;
}

export interface ComposerDraftState {
  mode?: AnalysisMode;
  type?: "students" | "careers";
  studentMode?: "individual" | "all";
  careers?: string[];
  didFilter?: boolean;
  student?: {
    query: string;
    selectedId?: string;
  };
  status?: AccessStatus;
  sortDirection?: SortDirection;
  topEnabled?: boolean;
  topN?: number;
  dateRange?: DateRangeValue;
}

export type ComposerFieldKey =
  | "student"
  | "career"
  | "status"
  | "dateRange"
  | "sortDirection"
  | "topN";

export const DEFAULT_COMPOSER_DRAFT_STATE: ComposerDraftState = {
  didFilter: false,
  careers: [],
  status: undefined,
  topEnabled: false,
  student: { query: "" },
};

// ─── Canonical filter families ──────────────────────────────────────────────

export type MonitoringFilterFamily =
  | "student_individual"
  | "student_all"
  | "career_single"
  | "career_multi";

/**
 * Fully resolved, noise-free query derived from a valid ComposerDraftState.
 * Fields that don't apply to the family are absent — not undefined, absent.
 *
 * - student_individual : accessType + studentId + dateRange?
 * - student_all        : accessType + sortDirection + dateRange? + topN? (topEnabled)
 * - career_single      : accessType + careerCodes[1] + dateRange?
 * - career_multi       : accessType + careerCodes[2+] + sortDirection + dateRange? + topN? (topEnabled)
 */
export type MonitoringResolvedQuery = {
  family: MonitoringFilterFamily;
  accessType: AccessStatus;
  dateRange?: { from: Date; to: Date };
  sortDirection?: SortDirection;
  topN?: number;
  studentId?: string;
  careerCodes?: string[];
};
