package mx.edu.utez.server.modules.admins.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AdminContextService {

    private final AdminRepository adminRepository;

    public AdminContextService(AdminRepository adminRepository) {
        this.adminRepository = adminRepository;
    }

    public Admin requireCurrentAdmin(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "No autenticado.");
        }
        UUID adminId;
        try {
            adminId = UUID.fromString(authentication.getName());
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Sesión inválida.");
        }

        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Sesión inválida."));
        if (!admin.isActive()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Administrador desactivado.");
        }
        return admin;
    }
}
