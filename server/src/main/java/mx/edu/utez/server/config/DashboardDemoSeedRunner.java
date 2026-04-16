package mx.edu.utez.server.config;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DashboardDemoSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DashboardDemoSeedRunner.class);
    private static final long SEED_RANGE_DAYS = 28L;
    private static final int TARGET_SEED_STUDENTS = 160;

    private static final List<StudentSeedItem> STUDENT_SEEDS = List.of(
            new StudentSeedItem("Sofía", "Hernández", "García", Sex.FEMALE),
            new StudentSeedItem("Mateo", "López", "Martínez", Sex.MALE),
            new StudentSeedItem("Valentina", "Ramírez", "Torres", Sex.FEMALE),
            new StudentSeedItem("Santiago", "Flores", "Vega", Sex.MALE),
            new StudentSeedItem("Camila", "Rivera", "Cruz", Sex.FEMALE),
            new StudentSeedItem("Sebastián", "Morales", "Navarro", Sex.MALE),
            new StudentSeedItem("Regina", "Castillo", "Mendoza", Sex.FEMALE),
            new StudentSeedItem("Diego", "Ortiz", "Santos", Sex.MALE),
            new StudentSeedItem("Ximena", "Reyes", "Pérez", Sex.FEMALE),
            new StudentSeedItem("Emiliano", "Guerrero", "Silva", Sex.MALE),
            new StudentSeedItem("Natalia", "Vargas", "Ruiz", Sex.FEMALE),
            new StudentSeedItem("Leonardo", "Méndez", "Salazar", Sex.MALE),
            new StudentSeedItem("Mariana", "Cortés", "Neri", Sex.FEMALE),
            new StudentSeedItem("Gael", "Rojas", "Campos", Sex.MALE),
            new StudentSeedItem("Renata", "Delgado", "Fuentes", Sex.FEMALE),
            new StudentSeedItem("Andrés", "Pacheco", "Luna", Sex.MALE),
            new StudentSeedItem("Victoria", "Escobar", "Valdez", Sex.FEMALE),
            new StudentSeedItem("Iker", "Cabrera", "Miranda", Sex.MALE),
            new StudentSeedItem("Daniela", "Acosta", "Rosales", Sex.FEMALE),
            new StudentSeedItem("Rodrigo", "Serrano", "Bautista", Sex.MALE),
            new StudentSeedItem("Fernanda", "Mejía", "Padilla", Sex.FEMALE),
            new StudentSeedItem("Mauricio", "Aguilar", "Rentería", Sex.MALE),
            new StudentSeedItem("Aitana", "Contreras", "Villalobos", Sex.FEMALE),
            new StudentSeedItem("Adrián", "Castañeda", "Benítez", Sex.MALE),
            new StudentSeedItem("Lucía", "Valencia", "Ponce", Sex.FEMALE),
            new StudentSeedItem("Joaquín", "Solís", "Cuevas", Sex.MALE),
            new StudentSeedItem("Elena", "Maldonado", "Zúñiga", Sex.FEMALE),
            new StudentSeedItem("Bruno", "Nava", "Mora", Sex.MALE),
            new StudentSeedItem("Andrea", "Palacios", "Roldán", Sex.FEMALE),
            new StudentSeedItem("Thiago", "Espinoza", "Montes", Sex.MALE),
            new StudentSeedItem("Paula", "Peña", "Carrillo", Sex.FEMALE),
            new StudentSeedItem("Aarón", "Tapia", "Ibarra", Sex.MALE),
            new StudentSeedItem("Julia", "Arias", "Téllez", Sex.FEMALE),
            new StudentSeedItem("Franco", "León", "Márquez", Sex.MALE),
            new StudentSeedItem("Sara", "Beltrán", "Jaimes", Sex.FEMALE),
            new StudentSeedItem("Cristian", "Amador", "Cervantes", Sex.MALE),
            new StudentSeedItem("Abril", "Terán", "Galván", Sex.FEMALE),
            new StudentSeedItem("Iván", "Cedillo", "Monroy", Sex.MALE),
            new StudentSeedItem("Montserrat", "Soto", "Aguirre", Sex.FEMALE),
            new StudentSeedItem("Damián", "Aldana", "Trejo", Sex.MALE),
            new StudentSeedItem("Carla", "Yáñez", "Franco", Sex.FEMALE),
            new StudentSeedItem("Axel", "Vidal", "Villegas", Sex.MALE),
            new StudentSeedItem("Paulina", "Villanueva", "Mata", Sex.FEMALE),
            new StudentSeedItem("Héctor", "Lara", "Camacho", Sex.MALE),
            new StudentSeedItem("Noa", "Osorio", "Zepeda", Sex.FEMALE),
            new StudentSeedItem("Alan", "Cornejo", "Barrera", Sex.MALE),
            new StudentSeedItem("Isabella", "Figueroa", "Durán", Sex.FEMALE),
            new StudentSeedItem("Erick", "Santamaría", "Olvera", Sex.MALE),
            new StudentSeedItem("Mía", "Velasco", "Arroyo", Sex.FEMALE),
            new StudentSeedItem("Óscar", "Nieto", "Escamilla", Sex.MALE)
    );

    private static final List<ElibroAccessResult> FAILURE_RESULTS = List.of(
            ElibroAccessResult.FAILED_ELIBRO_API,
            ElibroAccessResult.FAILED_ELIBRO_TIMEOUT,
            ElibroAccessResult.FAILED_NEXT_URL_VALIDATION,
            ElibroAccessResult.FAILED_INTERNAL_ERROR
    );

    private final StudentRepository studentRepository;
    private final AdminRepository adminRepository;
    private final CareerRepository careerRepository;
    private final ElibroAccessLogRepository accessLogRepository;

    @Value("${app.seed.dashboard-demo-enabled:false}")
    private boolean dashboardDemoEnabled;

    public DashboardDemoSeedRunner(
            StudentRepository studentRepository,
            AdminRepository adminRepository,
            CareerRepository careerRepository,
            ElibroAccessLogRepository accessLogRepository
    ) {
        this.studentRepository = studentRepository;
        this.adminRepository = adminRepository;
        this.careerRepository = careerRepository;
        this.accessLogRepository = accessLogRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!dashboardDemoEnabled) {
            log.info("Seed dashboard demo: deshabilitado.");
            return;
        }

        Admin seedAdmin = adminRepository.findAll().stream().findFirst().orElse(null);
        if (seedAdmin == null) {
            log.warn("Seed dashboard demo: no hay admins disponibles para created_by_admin_id, omitiendo.");
            return;
        }

        List<Career> careers = careerRepository.findByStatusOrderByNameAsc(CareerStatus.ACTIVE);
        if (careers.isEmpty()) {
            log.warn("Seed dashboard demo: no hay carreras activas disponibles, omitiendo.");
            return;
        }

        int createdStudents = 0;
        int createdLogs = 0;
        int replacedLogs = 0;

        for (int index = 0; index < TARGET_SEED_STUDENTS; index++) {
            StudentSeedItem item = seedItemFor(index);
            String enrollmentId = String.format("20263TN%03d", index + 1);
            String email = (enrollmentId + "@utez.edu.mx").toLowerCase(Locale.ROOT);

            Student student = studentRepository.findByInstitutionalEmailNormalized(email).orElseGet(Student::new);
            boolean isNewStudent = student.getInstitutionalEmailNormalized() == null;

            student.setEnrollmentId(enrollmentId);
            student.setName(item.name());
            student.setLastNamePaternal(item.lastNamePaternal());
            student.setLastNameMaternal(item.lastNameMaternal());
            student.setSex(item.sex());
            student.setQuarter((index % 11) + 1);
            student.setInstitutionalEmail(email);
            student.setInstitutionalEmailNormalized(email);
            student.setCareer(careers.get(index % careers.size()));
            student.setStatus(StudentStatus.ACTIVE);
            student.setCreatedByAdmin(seedAdmin);
            student.setUpdatedByAdmin(seedAdmin);
            studentRepository.save(student);

            if (isNewStudent) {
                createdStudents++;
            }

            String requestPrefix = "seed-dashboard-" + enrollmentId + "-";
            long removed = accessLogRepository.deleteByRequestIdStartingWith(requestPrefix);
            if (removed > 0) {
                replacedLogs += (int) removed;
            }

            List<ElibroAccessLog> logs = buildSeedLogs(student, email, enrollmentId, index);
            accessLogRepository.saveAll(logs);
            createdLogs += logs.size();
        }

        log.info(
                "Seed dashboard demo: {} estudiantes sincronizados, {} accesos creados, {} accesos seed reemplazados.",
                createdStudents,
                createdLogs,
                replacedLogs
        );
    }

    private StudentSeedItem seedItemFor(int index) {
        StudentSeedItem base = STUDENT_SEEDS.get(index % STUDENT_SEEDS.size());
        int cohort = (index / STUDENT_SEEDS.size()) + 1;
        if (cohort == 1) {
            return base;
        }
        return new StudentSeedItem(
                base.name() + " " + cohort,
                base.lastNamePaternal(),
                base.lastNameMaternal(),
                base.sex()
        );
    }

    private List<ElibroAccessLog> buildSeedLogs(Student student, String email, String enrollmentId, int index) {
        List<ElibroAccessLog> logs = new ArrayList<>();
        int attempts = attemptsForIndex(index);
        Instant end = Instant.now().truncatedTo(ChronoUnit.HOURS);
        Instant start = end
                .minus(SEED_RANGE_DAYS, ChronoUnit.DAYS)
                .plus(index % 6, ChronoUnit.HOURS)
                .truncatedTo(ChronoUnit.HOURS);

        for (int attempt = 0; attempt < attempts; attempt++) {
            boolean successful = isSuccessfulAttempt(index, attempt);
            ElibroAccessResult result = successful
                    ? ElibroAccessResult.SUCCESS
                    : FAILURE_RESULTS.get((index + attempt) % FAILURE_RESULTS.size());

            ElibroAccessLog logItem = new ElibroAccessLog();
            logItem.setStudent(student);
            logItem.setAttemptedEmail(email);
            logItem.setNormalizedEmail(email);
            logItem.setResult(result);
            logItem.setErrorCode(successful ? null : result.name());
            logItem.setErrorDetail(successful ? null : "Fallo simulado para validar filtros del dashboard.");
            logItem.setLatencyMs(successful ? 85L + ((index + attempt) % 5) * 20L : 180L + ((index + attempt) % 6) * 35L);
            logItem.setRequestId(requestPrefix(enrollmentId, attempt));
            logItem.setCorrelationId("corr-" + enrollmentId + "-" + String.format("%02d", attempt + 1));
            logItem.setIpAddressMasked("192.168.*." + ((index + attempt) % 40 + 10));
            logItem.setIpAddressHash("seed-hash-" + enrollmentId + "-" + (attempt + 1));
            logItem.setUserAgentSanitized("SIGASe dashboard demo seed");
            logItem.setHttpMethod("GET");
            logItem.setRequestPath("/api/student/elibro/access");
            logItem.setChannelNameSnapshot("Portal estudiantil eLibro");
            logItem.setOrigin("http://localhost:5173");
            logItem.setReferer("http://localhost:5173/student/portal");
            logItem.setProviderStatusCode(successful ? 302 : ((index + attempt) % 2 == 0 ? 502 : 408));
            logItem.setProviderErrorCode(successful ? null : "SEED_" + result.name());
            logItem.setProviderErrorMessage(successful ? null : "Respuesta simulada de proveedor para pruebas.");
            logItem.setMetadataJson("{\"seed\":true,\"dataset\":\"dashboard-demo\"}");
            logItem.setNextUrl("https://www.elibro.net/es/lc/utez/");
            logItem.setRedirectUrl(successful ? "https://www.elibro.net/es/lc/utez/inicio" : null);
            Instant occurredAt = start
                    .plus((attempt * 3L + (index % 3)) % (SEED_RANGE_DAYS - 1), ChronoUnit.DAYS)
                    .plus((index + attempt) % 12, ChronoUnit.HOURS);
            if (occurredAt.isAfter(end)) {
                occurredAt = end.minus((index + attempt) % 6, ChronoUnit.HOURS);
            }
            logItem.setOccurredAt(occurredAt);
            logs.add(logItem);
        }

        return logs;
    }

    private int attemptsForIndex(int index) {
        int bucket = index % 16;
        if (bucket <= 3) {
            return 2 + (index % 4); // 2..5 accesos
        }
        if (bucket <= 7) {
            return 6 + (index % 9); // 6..14 accesos
        }
        if (bucket <= 11) {
            return 15 + (index % 18); // 15..32 accesos
        }
        if (bucket <= 14) {
            return 33 + (index % 28); // 33..60 accesos
        }
        return 70 + (index % 31); // 70..100 accesos (heavy users)
    }

    private boolean isSuccessfulAttempt(int index, int attempt) {
        int reliability = (index % 9);
        int failureStep = reliability <= 2 ? 5 : (reliability <= 6 ? 7 : 9);
        return ((attempt + index) % failureStep) != 0;
    }

    private String requestPrefix(String enrollmentId, int attempt) {
        return "seed-dashboard-" + enrollmentId + "-" + String.format("%02d", attempt + 1);
    }

    private record StudentSeedItem(
            String name,
            String lastNamePaternal,
            String lastNameMaternal,
            Sex sex
    ) {
    }
}
