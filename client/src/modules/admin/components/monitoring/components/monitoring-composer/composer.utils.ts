import { MODE_FIELDS, MODE_LAYOUT_SPANS } from "./composer.config";
import type { AnalysisMode, ComposerFieldKey, ComposerDraftState } from "./composer.types";

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
  "single-career": "Si no hay top activo, el resultado base sigue siendo la lista completa de estudiantes de esa carrera, filtrada por estado y rango; al activar top, se limita esa misma lista ordenada.",
  "all-careers": "Orden y top se aplican sobre carreras por volumen de accesos.",
};
