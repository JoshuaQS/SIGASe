# Composer.tsx Audit and Refactor Plan

## Scope
This document audits:
- `client/src/features/dashboard/components/composer/composer.tsx`

And provides:
- objective complexity signals
- maintainability and risk assessment
- a concrete refactor blueprint
- a phased migration and verification strategy

## Qué Es Y Qué Hace El Componente
`composer.tsx` es el **wizard modal** que permite construir la consulta de análisis del módulo de Monitoreo y Reportes.

Su propósito es transformar decisiones de UI (tipo de filtro, alcance, selección, resultado, fechas, ranking y orden) en un `DashboardAnalysisRequest` válido para el backend, mostrando además una vista previa visual del dashboard esperado.

### Dónde se usa
- Se monta desde `composer-shell.tsx`, que abre/cierra el modal y conecta acciones de `apply/reset`.
- Impacta directamente la pantalla `monitoring-and-reports-page.tsx`.

### Entradas (props)
- Estado de visibilidad del diálogo (`open`, `onOpenChange`).
- Metadatos del dashboard (`metadata`).
- Callbacks de integración (`onApply`, `onReset`).
- Señal externa de reinicio (`resetSignal`) y contexto visual opcional.

### Salidas (efectos)
- Construye y envía `DashboardAnalysisRequest` al ejecutar “Aplicar análisis”.
- Dispara feedback visual (toast de éxito).
- Emite reseteos de configuración al presionar reset.
- No persiste datos por sí mismo; delega persistencia/ejecución a callbacks del contenedor.

### Flujo funcional resumido
1. Usuario define tipo (`alumno`/`carrera`) y alcance (`individual`, `varias`, `todos`, `todas`).
2. Usuario selecciona entidades (alumno o carreras) con búsqueda/autocomplete.
3. Usuario define filtros complementarios (resultado, fechas, ranking, sort).
4. Componente valida completitud (`composer.isComplete`).
5. Mapea estado UI a payload backend (`toDashboardRequest`) y lo envía vía `onApply`.
6. Renderiza vista previa condicionada para comunicar cómo quedaría el dashboard.

### Dependencias clave
- `useFilterComposer` para estado base y reglas de completitud.
- APIs de búsqueda (`searchDashboardStudents`, `searchDashboardCareers`, `listActiveCareers`).
- Componentes DS (Dialog, Button, Select, Popover, Input, Badge, Switch, Stepper, DateRangeSelector).

## Executive Summary
`composer.tsx` is functionally rich but structurally overloaded. It currently combines orchestration, business mapping, async data fetching, and a very large JSX tree (wizard + selectors + preview) in one file.

### Recommendation
Refactor is **recommended** and should be done in phases. The goal is not cosmetic cleanup; the main value is reducing regression risk and improving change speed for dashboard filtering features.

## Current State (Measured)
File metrics (captured from current source):
- Lines: **1898**
- Characters: **83488**
- `useState`: **5**
- `useEffect`: **4**
- `useMemo`: **3**
- `useCallback`: **2**
- `if (` occurrences: **33**
- ternary occurrences (` ? `): **135**

Interpretation:
- The component has high branching density and large UI-condition matrix.
- It is carrying multiple responsibilities that should be isolated.

## Responsibility Analysis
`composer.tsx` currently handles all of the following concerns:

1. **UI composition**
- dialog shell
- stepper orchestration
- forms for filter type/scope/access/sort/ranking/date
- autocomplete selectors
- action buttons

2. **Domain/request mapping**
- `mapAccessType(...)`
- `toDashboardRequest(...)`

3. **Preview rendering logic**
- large conditional preview variants for:
  - student individual vs student all
  - career individual/multi/all
  - success/failure/both
  - ranking on/off
  - date filter state

4. **Async data interactions**
- students query (debounced/deferred input)
- careers query + cache fallback
- local sync between selected IDs and labels/codes

5. **State cleanup/resets**
- reset paths in multiple actions/effects

This violates separation of concerns and increases blast radius for simple feature changes.

## Architectural Risks

### 1) Regression Risk (High)
Any change in one branch can silently affect another branch due to tightly coupled JSX and shared local state.

### 2) Testing Friction (High)
A large amount of behavior requires full component mounting to validate; pure logic extraction points are limited.

### 3) Reviewability/Onboarding Cost (High)
Code review and onboarding take longer because mental model includes both domain and UI matrix in one place.

### 4) Merge Conflict Probability (Medium-High)
Single-file hotspot likely receives frequent edits from multiple tasks.

### 5) Bug Fix Latency (Medium)
Small bug fixes often require touching unstable blocks with many conditions.

## What Is Good (Keep)
- Existing `useFilterComposer` hook already isolates core filter state transitions.
- Request assembly is explicit and readable.
- UI behavior is consistent with shared DS components.
- Current functionality is complete and feature-rich.

## Refactor Decision Criteria
Refactor should proceed now if at least one is true:
- Composer continues to receive feature requests (very likely).
- Team is already fixing frequent UI/logic regressions.
- Multiple engineers edit this area.

Refactor can be postponed only if:
- Composer is effectively frozen for the next release cycle.
- No new filter/preview behavior is expected.

Given current change history and volatility, **postponing increases net risk**.

## Target Architecture (Proposed)

### A. `composer-request-mapper.ts` (pure domain mapping)
Move:
- `mapAccessType`
- `toDashboardRequest`

Benefits:
- unit-testable in isolation
- keeps `Composer` focused on orchestration

### B. `use-composer-data-sources.ts` (async and cache)
Own:
- student search lifecycle
- career search lifecycle
- label/code cache hydration
- loading and race cancellation patterns

Benefits:
- prevents async side effects from bloating render component

### C. `composer-filter-wizard.tsx` (left panel)
Own:
- filter type/scope selection
- student and career selectors
- access, sort, ranking, date controls
- footer actions (reset/apply)

### D. `composer-student-selector.tsx`
Own:
- input + list + selected snapshot view

### E. `composer-career-selector.tsx`
Own:
- popover, chip rendering, search input, list selection

### F. `composer-preview-panel.tsx`
Own:
- all preview visual states based on normalized props

### G. `composer-preview-model.ts` (optional but recommended)
- derive a normalized preview model from `FilterState`:
  - `mode`, `resultType`, `showRanking`, `showDate`, etc.
- keep JSX simpler with fewer raw condition combinations

## Migration Plan (Phased, Low-Risk)

### Phase 1: Pure logic extraction
- Extract request mapping functions.
- Add unit tests for mapping permutations.
- No UI behavior changes.

### Phase 2: Async extraction
- Move students/careers fetch + cache logic to `use-composer-data-sources`.
- Keep same UI props and events.

### Phase 3: Selector component split
- Extract `StudentSelector` and `CareerSelector`.
- Preserve public behavior and styling.

### Phase 4: Preview split
- Extract `PreviewPanel` and optionally `preview-model` helpers.
- Add focused snapshot/behavior tests by mode.

### Phase 5: Cleanup
- remove dead params and duplicated reset code paths
- unify reset semantics into a single function
- ensure strict typing for selector display labels/codes

## Testing Strategy for Refactor

### Unit tests
- request mapping by mode/scope/access/ranking/date
- preview model derivation (if introduced)

### Component tests
- student selector:
  - min chars behavior
  - loading state
  - selection behavior
- career selector:
  - single/multi behavior
  - chips and removal
  - scrollable options behavior

### Integration tests
- full composer flow:
  - choose type/scope
  - select entity/entities
  - apply analysis
  - verify payload shape

### Manual QA checklist
- all scope transitions reset dependent state correctly
- date filter and ranking toggles do not leak stale values
- chips labels and selected state consistency
- modal scroll interactions remain stable

## Estimated Effort
- Phase 1: 0.5 day
- Phase 2: 0.5 to 1 day
- Phase 3: 1 day
- Phase 4: 1 to 1.5 days
- Phase 5 + QA hardening: 0.5 to 1 day

Total: **3.5 to 5 days** (single engineer), less with parallel work.

## Suggested Component Contract Sketch

```ts
// composer-filter-wizard.tsx
export type ComposerFilterWizardProps = {
  state: FilterState
  isComplete: boolean
  selectedStudentLabel?: string | null
  onSetFilterType: (type: FilterType | null) => void
  onSetScope: (scope: Scope | null) => void
  onSetAccessType: (type: AccessType | null) => void
  onSetSortOrder: (order: SortOrder) => void
  onSetDateFilter: (enabled: boolean) => void
  onSetDateRange: (range: DateRange) => void
  onSetRanking: (enabled: boolean) => void
  onSetTopN: (n: number) => void
  onReset: () => void
  onApply: () => void
}
```

## Acceptance Criteria for “Refactor Complete”
- No user-visible behavior regressions.
- `composer.tsx` reduced to orchestration + layout shell.
- request mapping fully unit-tested.
- selectors and preview are independently testable.
- existing build and lint pass.

## Final Recommendation
Proceed with phased refactor. This file is past the maintainability threshold for a high-change area. The proposed split reduces risk, improves testability, and lowers future delivery cost without changing business behavior.

---

## Engineering Addendum: Contract, State, Cases, Stability

### 1) Contrato real de `DashboardAnalysisRequest`

Fuente de verdad backend:
- `server/.../dto/DashboardAnalysisRequest.java`
- `server/.../service/analysis/DashboardAnalysisValidator.java`
- `server/.../service/analysis/DashboardAnalysisNormalizer.java`
- `server/.../service/analysis/DashboardAnalysisSupportMatrix.java`

#### Enums exactos
- `scope`: `STUDENTS | CAREERS`
- `mode`: `INDIVIDUAL | ALL | MULTI`
- `accessResult`: `ALL | SUCCESS | FAILED`
- `dateFilterType`: `NONE | CUSTOM_RANGE`
- `rankingMode`: `NONE | TOP`
- `sortDirection`: `ASC | DESC`

#### Campos del request (shape)
- `scope` (`required` en runtime)
- `mode` (`required` en runtime)
- `studentId` (`UUID | null`)
- `careerIds` (`List<UUID> | null`)
- `accessResult` (`optional`, default backend `ALL`)
- `dateFilterType` (`optional`, default backend `NONE`)
- `dateFrom` (`optional`, required solo si `CUSTOM_RANGE`)
- `dateTo` (`optional`, required solo si `CUSTOM_RANGE`)
- `rankingMode` (`optional`, default backend `NONE`)
- `topN` (`optional`, pero obligatorio en layouts rankeables)
- `sortDirection` (`optional`, default backend `DESC`)
- `widgetControls` (`optional`)

#### Defaults esperados por backend
- Metadata defaults globales:
  - `accessResult=ALL`
  - `dateFilterType=NONE`
  - `rankingMode=NONE`
  - `sortDirection=DESC`
- Normalizer defaults efectivos:
  - `accessResult` null -> `ALL`
  - `dateFilterType` null -> `NONE`
  - `rankingMode` null -> `NONE`
  - `sortDirection` null -> `DESC`
  - Si `dateFilterType=NONE`: rango efectivo = últimos `30` días (`DEFAULT_ROLLING_RANGE_DAYS`)

#### Casos inválidos que backend rechaza (explícitos)
- `scope` null.
- `mode` null.
- `rankingMode != NONE` fuera de layouts rankeables (solo `STUDENTS+ALL+TOP`, `CAREERS+(ALL|MULTI)+TOP`).
- `topN` enviado cuando el layout no soporta ranking.
- `scope=STUDENTS` con `careerIds`.
- `scope=STUDENTS mode=INDIVIDUAL` sin `studentId`.
- `scope=STUDENTS mode=ALL` con `studentId`.
- `scope=STUDENTS` con `mode` distinto de `ALL|INDIVIDUAL`.
- `scope=CAREERS` con `studentId`.
- `scope=CAREERS` no rankeable con `mode` distinto de `INDIVIDUAL`.
- `scope=CAREERS mode=INDIVIDUAL` con `careerIds` distinto de tamaño 1.
- `scope=CAREERS mode=MULTI` rankeable sin `careerIds`.
- `scope=CAREERS mode=ALL` con `careerIds` no vacío.
- `topN` fuera de catálogo:
  - estudiantes ranking: `{1,5,10,20,50}`
  - carreras ranking: `{1,5,10,20,50}`
- `dateFilterType=CUSTOM_RANGE` sin `dateFrom`/`dateTo`.
- `dateFrom > dateTo`.
- `dateFrom/dateTo` enviados cuando `dateFilterType != CUSTOM_RANGE`.
- `widgetControls.studentActivityTable` fuera de `STUDENT_DETAIL`.
- `widgetControls.careerStudentTable` fuera de `CAREER_DETAIL`.
- `widgetControls.*.page < 0`, `size` fuera de rango, o `sortBy` fuera de catálogo permitido.

### 2) Forma exacta de `FilterState` / `useFilterComposer`

Fuente:
- `client/.../composer/useFilterComposer.ts`
- `client/.../composer/composer.tsx`

#### Estado controlado por `useFilterComposer`
- `filterType: 'alumno' | 'carrera' | null`
- `scope: 'individual' | 'todos' | 'varias' | 'todas' | null`
- `selectedStudent: string | null`
- `selectedCareers: string[]`
- `accessType: 'exitoso' | 'fallido' | 'ambos' | null`
- `dateFilter: boolean`
- `dateRange: { from?: Date; to?: Date }`
- `sortOrder: 'asc' | 'desc'`
- `ranking: boolean`
- `topN: number`

#### Estado local que quedó en `composer.tsx`
- `studentSearch`
- `careerSearch`
- `studentsLoading`
- `careersLoading`
- `careerComboboxOpen`
- `careerCatalogCache`
- `students`
- `careers`
- `careerLabelById`
- `careerCodeById`
- `selectedStudentSnapshot`

#### Acciones de reset de dependencias ya existentes
- `setFilterType`:
  - resetea todo a `DEFAULT_FILTER_STATE` y luego fija `filterType`.
- `setScope`:
  - limpia `selectedStudent`, `selectedCareers`, `ranking=false`, `topN=default`.
- `setDateFilter(false)`:
  - limpia `dateRange`.
- `reset()`:
  - restaura `DEFAULT_FILTER_STATE`.
- Además, `composer.tsx` resetea estado local de autocomplete/cache en:
  - `useEffect` dependiente de `resetSignal`.
  - handlers de cambio de tipo/scope y selección.

### 3) Casos funcionales vigentes (matriz actual)

Mapeo de resultados UI -> backend:
- `exitoso -> SUCCESS`
- `fallido -> FAILED`
- `ambos -> ALL`

#### Casos solicitados
- `alumno individual`
  - payload: `scope=STUDENTS, mode=INDIVIDUAL, studentId!=null, rankingMode=NONE`.
  - backend: válido.
  - fecha: UI sí permite toggle de fecha.
- `alumnos todos`
  - payload: `scope=STUDENTS, mode=ALL`.
  - backend: válido.
  - ranking:
    - UI permite activar ranking.
    - backend acepta `TOP` con `topN` de catálogo.
- `carrera individual`
  - payload: `scope=CAREERS, mode=INDIVIDUAL, careerIds=[1]`.
  - backend: válido.
  - ranking: backend no permite `TOP`; UI tampoco lo habilita para este caso.
- `carreras múltiples`
  - payload: `scope=CAREERS, mode=MULTI, careerIds=[n>=2]`.
  - backend:
    - `rankingMode=TOP`: válido.
    - `rankingMode=NONE`: inválido (backend restringe `CAREERS MULTI` a familia rankeable).
  - estado actual UI:
    - obliga mínimo 2 carreras y permite ranking toggle.
- `todas las carreras`
  - payload: `scope=CAREERS, mode=ALL, careerIds=null`.
  - backend:
    - `rankingMode=TOP`: válido.
    - `rankingMode=NONE`: inválido.
- `resultado ALL|SUCCESS|FAILED`
  - backend acepta los tres en análisis actual.
  - para `CAREER_RANKING`:
    - `ALL` produce layout split (`CAREER_RANKING_SPLIT`).
    - `SUCCESS|FAILED` produce `CAREER_RANKING`.
- `ranking activo/inactivo`
  - backend permite `TOP` solo en:
    - `STUDENTS+ALL`
    - `CAREERS+ALL|MULTI`
  - `ranking=NONE` fuera de esos casos.
- `fechas activas/inactivas`
  - backend soporta `CUSTOM_RANGE` y `NONE` en general.
  - observación UX actual:
    - en UI, fecha solo se expone en rama no-group (`!isGroupScope`), no en rankings group.
    - esto es una restricción de UI, no del contrato backend.

### 4) Qué está estable y qué cambia

#### Estable (alto valor para extraer primero)
- Contrato de enums base y shape del request.
- Reglas de validación centralizadas en `DashboardAnalysisValidator`.
- Defaults base (`ALL/NONE/NONE/DESC`) y ventana rolling 30 días.
- Catálogos de `topN` y sort defaults de ranking.

#### En evolución (conviene desacoplar pronto)
- `PreviewPanel` y su matriz visual (ramas por scope/mode/result/ranking/date).
- UX de selectores (combobox, chips, scroll y comportamiento visual).
- Reglas de exposición de controles en UI (por ejemplo fecha en group scopes).

#### Orden recomendado de extracción
1. Extraer mapper/request builder con tests (estable y crítico de contrato).
2. Extraer hook de data sources (students/careers autocomplete + cache).
3. Separar preview panel en componente dedicado (zona de mayor churn visual).
4. Separar selectors y wizard sections para reducir conflictos de merge.
