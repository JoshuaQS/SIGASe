package mx.edu.utez.server.shared.api;

public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        int status
) {
}
