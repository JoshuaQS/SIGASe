import { z } from "zod";
import { resolveFilterFamily } from "./composer.utils";
import type { MonitoringFilterFamily } from "./composer.types";

const TOP_N_STUDENT_ALL = [5, 10, 15, 20, 25, 30] as const;
const TOP_N_CAREER_MULTI = [5, 10] as const;

export const composerDraftSchema = z
  .object({
    type: z.enum(["students", "careers"]).optional(),
    studentMode: z.enum(["individual", "all"]).optional(),
    student: z
      .object({ query: z.string(), selectedId: z.string().optional() })
      .optional(),
    careers: z.array(z.string()).optional(),
    status: z.enum(["ALL", "SUCCESS", "FAILED"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    topEnabled: z.boolean().optional(),
    topN: z.number().optional(),
    dateRange: z
      .object({ from: z.date().optional(), to: z.date().optional() })
      .optional(),
    didFilter: z.boolean().optional(),
    mode: z
      .enum(["single-student", "all-students", "single-career", "all-careers"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    const family = resolveFilterFamily(data);

    // Draft incomplete — just invalid, no field-level errors without context.
    if (!family) return;

    if (!data.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "Requerido",
      });
    }

    if (family === "student_individual" && !data.student?.selectedId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["student", "selectedId"],
        message: "Selecciona un estudiante",
      });
    }

    // student_all: sortDirection required
    if (family === "student_all" && !data.sortDirection) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sortDirection"],
        message: "Requerido para todos los estudiantes",
      });
    }

    // student_all: topN must be in allowed set when topEnabled
    if (family === "student_all" && data.topEnabled === true) {
      if (
        data.topN === undefined ||
        !(TOP_N_STUDENT_ALL as readonly number[]).includes(data.topN)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["topN"],
          message: `Ranking debe ser uno de: ${TOP_N_STUDENT_ALL.join(", ")}`,
        });
      }
    }

    // career_multi: sortDirection required
    if (family === "career_multi" && !data.sortDirection) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sortDirection"],
        message: "Requerido para múltiples carreras",
      });
    }

    // career_multi: topN must be in allowed set when topEnabled
    if (family === "career_multi" && data.topEnabled === true) {
      if (
        data.topN === undefined ||
        !(TOP_N_CAREER_MULTI as readonly number[]).includes(data.topN)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["topN"],
          message: `Ranking debe ser uno de: ${TOP_N_CAREER_MULTI.join(", ")}`,
        });
      }
    }
  });

export type ComposerDraftInput = z.input<typeof composerDraftSchema>;

/**
 * Validates a ComposerDraftState against the canonical schema.
 * Returns { valid, family } — does NOT throw.
 */
export function validateComposerDraft(state: ComposerDraftInput): {
  valid: boolean;
  family: MonitoringFilterFamily | null;
} {
  const result = composerDraftSchema.safeParse(state);
  const family = resolveFilterFamily(state);
  return { valid: result.success, family };
}
