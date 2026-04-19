package mx.edu.utez.server.config;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.SplittableRandom;
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
    private static final long SEED_RANGE_DAYS = 45L;
    private static final int TARGET_SEED_STUDENTS = 320;
    private static final ZoneId SEED_ZONE = ZoneId.of("America/Mexico_City");

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
    private static final List<String> NAME_SUFFIXES = List.of(
            "Alejandra", "Daniel", "Fernanda", "Javier", "Marisol",
            "Emmanuel", "Carolina", "Ricardo", "Patricia", "Adolfo",
            "Nadia", "Hugo", "Claudia", "Esteban", "Paola"
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
            String enrollmentId = String.format("2026A%05d", 10_001 + index);
            String email = (enrollmentId + "@utez.edu.mx").toLowerCase(Locale.ROOT);
            SplittableRandom studentRandom = new SplittableRandom(31_337L + (long) (index + 1) * 97L);

            Student student = studentRepository.findByInstitutionalEmailNormalized(email).orElseGet(Student::new);
            boolean isNewStudent = student.getInstitutionalEmailNormalized() == null;

            student.setEnrollmentId(enrollmentId);
            student.setName(item.name());
            student.setLastNamePaternal(item.lastNamePaternal());
            student.setLastNameMaternal(item.lastNameMaternal());
            student.setSex(item.sex());
            student.setQuarter(studentRandom.nextInt(1, 12));
            student.setInstitutionalEmail(email);
            student.setInstitutionalEmailNormalized(email);
            student.setCareer(careers.get(studentRandom.nextInt(careers.size())));
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

            List<ElibroAccessLog> logs = buildSeedLogs(student, email, enrollmentId, studentRandom);
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
        String extraName = NAME_SUFFIXES.get((cohort - 2) % NAME_SUFFIXES.size());
        return new StudentSeedItem(
                base.name() + " " + extraName,
                base.lastNamePaternal(),
                base.lastNameMaternal(),
                base.sex()
        );
    }

    private List<ElibroAccessLog> buildSeedLogs(Student student, String email, String enrollmentId, SplittableRandom random) {
        List<ElibroAccessLog> logs = new ArrayList<>();
        int attempts = attemptsForSeed(random);
        Instant end = ZonedDateTime.now(SEED_ZONE)
                .minusDays(1)
                .withHour(23)
                .withMinute(50)
                .withSecond(0)
                .withNano(0)
                .toInstant();
        Instant start = end
                .minus(SEED_RANGE_DAYS, ChronoUnit.DAYS)
                .plus(random.nextInt(0, 36), ChronoUnit.HOURS)
                .plus(random.nextInt(0, 50), ChronoUnit.MINUTES);

        long windowMinutes = Math.max(480L, ChronoUnit.MINUTES.between(start, end));
        long timelineCursor = random.nextLong(0, Math.max(60L, windowMinutes / 10L));
        int successRate = random.nextInt(68, 94);

        for (int attempt = 0; attempt < attempts; attempt++) {
            boolean successful = isSuccessfulAttempt(random, attempt, successRate);
            ElibroAccessResult failureResult = successful ? null : failureResultFor(random);
            ElibroAccessResult result = successful
                    ? ElibroAccessResult.SUCCESS
                    : failureResult;

            Instant occurredAt = start.plus(Math.min(timelineCursor, windowMinutes), ChronoUnit.MINUTES);
            long jumpMinutes = random.nextLong(40L, 2_100L);
            if (attempt % 9 == 0) {
                jumpMinutes += random.nextLong(240L, 2_880L);
            }
            timelineCursor = Math.min(windowMinutes, timelineCursor + jumpMinutes);

            ElibroAccessLog logItem = new ElibroAccessLog();
            logItem.setStudent(student);
            logItem.setAttemptedEmail(email);
            logItem.setNormalizedEmail(email);
            logItem.setResult(result);
            logItem.setErrorCode(successful ? null : result.name());
            logItem.setErrorDetail(successful ? null : "Fallo simulado en proveedor eLibro para dataset dashboard.");
            logItem.setLatencyMs(successful ? random.nextLong(90L, 1_150L) : random.nextLong(320L, 3_900L));
            logItem.setRequestId(requestPrefix(enrollmentId, attempt));
            logItem.setCorrelationId("corr-" + enrollmentId + "-" + String.format("%02d", attempt + 1));
            logItem.setIpAddressMasked("10.20.*." + random.nextInt(12, 250));
            logItem.setIpAddressHash("seed-hash-" + enrollmentId + "-" + (attempt + 1));
            logItem.setUserAgentSanitized("SIGASe dashboard demo seed");
            logItem.setHttpMethod("GET");
            logItem.setRequestPath("/api/student/elibro/access");
            logItem.setChannelNameSnapshot("Portal estudiantil eLibro");
            logItem.setOrigin("http://localhost:5173");
            logItem.setReferer("http://localhost:5173/student/portal");
            logItem.setProviderStatusCode(successful ? 302 : providerStatusCodeFor(result, random));
            logItem.setProviderErrorCode(successful ? null : "SEED_" + result.name());
            logItem.setProviderErrorMessage(successful ? null : "Respuesta simulada de proveedor para pruebas.");
            logItem.setMetadataJson("{\"seed\":true,\"dataset\":\"dashboard-demo\",\"windowDays\":45}");
            logItem.setNextUrl("https://www.elibro.net/es/lc/utez/");
            logItem.setRedirectUrl(successful ? "https://www.elibro.net/es/lc/utez/inicio" : null);
            if (occurredAt.isAfter(end)) {
                occurredAt = end.minus(random.nextInt(1, 180), ChronoUnit.MINUTES);
            }
            logItem.setOccurredAt(occurredAt);
            logs.add(logItem);
        }

        return logs;
    }

    private int attemptsForSeed(SplittableRandom random) {
        int bucket = random.nextInt(100);
        if (bucket < 20) {
            return random.nextInt(3, 9); // bajo
        }
        if (bucket < 52) {
            return random.nextInt(9, 22); // medio
        }
        if (bucket < 78) {
            return random.nextInt(22, 48); // alto
        }
        if (bucket < 94) {
            return random.nextInt(48, 92); // muy alto
        }
        return random.nextInt(92, 151); // power users
    }

    private boolean isSuccessfulAttempt(SplittableRandom random, int attempt, int successRate) {
        int adjustedSuccessRate = successRate;
        if (attempt % 11 == 0 && attempt > 0) {
            adjustedSuccessRate = Math.max(45, successRate - random.nextInt(15, 33));
        }
        return random.nextInt(100) < adjustedSuccessRate;
    }

    private ElibroAccessResult failureResultFor(SplittableRandom random) {
        return FAILURE_RESULTS.get(random.nextInt(FAILURE_RESULTS.size()));
    }

    private int providerStatusCodeFor(ElibroAccessResult result, SplittableRandom random) {
        return switch (result) {
            case FAILED_ELIBRO_TIMEOUT -> random.nextBoolean() ? 408 : 504;
            case FAILED_ELIBRO_API -> random.nextBoolean() ? 500 : 503;
            case FAILED_NEXT_URL_VALIDATION -> 422;
            case FAILED_INTERNAL_ERROR -> 500;
            default -> 500;
        };
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
