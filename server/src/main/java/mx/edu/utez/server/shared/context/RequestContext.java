package mx.edu.utez.server.shared.context;

public final class RequestContext {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    public static final String REQUEST_ID_ATTR = "REQUEST_ID";
    public static final String CORRELATION_ID_ATTR = "CORRELATION_ID";

    private static final ThreadLocal<String> REQUEST_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> CORRELATION_ID = new ThreadLocal<>();

    private RequestContext() {
    }

    public static void set(String requestId, String correlationId) {
        REQUEST_ID.set(requestId);
        CORRELATION_ID.set(correlationId);
    }

    public static String requestId() {
        return REQUEST_ID.get();
    }

    public static String correlationId() {
        return CORRELATION_ID.get();
    }

    public static void clear() {
        REQUEST_ID.remove();
        CORRELATION_ID.remove();
    }
}
