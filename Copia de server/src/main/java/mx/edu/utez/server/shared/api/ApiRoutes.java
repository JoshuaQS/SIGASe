package mx.edu.utez.server.shared.api;

/**
 * Rutas bajo {@value #API_SERVLET_PREFIX} (configurado en {@code ApiWebConfiguration}).
 * Mapeos de controlador: {@code @RequestMapping("/v1/...")} → URL HTTP {@code /api/v1/...}.
 */
public final class ApiRoutes {

    public static final String API_SERVLET_PREFIX = "/api";

    public static final String V1 = "/v1";

    public static final String AUTH_ADMIN = V1 + "/auth/admin";
    public static final String AUTH_STUDENT = V1 + "/auth/student";
    public static final String STUDENT_PORTAL = V1 + "/student/portal";
    public static final String STUDENTS = V1 + "/students";
    public static final String ADMINS = V1 + "/admins";
    public static final String ELIBRO_CONFIG = V1 + "/elibro/config";
    public static final String ACCESS_LOGS = V1 + "/access-logs";
    public static final String AUDIT_LOGS = V1 + "/audit-logs";
    public static final String DASHBOARD = V1 + "/dashboard";
    public static final String REPORTS = V1 + "/reports";
    public static final String CAREERS = V1 + "/careers";

    /** Prefijo completo {@code /api/v1} (útil para seguridad, filtros y tests HTTP). */
    public static final String BASE = API_SERVLET_PREFIX + V1;

    /**
     * Ruta HTTP absoluta dentro del servlet (sin context-path de aplicación adicional).
     */
    public static String httpPath(String controllerMapping) {
        return API_SERVLET_PREFIX + controllerMapping;
    }

    private ApiRoutes() {
    }
}
