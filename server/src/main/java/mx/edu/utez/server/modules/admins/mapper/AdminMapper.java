package mx.edu.utez.server.modules.admins.mapper;

import mx.edu.utez.server.modules.admins.dto.AdminResponse;
import mx.edu.utez.server.modules.admins.entity.Admin;
import org.springframework.stereotype.Component;

@Component
public class AdminMapper {

    public AdminResponse toResponse(Admin admin) {
        return new AdminResponse(
                admin.getId(),
                admin.getEmail(),
                admin.getName(),
                admin.getLastNamePaternal(),
                admin.getLastNameMaternal(),
                admin.getRole(),
                admin.isActive(),
                admin.getFailedLoginAttempts(),
                admin.getLockedUntil(),
                admin.getLastLoginAt(),
                admin.getCreatedAt(),
                admin.getUpdatedAt()
        );
    }
}
