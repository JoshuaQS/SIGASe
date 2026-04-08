package mx.edu.utez.server.modules.admins.dto;

public record AdminRoleModuleActivityResponse(
        String role,
        String module,
        long count
) {
}
