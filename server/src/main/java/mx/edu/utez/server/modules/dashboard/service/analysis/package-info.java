/**
 * Nuevo pipeline adaptativo de dashboard.
 *
 * <p>Compatibilidad incremental:
 *
 * <ul>
 *   <li>El endpoint nuevo {@code POST /api/v1/dashboard/analysis} convive con el dashboard legacy.
 *   <li>En esta etapa no comparte lógica con {@code DashboardController}/{@code DashboardService}; la migración es progresiva.
 *   <li>Slice actualmente soportados: {@code STUDENTS+ALL+NONE -> OVERVIEW},
 *       {@code STUDENTS+INDIVIDUAL+NONE -> STUDENT_DETAIL},
 *       {@code CAREERS+INDIVIDUAL+NONE -> CAREER_DETAIL}
 *       , {@code STUDENTS+ALL+TOP -> STUDENT_RANKING},
 *       {@code CAREERS+(ALL|MULTI)+TOP+(SUCCESS|FAILED) -> CAREER_RANKING}
 *       y {@code CAREERS+(ALL|MULTI)+TOP+ALL -> CAREER_RANKING_SPLIT}.
 *   <li>Cualquier otro contexto se rechaza explícitamente hasta que se implemente su layout.
 *   <li>Catálogo actual deliberado de {@code topN} para rankings de carrera: {@code 1, 5, 10, 20, 50}.
 *   <li>{@code CAREER_COMPARISON_TABLE} mantiene orden fijo por {@code careerCode} ascendente en este corte.
 *   <li>{@code POST /analysis/options} tolera estados parciales del wizard y puede responder
 *       {@code 200} con {@code canSubmit=false}, {@code nextStep} y
 *       {@code missingRequiredFields} como comportamiento deliberado.
 *   <li>{@code effectiveDefaults} en {@code /analysis/options} solo guía la orquestación del wizard;
 *       no reemplaza la validación final de {@code POST /analysis}.
 *   <li>{@code GET /analysis/metadata} se mantiene como catálogo global/estable y no debe absorber
 *       lógica contextual.
 *   <li>{@code GET /analysis/students/search} y {@code GET /analysis/careers/search} usan búsqueda
 *       simple por {@code LIKE}; {@code q} es obligatorio, {@code q.trim()} requiere al menos
 *       2 caracteres, {@code limit} default es {@code 10}, el máximo es {@code 20}, y el orden
 *       actual es fijo: alumnos por {@code enrollmentId} ascendente y carreras por {@code code}
 *       ascendente.
 *   <li>Autocomplete todavía no implementa matching acentuado ni fuzzy; cualquier evolución en ese
 *       comportamiento debe ser deliberada y tratada como cambio de contrato/comportamiento.
 *   <li>{@code POST /analysis/export} reutiliza el mismo pipeline adaptativo de {@code /analysis}
 *       para validar, normalizar, resolver layout y componer widgets antes de serializar CSV/XLSX.
 *   <li>{@code CSV} es deliberadamente seccionado y humano-legible; no pretende ser un dataset
 *       tabular universal único en este corte.
 *   <li>{@code XLSX} exporta resumen y widgets tabulares por sheets; todavía no embebe gráficas y
 *       cualquier evolución en esa dirección debe ser deliberada.
 *   <li>La evolución de export debe seguir subordinada al {@code layoutType} y a los widgets reales
 *       resueltos por {@code /analysis}; no debe inventar secciones ajenas al contrato principal.
 *   <li>La convivencia con el dashboard legacy está documentada en
 *       {@code server/docs/architecture/dashboard-analysis-legacy-coexistence-plan.md}.
 *   <li>El request principal ya permite un subcontrato acotado de controles tabulares para
 *       {@code STUDENT_ACTIVITY_TABLE} y {@code CAREER_STUDENT_TABLE}; futuras expansiones deben
 *       mantenerse igual de explícitas y versionables.
 * </ul>
 */
package mx.edu.utez.server.modules.dashboard.service.analysis;
