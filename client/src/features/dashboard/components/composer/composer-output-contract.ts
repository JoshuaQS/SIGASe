import type { ComposerOutputContract, ComposerState } from './composer.types'
import { validateComposerState } from './composer-validation'

function accessLabel(accessType: ComposerState['accessType']) {
  if (accessType === 'exitoso') return 'Accesos a eLibro: Exitosos'
  if (accessType === 'fallido') return 'Accesos a eLibro: Fallidos'
  return 'Accesos a eLibro: Ambos'
}

function maybeDateBadge(state: ComposerState) {
  if (!state.dateEnabled || !state.dateRange.from || !state.dateRange.to) return null
  const from = state.dateRange.from.toLocaleDateString('es-MX')
  const to = state.dateRange.to.toLocaleDateString('es-MX')
  return `Rango: ${from} - ${to}`
}

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)))
}

export function getComposerOutputContract(state: ComposerState): ComposerOutputContract | null {
  const validation = validateComposerState(state)
  if (!validation.isValid) return null

  const dateBadge = maybeDateBadge(state)

  if (state.filterType === 'alumno' && state.scope === 'individual') {
    const badges = uniq([
      'Estudiantes · Individual',
      accessLabel(state.accessType),
      dateBadge ?? '',
      'Matrícula alumno (dato del backend)',
    ])

    const charts =
      state.accessType === 'ambos'
        ? ['Gráfica de accesos eLibro exitosos y fallidos']
        : [state.accessType === 'exitoso' ? 'Gráfica de accesos eLibro exitosos' : 'Gráfica de accesos eLibro fallidos']

    const kpis =
      state.accessType === 'ambos'
        ? [
            'Nombre completo alumno',
            'Accesos eLibro totales',
            'Accesos a eLibro: Exitosos',
            'Accesos a eLibro: Fallidos',
          ]
        : [
            'Nombre completo alumno',
            'Accesos eLibro totales',
            accessLabel(state.accessType),
            state.accessType === 'exitoso' ? 'Tasa de éxito eLibro' : 'Tasa de fallo eLibro',
          ]

    return {
      context: { title: 'Alcance: nombre del estudiante (dato del backend)', badges },
      kpis,
      charts,
      tables: [],
      rankings: [],
    }
  }

  if (state.filterType === 'alumno' && state.scope === 'todos') {
    const badges = uniq([
      'Estudiantes · Todos',
      accessLabel(state.accessType),
      dateBadge ?? '',
      state.rankingEnabled ? `Top ${state.topN}` : '',
      `Orden: ${state.sortOrder === 'asc' ? 'ASC' : 'DESC'}`,
    ])

    const charts =
      state.accessType === 'ambos'
        ? ['Gráfica de accesos eLibro exitosos y fallidos']
        : [state.accessType === 'exitoso' ? 'Gráfica de accesos eLibro exitosos' : 'Gráfica de accesos eLibro fallidos']

    const tables =
      state.accessType === 'ambos'
        ? ['Tabla general de estudiantes']
        : [
            state.accessType === 'exitoso'
              ? 'Tabla de estudiantes con accesos eLibro exitosos'
              : 'Tabla de estudiantes con accesos eLibro fallidos',
          ]

    const rankings =
      state.rankingEnabled
        ? state.accessType === 'ambos'
          ? [
              'Top estudiantes con más accesos a eLibro exitosos',
              'Top estudiantes con más accesos a eLibro fallidos',
            ]
          : [
              state.accessType === 'exitoso'
                ? 'Top estudiantes con más accesos a eLibro exitosos'
                : 'Top estudiantes con más accesos a eLibro fallidos',
            ]
        : []

    const kpis =
      state.accessType === 'ambos'
        ? [
            'Estudiantes analizados',
            'Accesos eLibro totales',
            'Accesos a eLibro: Exitosos',
            'Accesos a eLibro: Fallidos',
          ]
        : [
            'Estudiantes analizados',
            'Accesos eLibro totales',
            accessLabel(state.accessType),
            state.accessType === 'exitoso' ? 'Tasa de éxito eLibro' : 'Tasa de fallo eLibro',
          ]

    return {
      context: { title: 'Alcance: Todos los estudiantes', badges },
      kpis,
      charts,
      tables,
      rankings,
    }
  }

  if (state.filterType === 'carrera' && state.scope === 'individual') {
    const badges = uniq([
      'Carreras · Individual',
      accessLabel(state.accessType),
      dateBadge ?? '',
      'Código carrera (dato del backend)',
    ])

    const charts =
      state.accessType === 'ambos'
        ? ['Gráfica de accesos eLibro exitosos y fallidos']
        : [state.accessType === 'exitoso' ? 'Gráfica de accesos eLibro exitosos' : 'Gráfica de accesos eLibro fallidos']

    const tables =
      state.accessType === 'ambos'
        ? ['Tabla general de estudiantes de esa carrera']
        : [
            state.accessType === 'exitoso'
              ? 'Tabla de estudiantes de esa carrera con accesos eLibro exitosos'
              : 'Tabla de estudiantes de esa carrera con accesos eLibro fallidos',
          ]

    const kpis =
      state.accessType === 'ambos'
        ? [
            'Estudiantes de la carrera',
            'Accesos eLibro totales',
            'Accesos a eLibro: Exitosos',
            'Accesos a eLibro: Fallidos',
          ]
        : [
            'Estudiantes de la carrera',
            'Accesos eLibro totales',
            accessLabel(state.accessType),
            state.accessType === 'exitoso' ? 'Tasa de éxito eLibro' : 'Tasa de fallo eLibro',
          ]

    return {
      context: { title: 'Alcance: nombre de la carrera (dato del backend)', badges },
      kpis,
      charts,
      tables,
      rankings: [],
    }
  }

  if (state.filterType === 'carrera' && state.scope === 'varias') {
    const badges = uniq([
      'Carreras · Múltiples',
      accessLabel(state.accessType),
      dateBadge ?? '',
      `${state.selectedCareerIds.length} carreras`,
      `Top ${state.topN}`,
      `Orden: ${state.sortOrder === 'asc' ? 'ASC' : 'DESC'}`,
    ])

    const kpis =
      state.accessType === 'ambos'
        ? [
            'Carreras analizadas',
            'Accesos eLibro totales',
            'Accesos a eLibro: Exitosos',
            'Accesos a eLibro: Fallidos',
          ]
        : [
            'Carreras analizadas',
            'Accesos eLibro totales',
            accessLabel(state.accessType),
            state.accessType === 'exitoso' ? 'Tasa de éxito eLibro' : 'Tasa de fallo eLibro',
          ]

    const rankings =
      state.accessType === 'ambos'
        ? [
            'Ranking top carreras con más accesos a eLibro exitosos',
            'Ranking top carreras con más accesos a eLibro fallidos',
          ]
        : [
            state.accessType === 'exitoso'
              ? 'Ranking top carreras con más accesos a eLibro exitosos'
              : 'Ranking top carreras con más accesos a eLibro fallidos',
          ]

    return {
      context: { title: 'Alcance: Carreras seleccionadas', badges },
      kpis,
      charts: [],
      tables: [],
      rankings,
    }
  }

  // Todas las carreras
  const badges = uniq([
    'Carreras · Todas',
    accessLabel(state.accessType),
    dateBadge ?? '',
    `Top ${state.topN}`,
    `Orden: ${state.sortOrder === 'asc' ? 'ASC' : 'DESC'}`,
  ])

  const kpis =
    state.accessType === 'ambos'
      ? [
          'Carreras analizadas',
          'Accesos eLibro totales',
          'Accesos a eLibro: Exitosos',
          'Accesos a eLibro: Fallidos',
        ]
      : [
          'Carreras analizadas',
          'Accesos eLibro totales',
          accessLabel(state.accessType),
          state.accessType === 'exitoso' ? 'Tasa de éxito eLibro' : 'Tasa de fallo eLibro',
        ]

  const rankings =
    state.accessType === 'ambos'
      ? [
          'Ranking top carreras con más accesos a eLibro exitosos',
          'Ranking top carreras con más accesos a eLibro fallidos',
        ]
      : [
          state.accessType === 'exitoso'
            ? 'Ranking top carreras con más accesos a eLibro exitosos'
            : 'Ranking top carreras con más accesos a eLibro fallidos',
        ]

  return {
    context: { title: 'Alcance: Todas las carreras', badges },
    kpis,
    charts: [],
    tables: [],
    rankings,
  }
}

