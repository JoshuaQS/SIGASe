package mx.edu.utez.server.modules.admins.service;

import mx.edu.utez.server.modules.admins.dto.AdminActionCountResponse;
import mx.edu.utez.server.modules.admins.dto.AdminDashboardMetricsResponse;
import mx.edu.utez.server.modules.admins.dto.AdminRecentActivityResponse;
import mx.edu.utez.server.modules.admins.dto.AdminRoleModuleActivityResponse;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.AuditActorType;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private static final int ACTION_COUNT_LIMIT = 200;

    private final AdminRepository adminRepository;
    private final AuditLogRepository auditLogRepository;

    public AdminDashboardService(AdminRepository adminRepository, AuditLogRepository auditLogRepository) {
        this.adminRepository = adminRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public AdminDashboardMetricsResponse getDashboardMetrics() {

        // ── 1. Admin counts ───────────────────────────────────────────────
        long totalAdmins   = adminRepository.count();
        long adminTiCount  = adminRepository.countByRole(AdminRole.ADMIN_TI);
        long activeAdmins  = adminRepository.countByStatus(AdminStatus.ACTIVE);
        long inactiveAdmins = adminRepository.countByStatus(AdminStatus.INACTIVE);

        // ── 2. Actions today / yesterday ──────────────────────────────────
        Instant todayStart     = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant yesterdayStart = todayStart.minus(1, ChronoUnit.DAYS);

        long actionsToday = auditLogRepository
                .countByActorTypeAndOccurredAtGreaterThanEqual(AuditActorType.ADMIN, todayStart);

        long actionsYesterday = auditLogRepository
                .countByActorTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
                        AuditActorType.ADMIN, yesterdayStart, todayStart);

        double trendPct = actionsYesterday > 0
                ? Math.round(((actionsToday - actionsYesterday) / (double) actionsYesterday) * 1000.0) / 10.0
                : (actionsToday > 0 ? 100.0 : 0.0);

        // ── 3. Radar: role × module activity (last 30 days) ───────────────
        Instant since30Days = todayStart.minus(30, ChronoUnit.DAYS);

        List<AdminRoleModuleActivityResponse> roleModuleActivity = auditLogRepository
                .findRoleModuleActivity(AuditActorType.ADMIN, since30Days)
                .stream()
                .map(p -> new AdminRoleModuleActivityResponse(
                        p.getRole().name(),
                        p.getModule().name(),
                        p.getCount()))
                .collect(Collectors.toList());

        // ── 4. Recent activity timeline (top 10) ──────────────────────────
        List<AdminRecentActivityResponse> recentActivity = auditLogRepository
                .findTop10ByActorTypeOrderByOccurredAtDesc(AuditActorType.ADMIN)
                .stream()
                .map(this::toRecentActivity)
                .collect(Collectors.toList());

        // ── 5. Actions per admin ──────────────────────────────────────────
        List<AdminActionCountResponse> actionsPerAdmin = auditLogRepository
                .findActionsPerAdmin(AuditActorType.ADMIN, PageRequest.of(0, ACTION_COUNT_LIMIT))
                .stream()
                .map(p -> new AdminActionCountResponse(
                        p.getAdminId(),
                        p.getAdminName(),
                        p.getTotalActions()))
                .collect(Collectors.toList());

        return new AdminDashboardMetricsResponse(
                totalAdmins, adminTiCount, activeAdmins, inactiveAdmins,
                actionsToday, actionsYesterday, trendPct,
                roleModuleActivity, recentActivity, actionsPerAdmin
        );
    }

    private AdminRecentActivityResponse toRecentActivity(AuditLog al) {
        var actor = al.getActorAdmin();
        String name = actor != null
                ? (actor.getName() + " " + actor.getLastNamePaternal()).strip()
                : al.getActorReference();
        String role = actor != null ? actor.getRole().name() : null;

        return new AdminRecentActivityResponse(
                actor != null ? actor.getId() : null,
                name,
                role,
                al.getAction(),
                al.getSourceModule() != null ? al.getSourceModule().name() : null,
                al.getSeverity()     != null ? al.getSeverity().name()     : null,
                al.getOccurredAt()
        );
    }
}
