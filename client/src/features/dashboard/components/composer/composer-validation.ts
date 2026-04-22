import { TOP_N_OPTIONS } from './composer.constants'
import type { ComposerState, ComposerValidationResult } from './composer.types'

function isTopNAllowed(topN: number): topN is (typeof TOP_N_OPTIONS)[number] {
  return (TOP_N_OPTIONS as readonly number[]).includes(topN)
}

export function validateComposerState(state: ComposerState): ComposerValidationResult {
  if (!state.filterType) return { isValid: false, reason: 'Selecciona un tipo: Alumno o Carrera.' }
  if (!state.scope) return { isValid: false, reason: 'Selecciona un alcance.' }
  if (!state.accessType) return { isValid: false, reason: 'Selecciona el tipo de acceso (Exitosos / Fallidos / Ambos).' }

  if (state.dateEnabled) {
    if (!state.dateRange.from || !state.dateRange.to) {
      return { isValid: false, reason: 'Si el filtro de fecha está activo, selecciona un rango completo.' }
    }
  }

  if (!isTopNAllowed(state.topN)) {
    return { isValid: false, reason: 'Top N inválido.' }
  }

  if (state.filterType === 'alumno') {
    if (state.scope !== 'individual' && state.scope !== 'todos') {
      return { isValid: false, reason: 'Alcance inválido para Alumno.' }
    }

    if (state.scope === 'individual') {
      if (!state.selectedStudentId) return { isValid: false, reason: 'Alumno individual requiere studentId.' }
      if (state.rankingEnabled) return { isValid: false, reason: 'Alumno individual no usa ranking.' }
    }

    return { isValid: true }
  }

  // Carrera
  if (state.scope !== 'individual' && state.scope !== 'varias' && state.scope !== 'todas') {
    return { isValid: false, reason: 'Alcance inválido para Carrera.' }
  }

  if (state.scope === 'individual') {
    if (state.selectedCareerIds.length !== 1) {
      return { isValid: false, reason: 'Carrera individual requiere exactamente 1 careerId.' }
    }
    if (state.rankingEnabled) return { isValid: false, reason: 'Carrera individual no usa ranking.' }
  }

  if (state.scope === 'varias') {
    if (state.selectedCareerIds.length < 2) {
      return { isValid: false, reason: 'Carreras múltiples requiere mínimo 2 careerIds.' }
    }
    if (!state.rankingEnabled) {
      return { isValid: false, reason: 'Carreras múltiples siempre usan ranking.' }
    }
  }

  if (state.scope === 'todas') {
    if (!state.rankingEnabled) {
      return { isValid: false, reason: 'Todas las carreras siempre usan ranking.' }
    }
  }

  return { isValid: true }
}

