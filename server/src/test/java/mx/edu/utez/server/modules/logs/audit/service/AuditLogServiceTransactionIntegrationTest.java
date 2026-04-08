package mx.edu.utez.server.modules.logs.audit.service;

import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.AuditSourceModule;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@ActiveProfiles("test")
class AuditLogServiceTransactionIntegrationTest {

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
    }

    @Test
    void shouldPersistAuditLogWhenOuterTransactionRollsBack() {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        Assertions.assertThrows(RuntimeException.class, () ->
                tx.executeWithoutResult(status -> {
                    auditLogService.log(new AuditLogCommand(
                            AuditActorType.SYSTEM,
                            null,
                            "system",
                            "AUDIT_TX_TEST",
                            "TEST",
                            "entity-1",
                            AuditOutcome.SUCCESS,
                            AuditSeverity.INFO,
                            AuditSourceModule.AUTH,
                            "{\"token\":\"raw-secret\"}",
                            "req-1",
                            "corr-1",
                            "127.0.0.1",
                            "JUnit",
                            "session-1",
                            "https://admin.utez.edu.mx",
                            "POST",
                            "/api/v1/test"
                    ));
                    throw new RuntimeException("force rollback");
                })
        );

        Assertions.assertEquals(1, auditLogRepository.count());
    }
}
