/**
 * Nuevo pipeline adaptativo de dashboard.
 *
 * <p>Compatibilidad incremental:
 *
 * <ul>
 *   <li>El endpoint nuevo {@code POST /api/v1/dashboard/analysis} convive con el dashboard legacy.
 *   <li>En esta etapa no comparte lógica con {@code DashboardController}/{@code DashboardService}; la migración es progresiva.
 *   <li>Slice actualmente soportados: {@code STUDENTS+ALL+NONE -> OVERVIEW} y {@code STUDENTS+INDIVIDUAL+NONE -> STUDENT_DETAIL}.
 *   <li>Cualquier otro contexto se rechaza explícitamente hasta que se implemente su layout.
 * </ul>
 */
package mx.edu.utez.server.modules.dashboard.service.analysis;
