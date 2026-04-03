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
  sortDirection: SortDirection;
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
  sortDirection: "desc",
  topEnabled: false,
  student: { query: "" },
};
