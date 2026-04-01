package mx.edu.utez.server.modules.students.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.students.dto.StudentImportResultResponse;
import mx.edu.utez.server.modules.students.dto.StudentImportRowError;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import jakarta.servlet.http.HttpServletRequest;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class StudentImportService {

    private static final int MAX_ROWS = 1000;
    private static final int ENROLLMENT_ID_MAX_LENGTH = 10;
    private static final int NAME_MAX_LENGTH = 100;
    private static final int LAST_NAME_MAX_LENGTH = 100;
    private static final int EMAIL_MAX_LENGTH = 254;
    private static final int CAREER_MAX_LENGTH = 120;

    private static final Set<String> REQUIRED_HEADERS = new LinkedHashSet<>(List.of(
            "enrollmentid", "name", "lastnamepaternal", "lastnamematernal",
            "institutionalemail", "career", "quarter", "sex"
    ));

    private static final Set<String> ALL_VALID_HEADERS = new LinkedHashSet<>(List.of(
            "enrollmentid", "name", "lastnamepaternal", "lastnamematernal",
            "institutionalemail", "career", "quarter", "sex", "status"
    ));

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$"
    );

    private final StudentRepository studentRepository;
    private final EmailNormalizer emailNormalizer;
    private final AuditTrailService auditTrailService;

    public StudentImportService(
            StudentRepository studentRepository,
            EmailNormalizer emailNormalizer,
            AuditTrailService auditTrailService
    ) {
        this.studentRepository = studentRepository;
        this.emailNormalizer = emailNormalizer;
        this.auditTrailService = auditTrailService;
    }

    public StudentImportResultResponse importCsv(
            InputStream inputStream,
            Admin actor,
            HttpServletRequest request
    ) {
        List<String[]> allRows = parseCsv(inputStream);

        if (allRows.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "El archivo CSV está vacío o no contiene header.");
        }

        String[] headerRow = allRows.get(0);
        Map<String, Integer> headerIndex = validateAndMapHeaders(headerRow);

        List<String[]> dataRows = allRows.subList(1, allRows.size());
        if (dataRows.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "El archivo CSV no contiene filas de datos.");
        }
        if (dataRows.size() > MAX_ROWS) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "El archivo excede el límite de " + MAX_ROWS + " filas de datos.");
        }

        // Pre-scan for in-file duplicates
        Set<String> seenEnrollmentIds = new HashSet<>();
        Set<String> seenEmails = new HashSet<>();
        Set<String> duplicateEnrollmentIdsInFile = new HashSet<>();
        Set<String> duplicateEmailsInFile = new HashSet<>();

        for (String[] row : dataRows) {
            String enrollmentId = getField(row, headerIndex, "enrollmentid").trim().toLowerCase(Locale.ROOT);
            String email = getField(row, headerIndex, "institutionalemail").trim().toLowerCase(Locale.ROOT);
            if (StringUtils.hasText(enrollmentId)) {
                if (!seenEnrollmentIds.add(enrollmentId)) {
                    duplicateEnrollmentIdsInFile.add(enrollmentId);
                }
            }
            if (StringUtils.hasText(email)) {
                if (!seenEmails.add(email)) {
                    duplicateEmailsInFile.add(email);
                }
            }
        }

        List<StudentImportRowError> errors = new ArrayList<>();
        int successCount = 0;

        for (int i = 0; i < dataRows.size(); i++) {
            int rowNumber = i + 2; // 1-based, header is row 1
            String[] row = dataRows.get(i);
            StudentImportRowError error = validateAndSaveRow(
                    row, headerIndex, rowNumber, duplicateEnrollmentIdsInFile, duplicateEmailsInFile, actor
            );
            if (error != null) {
                errors.add(error);
            } else {
                successCount++;
            }
        }

        StudentImportResultResponse result = new StudentImportResultResponse(
                dataRows.size(), successCount, errors.size(), errors
        );

        AuditOutcome outcome = errors.isEmpty() ? AuditOutcome.SUCCESS : AuditOutcome.SUCCESS;
        auditTrailService.auditAdminAction(
                actor,
                "STUDENT_IMPORT",
                "STUDENT",
                null,
                outcome,
                Map.of(
                        "totalRows", result.totalRows(),
                        "successCount", result.successCount(),
                        "errorCount", result.errorCount()
                ),
                request
        );

        return result;
    }

    private StudentImportRowError validateAndSaveRow(
            String[] row,
            Map<String, Integer> headerIndex,
            int rowNumber,
            Set<String> duplicateEnrollmentIdsInFile,
            Set<String> duplicateEmailsInFile,
            Admin actor
    ) {
        String enrollmentId = getField(row, headerIndex, "enrollmentid").trim();
        String name = getField(row, headerIndex, "name").trim();
        String lastNamePaternal = getField(row, headerIndex, "lastnamepaternal").trim();
        String lastNameMaternal = getField(row, headerIndex, "lastnamematernal").trim();
        String institutionalEmail = getField(row, headerIndex, "institutionalemail").trim();
        String career = getField(row, headerIndex, "career").trim();
        String quarterStr = getField(row, headerIndex, "quarter").trim();
        String sexStr = getField(row, headerIndex, "sex").trim();
        String statusStr = getField(row, headerIndex, "status").trim();

        // Required fields
        if (!StringUtils.hasText(enrollmentId)) {
            return error(rowNumber, enrollmentId, "MISSING_ENROLLMENT_ID", "El enrollmentId es obligatorio.");
        }
        if (enrollmentId.length() > ENROLLMENT_ID_MAX_LENGTH) {
            return error(rowNumber, enrollmentId, "INVALID_ENROLLMENT_ID_LENGTH",
                    "El enrollmentId no puede exceder " + ENROLLMENT_ID_MAX_LENGTH + " caracteres.");
        }
        if (!StringUtils.hasText(name)) {
            return error(rowNumber, enrollmentId, "MISSING_NAME", "El nombre es obligatorio.");
        }
        if (name.length() > NAME_MAX_LENGTH) {
            return error(rowNumber, enrollmentId, "INVALID_NAME_LENGTH",
                    "El nombre no puede exceder " + NAME_MAX_LENGTH + " caracteres.");
        }
        if (!StringUtils.hasText(lastNamePaternal)) {
            return error(rowNumber, enrollmentId, "MISSING_LAST_NAME_PATERNAL", "El apellido paterno es obligatorio.");
        }
        if (lastNamePaternal.length() > LAST_NAME_MAX_LENGTH) {
            return error(rowNumber, enrollmentId, "INVALID_LAST_NAME_PATERNAL_LENGTH",
                    "El apellido paterno no puede exceder " + LAST_NAME_MAX_LENGTH + " caracteres.");
        }
        if (StringUtils.hasText(lastNameMaternal) && lastNameMaternal.length() > LAST_NAME_MAX_LENGTH) {
            return error(rowNumber, enrollmentId, "INVALID_LAST_NAME_MATERNAL_LENGTH",
                    "El apellido materno no puede exceder " + LAST_NAME_MAX_LENGTH + " caracteres.");
        }
        if (!StringUtils.hasText(institutionalEmail)) {
            return error(rowNumber, enrollmentId, "MISSING_EMAIL", "El correo institucional es obligatorio.");
        }
        if (institutionalEmail.length() > EMAIL_MAX_LENGTH) {
            return error(rowNumber, enrollmentId, "INVALID_EMAIL_LENGTH",
                    "El correo institucional no puede exceder " + EMAIL_MAX_LENGTH + " caracteres.");
        }
        if (!EMAIL_PATTERN.matcher(institutionalEmail).matches()) {
            return error(rowNumber, enrollmentId, "INVALID_EMAIL", "El correo institucional tiene formato inválido.");
        }
        if (!StringUtils.hasText(career)) {
            return error(rowNumber, enrollmentId, "MISSING_CAREER", "La carrera es obligatoria.");
        }
        if (career.length() > CAREER_MAX_LENGTH) {
            return error(rowNumber, enrollmentId, "INVALID_CAREER_LENGTH",
                    "La carrera no puede exceder " + CAREER_MAX_LENGTH + " caracteres.");
        }

        // Quarter
        int quarter;
        try {
            quarter = Integer.parseInt(quarterStr);
            if (quarter < 1 || quarter > 12) {
                return error(rowNumber, enrollmentId, "INVALID_QUARTER", "El cuatrimestre debe ser entre 1 y 12.");
            }
        } catch (NumberFormatException e) {
            return error(rowNumber, enrollmentId, "INVALID_QUARTER", "El cuatrimestre debe ser un número entre 1 y 12.");
        }

        // Sex
        Sex sex;
        try {
            sex = Sex.valueOf(sexStr.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return error(rowNumber, enrollmentId, "INVALID_SEX",
                    "Sexo inválido. Valores permitidos: MALE, FEMALE, NON_BINARY.");
        }

        // Status (optional, default ACTIVE)
        StudentStatus status = StudentStatus.ACTIVE;
        if (StringUtils.hasText(statusStr)) {
            try {
                status = StudentStatus.valueOf(statusStr.toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                return error(rowNumber, enrollmentId, "INVALID_STATUS",
                        "Estado inválido. Valores permitidos: ACTIVE, INACTIVE.");
            }
        }

        // In-file duplicates
        String enrollmentIdLower = enrollmentId.toLowerCase(Locale.ROOT);
        String emailLower = institutionalEmail.toLowerCase(Locale.ROOT);
        if (duplicateEnrollmentIdsInFile.contains(enrollmentIdLower)) {
            return error(rowNumber, enrollmentId, "DUPLICATE_ENROLLMENT_ID_IN_FILE",
                    "El enrollmentId está duplicado dentro del archivo.");
        }
        if (duplicateEmailsInFile.contains(emailLower)) {
            return error(rowNumber, enrollmentId, "DUPLICATE_EMAIL_IN_FILE",
                    "El correo institucional está duplicado dentro del archivo.");
        }

        // DB duplicates
        String normalizedEmail = emailNormalizer.normalize(institutionalEmail);
        if (studentRepository.existsByEnrollmentId(enrollmentId)) {
            return error(rowNumber, enrollmentId, "DUPLICATE_ENROLLMENT_ID_IN_DB",
                    "El enrollmentId ya existe en la base de datos.");
        }
        if (studentRepository.existsByInstitutionalEmailNormalized(normalizedEmail)) {
            return error(rowNumber, enrollmentId, "DUPLICATE_EMAIL_IN_DB",
                    "El correo institucional ya existe en la base de datos.");
        }

        // Save
        try {
            Student student = new Student();
            student.setEnrollmentId(enrollmentId);
            student.setName(name);
            student.setLastNamePaternal(lastNamePaternal);
            student.setLastNameMaternal(StringUtils.hasText(lastNameMaternal) ? lastNameMaternal : null);
            student.setSex(sex);
            student.setQuarter(quarter);
            student.setInstitutionalEmail(institutionalEmail);
            student.setInstitutionalEmailNormalized(normalizedEmail);
            student.setCareer(career);
            student.setStatus(status);
            student.setCreatedByAdmin(actor);
            student.setUpdatedByAdmin(actor);
            studentRepository.save(student);
            return null;
        } catch (Exception e) {
            return error(rowNumber, enrollmentId, "PERSISTENCE_ERROR", "Error al guardar el registro.");
        }
    }

    private Map<String, Integer> validateAndMapHeaders(String[] headerRow) {
        Map<String, Integer> headerIndex = new HashMap<>();
        Set<String> unknownHeaders = new LinkedHashSet<>();

        for (int i = 0; i < headerRow.length; i++) {
            String normalized = headerRow[i].trim().toLowerCase(Locale.ROOT)
                    .replace(" ", "").replace("_", "");
            if (ALL_VALID_HEADERS.contains(normalized)) {
                headerIndex.put(normalized, i);
            } else if (StringUtils.hasText(normalized)) {
                unknownHeaders.add(headerRow[i].trim());
            }
        }

        Set<String> missingHeaders = new LinkedHashSet<>();
        for (String required : REQUIRED_HEADERS) {
            if (!headerIndex.containsKey(required)) {
                missingHeaders.add(required);
            }
        }

        if (!missingHeaders.isEmpty() || !unknownHeaders.isEmpty()) {
            StringBuilder msg = new StringBuilder("Headers del CSV inválidos.");
            if (!missingHeaders.isEmpty()) {
                msg.append(" Faltan: ").append(String.join(", ", missingHeaders)).append(".");
            }
            if (!unknownHeaders.isEmpty()) {
                msg.append(" No reconocidos: ").append(String.join(", ", unknownHeaders)).append(".");
            }
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, msg.toString());
        }

        return headerIndex;
    }

    private List<String[]> parseCsv(InputStream inputStream) {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (first) {
                    // Strip BOM if present
                    if (line.startsWith("\uFEFF")) {
                        line = line.substring(1);
                    }
                    first = false;
                }
                if (line.trim().isEmpty()) {
                    continue;
                }
                rows.add(parseCsvLine(line));
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Error al leer el archivo CSV.");
        }
        return rows;
    }

    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else {
                if (c == '"') {
                    inQuotes = true;
                } else if (c == ',') {
                    fields.add(current.toString());
                    current = new StringBuilder();
                } else {
                    current.append(c);
                }
            }
        }
        fields.add(current.toString());
        return fields.toArray(new String[0]);
    }

    private String getField(String[] row, Map<String, Integer> headerIndex, String header) {
        Integer idx = headerIndex.get(header);
        if (idx == null || idx >= row.length) {
            return "";
        }
        return row[idx];
    }

    private StudentImportRowError error(int row, String enrollmentId, String errorCode, String detail) {
        return new StudentImportRowError(row, enrollmentId != null ? enrollmentId : "", errorCode, detail);
    }
}
