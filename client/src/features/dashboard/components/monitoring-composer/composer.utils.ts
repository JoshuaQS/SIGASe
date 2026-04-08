import { MODE_FIELDS, MODE_LAYOUT_SPANS } from "./composer.config";
import type {
  AnalysisMode,
  ComposerFieldKey,
  ComposerDraftState,
  MonitoringFilterFamily,
  MonitoringResolvedQuery,
} from "./composer.types";

export const getMode = (state: ComposerDraftState): AnalysisMode => state.mode ?? "all-students";

export const getVisibleFields = (mode: AnalysisMode): readonly ComposerFieldKey[] => MODE_FIELDS[mode];

export const getSpan = (mode: AnalysisMode, key: "mode" | ComposerFieldKey): number => {
  return MODE_LAYOUT_SPANS[mode][key] ?? 12;
};

export const modeResultDescription: Record<AnalysisMode, string> = {
  "single-student": "Resultado principal: 1 estudiante",
  "all-students": "Resultado principal: lista de estudiantes",
  "single-career": "Resultado principal: lista de estudiantes de la carrera seleccionada",
  "all-careers": "Resultado principal: lista de carreras",
};

export const sortTopSemanticHint: Record<AnalysisMode, string | null> = {
  "single-student": null,
  "all-students": "Orden y top se aplican sobre estudiantes.",
  "single-career": null,
  "all-careers": "Orden y top se aplican sobre carreras por volumen de accesos.",
};

// ─── Canonical family resolver ───────────────────────────────────────────────

/**
 * Resolves the canonical filter family from a draft state.
 * The family is derived exclusively from type + studentMode + careers.length.
 * The `mode` field in the draft is NOT the source of truth here.
 *
 * Returns null when the draft is incomplete (e.g. no type, no studentMode,
 * no careers, or individual without a selected student).
 */
export function resolveFilterFamily(state: ComposerDraftState): MonitoringFilterFamily | null {
  if (state.type === "students") {
    if (state.studentMode === "individual") {
      return state.student?.selectedId ? "student_individual" : null;
    }
    if (state.studentMode === "all") {
      return "student_all";
    }
    return null;
  }

  if (state.type === "careers") {
    const count = state.careers?.length ?? 0;
    if (count === 1) return "career_single";
    if (count >= 2) return "career_multi";
    return null;
  }

  return null;
}

/**
 * Builds a clean, noise-free resolved query from a valid draft state.
 * Returns null when the family cannot be resolved or accessType is missing.
 *
 * Fields that don't apply to the resolved family are omitted entirely
 * (not set to undefined) so consumers can safely spread or check presence.
 */
export function resolveMonitoringQuery(
  state: ComposerDraftState,
): MonitoringResolvedQuery | null {
  const family = resolveFilterFamily(state);
  if (!family) return null;
  if (!state.status) return null;

  const dateRange =
    state.dateRange?.from && state.dateRange?.to
      ? { from: state.dateRange.from, to: state.dateRange.to }
      : undefined;

  const base = {
    family,
    accessType: state.status,
    ...(dateRange ? { dateRange } : {}),
  } as MonitoringResolvedQuery;

  if (family === "student_individual") {
    return {
      ...base,
      studentId: state.student!.selectedId!,
    };
  }

  if (family === "student_all") {
    const topN =
      state.topEnabled === true && state.topN !== undefined ? state.topN : undefined;
    return {
      ...base,
      sortDirection: state.sortDirection ?? "desc",
      ...(topN !== undefined ? { topN } : {}),
    };
  }

  if (family === "career_single") {
    return {
      ...base,
      careerCodes: [state.careers![0]],
    };
  }

  // career_multi
  const topN =
    state.topEnabled === true && state.topN !== undefined ? state.topN : undefined;
  return {
    ...base,
    careerCodes: state.careers!,
    sortDirection: state.sortDirection ?? "desc",
    ...(topN !== undefined ? { topN } : {}),
  };
}
