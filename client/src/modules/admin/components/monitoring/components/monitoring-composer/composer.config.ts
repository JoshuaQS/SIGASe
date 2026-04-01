import type { AnalysisMode, ComposerFieldKey } from "./composer.types";

export const MODE_FIELDS = {
  "single-student": ["student", "status", "dateRange"],
  "all-students": ["status", "dateRange", "sortDirection", "topN"],
  "single-career": ["career", "status", "dateRange", "sortDirection", "topN"],
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
  "single-career": {
    mode: 3,
    career: 3,
    status: 2,
    dateRange: 2,
    sortDirection: 2,
    topN: 2,
  },
  "all-careers": {
    mode: 3,
    status: 2,
    dateRange: 3,
    sortDirection: 2,
    topN: 2,
  },
};

export const TOP_N_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

export const STUDENT_OPTIONS = [
  { id: "st-001", name: "Emma Rodríguez" },
  { id: "st-002", name: "James Chen" },
  { id: "st-003", name: "Sarah Kim" },
  { id: "st-004", name: "Michael Okafor" },
  { id: "st-005", name: "Priya Sharma" },
] as const;

export const CAREER_OPTIONS = [
  "Ingeniería de Software",
  "Ciencia de Datos",
  "Gestión de Producto",
  "Diseño UX",
  "Marketing",
  "Finanzas",
  "Salud",
  "Educación",
  "Consultoría",
  "Ciberseguridad",
] as const;
