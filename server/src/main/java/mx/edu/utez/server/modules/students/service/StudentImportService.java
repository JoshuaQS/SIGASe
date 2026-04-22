package mx.edu.utez.server.modules.students.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.auth.entity.StudentPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.StudentPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.service.StudentPasswordResetNotifier;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.notifications.dto.EmailDispatchJobResponse;
import mx.edu.utez.server.modules.notifications.service.EmailDispatchService;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.students.dto.StudentImportResultResponse;
import mx.edu.utez.server.modules.students.dto.StudentImportRowDto;
import mx.edu.utez.server.modules.students.dto.StudentImportRowError;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import mx.edu.utez.server.shared.validation.DomainTextPolicy;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Name;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class StudentImportService {

    private static final Logger log = LoggerFactory.getLogger(StudentImportService.class);

    private static final int MAX_ROWS = 1000;
    private static final int NAME_MAX_LENGTH = 100;
    private static final int LAST_NAME_MAX_LENGTH = 100;
    private static final int CAREER_LABEL_MAX_LENGTH = 160;
    private static final int TEMPLATE_VALIDATION_LAST_ROW = MAX_ROWS + 1;

    private static final String TEMPLATE_SHEET_NAME = "Plantilla estudiantes";
    private static final String CATALOG_SHEET_NAME = "Catalogos";
    private static final String INSTRUCTIONS_SHEET_NAME = "Instrucciones";

    private static final String COL_NAME = "name";
    private static final String COL_LAST_NAME_PATERNAL = "lastnamepaternal";
    private static final String COL_LAST_NAME_MATERNAL = "lastnamematernal";
    private static final String COL_SEX = "sex";
    private static final String COL_ENROLLMENT = "enrollmentid";
    private static final String COL_QUARTER = "quarter";
    private static final String COL_CAREER = "career";
    private static final String COL_INSTITUTIONAL_EMAIL = "institutionalemail";

    private static final Set<String> REQUIRED_HEADERS = new LinkedHashSet<>(List.of(
            COL_NAME,
            COL_LAST_NAME_PATERNAL,
            COL_SEX,
            COL_ENROLLMENT,
            COL_QUARTER,
            COL_CAREER
    ));

    private static final Map<String, String> HEADER_LABELS = Map.of(
            COL_NAME, "Nombres",
            COL_LAST_NAME_PATERNAL, "Apellido paterno",
            COL_LAST_NAME_MATERNAL, "Apellido materno",
            COL_SEX, "Sexo",
            COL_ENROLLMENT, "Matricula",
            COL_QUARTER, "Cuatrimestre",
            COL_CAREER, "Carrera"
    );

    private static final List<String> TEMPLATE_HEADERS = List.of(
            "Nombres",
            "Apellido paterno",
            "Apellido materno",
            "Sexo",
            "Matricula",
            "Cuatrimestre",
            "Carrera"
    );

    private static final List<String> TEMPLATE_SEX_OPTIONS = List.of(
            "Masculino",
            "Femenino",
            "No binario"
    );

    private static final List<String> TEMPLATE_QUARTER_OPTIONS = List.of(
            "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"
    );

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$"
    );

    private static final Map<String, String> HEADER_ALIAS_TO_CANONICAL = buildHeaderAliasMap();

    private final StudentRepository studentRepository;
    private final CareerRepository careerRepository;
    private final EmailNormalizer emailNormalizer;
    private final AuditTrailService auditTrailService;
    private final StudentPasswordResetTokenRepository studentPasswordResetTokenRepository;
    private final StudentPasswordResetNotifier studentPasswordResetNotifier;
    private final EmailDispatchService emailDispatchService;

    public StudentImportService(
            StudentRepository studentRepository,
            CareerRepository careerRepository,
            EmailNormalizer emailNormalizer,
            AuditTrailService auditTrailService,
            StudentPasswordResetTokenRepository studentPasswordResetTokenRepository,
            StudentPasswordResetNotifier studentPasswordResetNotifier,
            EmailDispatchService emailDispatchService
    ) {
        this.studentRepository = studentRepository;
        this.careerRepository = careerRepository;
        this.emailNormalizer = emailNormalizer;
        this.auditTrailService = auditTrailService;
        this.studentPasswordResetTokenRepository = studentPasswordResetTokenRepository;
        this.studentPasswordResetNotifier = studentPasswordResetNotifier;
        this.emailDispatchService = emailDispatchService;
    }

    public StudentImportResultResponse importFile(
            InputStream inputStream,
            String originalFilename,
            Admin actor,
            HttpServletRequest request
    ) {
        List<String[]> allRows = parseRows(inputStream, originalFilename);

        if (allRows.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "El archivo está vacío o no contiene encabezados.");
        }

        Map<String, Integer> headerIndex = validateAndMapHeaders(allRows.get(0));

        List<String[]> dataRows = allRows.subList(1, allRows.size());
        if (dataRows.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "El archivo no contiene filas de datos.");
        }
        if (dataRows.size() > MAX_ROWS) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El archivo excede el límite de " + MAX_ROWS + " filas de datos."
            );
        }

        CareerLookup careerLookup = buildCareerLookup();

        Set<String> enrollmentSeen = new HashSet<>();
        Set<String> duplicateEnrollmentIdsInFile = new HashSet<>();
        for (String[] row : dataRows) {
            StudentImportRowDto importRow = parseImportRow(row, headerIndex);
            String duplicateKey = normalizeDuplicateEnrollmentKey(importRow.matricula());
            if (!StringUtils.hasText(duplicateKey)) {
                continue;
            }
            if (!enrollmentSeen.add(duplicateKey)) {
                duplicateEnrollmentIdsInFile.add(duplicateKey);
            }
        }

        List<StudentImportRowError> errors = new ArrayList<>();
        List<EmailDispatchJobResponse> emailJobs = new ArrayList<>();
        int successCount = 0;

        for (int index = 0; index < dataRows.size(); index++) {
            int rowNumber = index + 2;
            StudentImportRowDto importRow = parseImportRow(dataRows.get(index), headerIndex);

            ImportRowOutcome outcome = validateAndSaveRow(
                    importRow,
                    rowNumber,
                    duplicateEnrollmentIdsInFile,
                    careerLookup,
                    actor
            );

            if (outcome.error() != null) {
                errors.add(outcome.error());
                continue;
            }
            successCount++;
            if (outcome.emailJob() != null) {
                emailJobs.add(outcome.emailJob());
            }
        }

        StudentImportResultResponse result = new StudentImportResultResponse(
                dataRows.size(),
                successCount,
                errors.size(),
                errors,
                emailJobs
        );

        auditTrailService.auditAdminAction(
                actor,
                "STUDENT_IMPORT",
                "STUDENT",
                null,
                AuditOutcome.SUCCESS,
                Map.of(
                        "totalRows", result.totalRows(),
                        "successCount", result.successCount(),
                        "errorCount", result.errorCount()
                ),
                request
        );

        return result;
    }

    public void writeTemplate(OutputStream outputStream, String format) {
        String safeFormat = format == null ? "xlsx" : format.trim().toLowerCase(Locale.ROOT);
        if ("xlsx".equals(safeFormat)) {
            writeTemplateXlsx(outputStream);
            return;
        }
        if (!"csv".equals(safeFormat)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Formato inválido. Valores permitidos: csv, xlsx.");
        }
        writeTemplateCsv(outputStream);
    }

    private ImportRowOutcome validateAndSaveRow(
            StudentImportRowDto row,
            int rowNumber,
            Set<String> duplicateEnrollmentIdsInFile,
            CareerLookup careerLookup,
            Admin actor
    ) {
        String rawEnrollmentId = safeTrim(row.matricula());
        if (!StringUtils.hasText(rawEnrollmentId)) {
            return ImportRowOutcome.error(error(rowNumber, rawEnrollmentId, "MISSING_ENROLLMENT_ID", "La matrícula es obligatoria."));
        }

        String normalizedEnrollmentId;
        try {
            normalizedEnrollmentId = DomainTextPolicy.normalizeEnrollmentId(rawEnrollmentId);
        } catch (Exception ex) {
            return ImportRowOutcome.error(error(rowNumber, rawEnrollmentId, "INVALID_ENROLLMENT_ID_FORMAT", "La matrícula contiene caracteres no permitidos."));
        }

        if (!DomainTextPolicy.isValidEnrollmentId(normalizedEnrollmentId)) {
            return ImportRowOutcome.error(error(
                    rowNumber,
                    rawEnrollmentId,
                    "INVALID_ENROLLMENT_ID_FORMAT",
                    "La matrícula debe ser alfanumérica, en mayúsculas, sin espacios y tener 10 u 11 caracteres."
            ));
        }

        String duplicateKey = normalizeDuplicateEnrollmentKey(rawEnrollmentId);
        if (StringUtils.hasText(duplicateKey) && duplicateEnrollmentIdsInFile.contains(duplicateKey)) {
            return ImportRowOutcome.error(error(
                    rowNumber,
                    normalizedEnrollmentId,
                    "DUPLICATE_ENROLLMENT_ID_IN_FILE",
                    "La matrícula está duplicada dentro del archivo."
            ));
        }

        ValidationOutcome<String> nameValidation = validateRequiredHumanName(
                row.nombres(),
                normalizedEnrollmentId,
                rowNumber,
                "MISSING_NAME",
                "INVALID_NAME_FORMAT",
                "INVALID_NAME_LENGTH",
                "nombre",
                NAME_MAX_LENGTH
        );
        if (nameValidation.error() != null) {
            return ImportRowOutcome.error(nameValidation.error());
        }

        ValidationOutcome<String> paternalLastNameValidation = validateRequiredHumanName(
                row.apellidoPaterno(),
                normalizedEnrollmentId,
                rowNumber,
                "MISSING_LAST_NAME_PATERNAL",
                "INVALID_LAST_NAME_PATERNAL_FORMAT",
                "INVALID_LAST_NAME_PATERNAL_LENGTH",
                "apellido paterno",
                LAST_NAME_MAX_LENGTH
        );
        if (paternalLastNameValidation.error() != null) {
            return ImportRowOutcome.error(paternalLastNameValidation.error());
        }

        ValidationOutcome<String> maternalNameValidation = validateOptionalHumanName(
                row.apellidoMaterno(),
                normalizedEnrollmentId,
                rowNumber,
                "INVALID_LAST_NAME_MATERNAL_FORMAT",
                "INVALID_LAST_NAME_MATERNAL_LENGTH",
                "apellido materno",
                LAST_NAME_MAX_LENGTH
        );
        if (maternalNameValidation.error() != null) {
            return ImportRowOutcome.error(maternalNameValidation.error());
        }

        ValidationOutcome<Sex> sexValidation = validateSex(row.sexo(), normalizedEnrollmentId, rowNumber);
        if (sexValidation.error() != null) {
            return ImportRowOutcome.error(sexValidation.error());
        }

        ValidationOutcome<Integer> quarterValidation = validateQuarter(row.cuatrimestre(), normalizedEnrollmentId, rowNumber);
        if (quarterValidation.error() != null) {
            return ImportRowOutcome.error(quarterValidation.error());
        }

        ValidationOutcome<Career> careerValidation = validateCareer(row.carrera(), normalizedEnrollmentId, rowNumber, careerLookup);
        if (careerValidation.error() != null) {
            return ImportRowOutcome.error(careerValidation.error());
        }

        String expectedInstitutionalEmail;
        try {
            expectedInstitutionalEmail = emailNormalizer.buildInstitutionalEmailFromEnrollmentId(normalizedEnrollmentId);
        } catch (Exception ex) {
            return ImportRowOutcome.error(error(
                    rowNumber,
                    normalizedEnrollmentId,
                    "INVALID_ENROLLMENT_ID_FOR_EMAIL",
                    "No se pudo generar el correo institucional a partir de la matrícula."
            ));
        }
        if (!StringUtils.hasText(expectedInstitutionalEmail)) {
            return ImportRowOutcome.error(error(
                    rowNumber,
                    normalizedEnrollmentId,
                    "INVALID_ENROLLMENT_ID_FOR_EMAIL",
                    "No se pudo generar el correo institucional a partir de la matrícula."
            ));
        }

        String providedInstitutionalEmail = safeTrim(row.institutionalEmail());
        if (StringUtils.hasText(providedInstitutionalEmail)) {
            if (providedInstitutionalEmail.length() > 254) {
                return ImportRowOutcome.error(error(
                        rowNumber,
                        normalizedEnrollmentId,
                        "INVALID_EMAIL_LENGTH",
                        "El correo institucional no puede exceder 254 caracteres."
                ));
            }
            if (!EMAIL_PATTERN.matcher(providedInstitutionalEmail).matches()) {
                return ImportRowOutcome.error(error(
                        rowNumber,
                        normalizedEnrollmentId,
                        "INVALID_EMAIL",
                        "El correo institucional proporcionado tiene formato inválido."
                ));
            }
        }

        if (studentRepository.existsByEnrollmentId(normalizedEnrollmentId)) {
            return ImportRowOutcome.error(error(
                    rowNumber,
                    normalizedEnrollmentId,
                    "DUPLICATE_ENROLLMENT_ID_IN_DB",
                    "La matrícula ya existe en la base de datos."
            ));
        }

        if (studentRepository.existsByInstitutionalEmailNormalized(expectedInstitutionalEmail)) {
            return ImportRowOutcome.error(error(
                    rowNumber,
                    normalizedEnrollmentId,
                    "DUPLICATE_EMAIL_IN_DB",
                    "El correo institucional derivado de la matrícula ya existe en la base de datos."
            ));
        }

        try {
            Student student = new Student();
            student.setEnrollmentId(normalizedEnrollmentId);
            student.setName(nameValidation.value());
            student.setLastNamePaternal(paternalLastNameValidation.value());
            student.setLastNameMaternal(maternalNameValidation.value());
            student.setSex(sexValidation.value());
            student.setQuarter(quarterValidation.value());
            student.setInstitutionalEmail(expectedInstitutionalEmail);
            student.setInstitutionalEmailNormalized(expectedInstitutionalEmail);
            student.setCareer(careerValidation.value());
            student.setStatus(StudentStatus.PENDING);
            student.setMustChangePassword(true);
            student.setCreatedByAdmin(actor);
            student.setUpdatedByAdmin(actor);
            studentRepository.save(student);
            return ImportRowOutcome.success(enqueueStudentOnboardingEmail(student));
        } catch (Exception ex) {
            return ImportRowOutcome.error(error(
                    rowNumber,
                    normalizedEnrollmentId,
                    "PERSISTENCE_ERROR",
                    "Ocurrió un error al guardar el registro."
            ));
        }
    }

    private ValidationOutcome<String> validateRequiredHumanName(
            String raw,
            String enrollmentId,
            int rowNumber,
            String missingCode,
            String invalidFormatCode,
            String invalidLengthCode,
            String fieldLabel,
            int maxLength
    ) {
        String value = safeTrim(raw);
        if (!StringUtils.hasText(value)) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    missingCode,
                    "El " + fieldLabel + " es obligatorio."
            ));
        }

        String normalized;
        try {
            normalized = DomainTextPolicy.normalizeHumanNameWithInitialCaps(value);
        } catch (Exception ex) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    invalidFormatCode,
                    "El " + fieldLabel + " contiene caracteres inválidos."
            ));
        }

        if (!DomainTextPolicy.isValidHumanName(normalized) || normalized.length() < 2) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    invalidFormatCode,
                    "El " + fieldLabel + " contiene caracteres inválidos."
            ));
        }

        if (normalized.length() > maxLength) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    invalidLengthCode,
                    "El " + fieldLabel + " no puede exceder " + maxLength + " caracteres."
            ));
        }

        return ValidationOutcome.success(normalized);
    }

    private ValidationOutcome<String> validateOptionalHumanName(
            String raw,
            String enrollmentId,
            int rowNumber,
            String invalidFormatCode,
            String invalidLengthCode,
            String fieldLabel,
            int maxLength
    ) {
        String value = safeTrim(raw);
        if (!StringUtils.hasText(value)) {
            return ValidationOutcome.success(null);
        }

        String normalized;
        try {
            normalized = DomainTextPolicy.normalizeHumanNameWithInitialCaps(value);
        } catch (Exception ex) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    invalidFormatCode,
                    "El " + fieldLabel + " contiene caracteres inválidos."
            ));
        }

        if (!DomainTextPolicy.isValidHumanName(normalized) || normalized.length() < 2) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    invalidFormatCode,
                    "El " + fieldLabel + " contiene caracteres inválidos."
            ));
        }

        if (normalized.length() > maxLength) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    invalidLengthCode,
                    "El " + fieldLabel + " no puede exceder " + maxLength + " caracteres."
            ));
        }

        return ValidationOutcome.success(normalized);
    }

    private ValidationOutcome<Sex> validateSex(String rawSex, String enrollmentId, int rowNumber) {
        String value = safeTrim(rawSex);
        if (!StringUtils.hasText(value)) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    "MISSING_SEX",
                    "El sexo es obligatorio. Valores permitidos: Masculino, Femenino, No binario."
            ));
        }

        String token = normalizeCatalogToken(value).replace(" ", "");
        Sex sex = switch (token) {
            case "masculino", "male", "hombre", "m" -> Sex.MALE;
            case "femenino", "female", "mujer", "f" -> Sex.FEMALE;
            case "nobinario", "nonbinary", "non_binary", "nobinarie" -> Sex.NON_BINARY;
            default -> null;
        };

        if (sex == null) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    "INVALID_SEX",
                    "Sexo inválido. Valores permitidos: Masculino, Femenino, No binario."
            ));
        }
        return ValidationOutcome.success(sex);
    }

    private ValidationOutcome<Integer> validateQuarter(String rawQuarter, String enrollmentId, int rowNumber) {
        String value = safeTrim(rawQuarter);
        if (!StringUtils.hasText(value)) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    "MISSING_QUARTER",
                    "El cuatrimestre es obligatorio."
            ));
        }

        int quarter;
        try {
            quarter = Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    "INVALID_QUARTER",
                    "El cuatrimestre debe ser un número entre 1 y 11."
            ));
        }

        if (quarter < 1 || quarter > 11) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    "INVALID_QUARTER",
                    "El cuatrimestre debe estar entre 1 y 11."
            ));
        }

        return ValidationOutcome.success(quarter);
    }

    private ValidationOutcome<Career> validateCareer(
            String rawCareer,
            String enrollmentId,
            int rowNumber,
            CareerLookup careerLookup
    ) {
        String value = safeTrim(rawCareer);
        if (!StringUtils.hasText(value)) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    "MISSING_CAREER",
                    "La carrera es obligatoria."
            ));
        }

        if (value.length() > CAREER_LABEL_MAX_LENGTH) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    "INVALID_CAREER_LENGTH",
                    "La carrera no puede exceder " + CAREER_LABEL_MAX_LENGTH + " caracteres."
            ));
        }

        Career career = careerLookup.resolve(value);
        if (career == null) {
            return ValidationOutcome.error(error(
                    rowNumber,
                    enrollmentId,
                    "INVALID_CAREER",
                    "La carrera no coincide con el catálogo permitido. Usa la plantilla oficial."
            ));
        }

        return ValidationOutcome.success(career);
    }

    private Map<String, Integer> validateAndMapHeaders(String[] headerRow) {
        Map<String, Integer> headerIndex = new HashMap<>();

        for (int index = 0; index < headerRow.length; index++) {
            String normalizedToken = normalizeHeaderToken(headerRow[index]);
            if (!StringUtils.hasText(normalizedToken)) {
                continue;
            }
            String canonical = HEADER_ALIAS_TO_CANONICAL.get(normalizedToken);
            if (canonical != null && !headerIndex.containsKey(canonical)) {
                headerIndex.put(canonical, index);
            }
        }

        List<String> missing = new ArrayList<>();
        for (String requiredHeader : REQUIRED_HEADERS) {
            if (!headerIndex.containsKey(requiredHeader)) {
                missing.add(HEADER_LABELS.getOrDefault(requiredHeader, requiredHeader));
            }
        }

        if (!missing.isEmpty()) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "Encabezados inválidos. Faltan columnas obligatorias: " + String.join(", ", missing) + "."
            );
        }

        return headerIndex;
    }

    private StudentImportRowDto parseImportRow(String[] row, Map<String, Integer> headerIndex) {
        return new StudentImportRowDto(
                getField(row, headerIndex, COL_NAME),
                getField(row, headerIndex, COL_LAST_NAME_PATERNAL),
                getField(row, headerIndex, COL_LAST_NAME_MATERNAL),
                getField(row, headerIndex, COL_SEX),
                getField(row, headerIndex, COL_ENROLLMENT),
                getField(row, headerIndex, COL_QUARTER),
                getField(row, headerIndex, COL_CAREER),
                getField(row, headerIndex, COL_INSTITUTIONAL_EMAIL)
        );
    }

    private List<String[]> parseRows(InputStream inputStream, String originalFilename) {
        String normalizedName = originalFilename == null ? "" : originalFilename.trim().toLowerCase(Locale.ROOT);
        if (normalizedName.endsWith(".xlsx")) {
            return parseXlsx(inputStream);
        }
        if (normalizedName.endsWith(".csv")) {
            return parseCsv(inputStream);
        }

        try {
            return parseXlsx(inputStream);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Formato de archivo no soportado. Usa .csv o .xlsx.");
        }
    }

    private List<String[]> parseCsv(InputStream inputStream) {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (first && line.startsWith("\uFEFF")) {
                    line = line.substring(1);
                }
                first = false;

                if (line.trim().isEmpty()) {
                    continue;
                }
                rows.add(parseCsvLine(line));
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Error al leer el archivo CSV.");
        }
        return rows;
    }

    private List<String[]> parseXlsx(InputStream inputStream) {
        List<String[]> rows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                return rows;
            }

            int lastRowNum = sheet.getLastRowNum();
            int minColumns = 8;
            for (int rowIndex = 0; rowIndex <= lastRowNum; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isRowEmpty(row, formatter)) {
                    continue;
                }

                int lastCellNum = Math.max(row.getLastCellNum(), minColumns);
                String[] values = new String[lastCellNum];
                for (int cellIndex = 0; cellIndex < lastCellNum; cellIndex++) {
                    Cell cell = row.getCell(cellIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    values[cellIndex] = cell == null ? "" : safeTrim(formatter.formatCellValue(cell));
                }
                rows.add(values);
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Error al leer el archivo XLSX.");
        }

        return rows;
    }

    private boolean isRowEmpty(Row row, DataFormatter formatter) {
        int lastCellNum = Math.max(row.getLastCellNum(), 0);
        for (int cellIndex = 0; cellIndex < lastCellNum; cellIndex++) {
            Cell cell = row.getCell(cellIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            if (cell != null && StringUtils.hasText(formatter.formatCellValue(cell))) {
                return false;
            }
        }
        return true;
    }

    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int index = 0; index < line.length(); index++) {
            char c = line.charAt(index);
            if (inQuotes) {
                if (c == '"') {
                    if (index + 1 < line.length() && line.charAt(index + 1) == '"') {
                        current.append('"');
                        index++;
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
        return safeTrim(row[idx]);
    }

    private StudentImportRowError error(int row, String enrollmentId, String errorCode, String detail) {
        return new StudentImportRowError(row, enrollmentId != null ? enrollmentId : "", errorCode, detail);
    }

    private String normalizeDuplicateEnrollmentKey(String enrollmentId) {
        if (!StringUtils.hasText(enrollmentId)) {
            return "";
        }
        String normalized = DomainTextPolicy.normalizeEnrollmentId(enrollmentId);
        return normalized == null ? "" : normalized.toLowerCase(Locale.ROOT);
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private static String sha256Hex(String input) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 error", e);
        }
    }

    private EmailDispatchJobResponse enqueueStudentOnboardingEmail(Student student) {
        String rawToken = UUID.randomUUID().toString();
        try {
            studentPasswordResetTokenRepository.invalidatePendingByStudentId(student.getId(), Instant.now());
            String tokenHash = sha256Hex(rawToken);
            studentPasswordResetTokenRepository.save(
                    new StudentPasswordResetToken(tokenHash, student, Instant.now().plus(24, ChronoUnit.HOURS))
            );
            String onboardingLink = studentPasswordResetNotifier.buildStudentOnboardingLink(rawToken);
            String plainText = """
                    Hola,

                    Se creó tu acceso en SIGASe y necesitas establecer tu contraseña.

                    Usa este enlace para crearla:
                    %s

                    Equipo SIGASe
                    """.formatted(onboardingLink);
            String html = """
                    <!doctype html>
                    <html lang="es">
                      <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
                        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
                          <h1 style="margin:0 0 12px 0;font-size:22px;">Configura tu contraseña</h1>
                          <p style="margin:0 0 16px 0;line-height:1.6;">Tu cuenta en SIGASe ya fue creada. Para activar tu acceso, configura tu contraseña con el siguiente botón.</p>
                          <a href="%s" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;">Configurar contraseña</a>
                        </div>
                      </body>
                    </html>
                    """.formatted(onboardingLink);
            var job = emailDispatchService.enqueue(
                    EmailDispatchJobType.STUDENT_ONBOARDING_PASSWORD,
                    student.getInstitutionalEmail(),
                    "SIGASe | Configura tu contraseña",
                    plainText,
                    html,
                    "STUDENT",
                    student.getId().toString()
            );
            return new EmailDispatchJobResponse(
                    job.getId(),
                    job.getJobType(),
                    job.getStatus(),
                    job.getRecipientEmail(),
                    job.getReferenceType(),
                    job.getReferenceId(),
                    job.getAttempts(),
                    job.getMaxAttempts(),
                    job.getNextAttemptAt(),
                    job.getSentAt(),
                    job.getPermanentlyFailedAt(),
                    job.getCreatedAt()
            );
        } catch (Exception ex) {
            log.warn("No se pudo encolar el correo de onboarding para el estudiante {}: {}", student.getId(), ex.getMessage());
            boolean sent = studentPasswordResetNotifier.sendStudentOnboardingPasswordSetup(student.getInstitutionalEmail(), rawToken);
            if (!sent) {
                log.error("Fallback directo falló para el onboarding del estudiante {}", student.getId());
            }
            return null;
        }
    }

    private void writeTemplateCsv(OutputStream outputStream) {
        try {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            buffer.write('\uFEFF');
            buffer.write(String.join(",", TEMPLATE_HEADERS).getBytes(StandardCharsets.UTF_8));
            buffer.write('\n');
            outputStream.write(buffer.toByteArray());
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "No se pudo generar la plantilla CSV.");
        }
    }

    private void writeTemplateXlsx(OutputStream outputStream) {
        List<Career> careers = loadTemplateCareers();

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet templateSheet = workbook.createSheet(TEMPLATE_SHEET_NAME);
            Sheet catalogSheet = workbook.createSheet(CATALOG_SHEET_NAME);
            Sheet instructionsSheet = workbook.createSheet(INSTRUCTIONS_SHEET_NAME);

            CellStyle headerStyle = createTemplateHeaderStyle(workbook);
            CellStyle instructionTitleStyle = createInstructionTitleStyle(workbook);
            CellStyle instructionTextStyle = createInstructionTextStyle(workbook);
            CellStyle textCellStyle = createTextCellStyle(workbook);

            writeTemplateHeader(templateSheet, headerStyle);
            applyTemplateLayout(templateSheet, textCellStyle);

            writeCatalogSheet(catalogSheet, careers);
            createNamedRanges(workbook, careers.size());
            applyDataValidations(templateSheet);
            workbook.setSheetHidden(workbook.getSheetIndex(catalogSheet), true);

            writeInstructionsSheet(instructionsSheet, instructionTitleStyle, instructionTextStyle, careers);

            workbook.write(outputStream);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "No se pudo generar la plantilla XLSX.");
        }
    }

    private List<Career> loadTemplateCareers() {
        List<Career> careers = careerRepository.findByStatusOrderByNameAsc(CareerStatus.ACTIVE);
        if (!careers.isEmpty()) {
            return careers;
        }
        List<Career> fallback = careerRepository.findAll();
        fallback.sort((left, right) -> left.getName().compareToIgnoreCase(right.getName()));
        return fallback;
    }

    private void writeTemplateHeader(Sheet sheet, CellStyle headerStyle) {
        Row headerRow = sheet.createRow(0);
        for (int index = 0; index < TEMPLATE_HEADERS.size(); index++) {
            Cell cell = headerRow.createCell(index);
            cell.setCellValue(TEMPLATE_HEADERS.get(index));
            cell.setCellStyle(headerStyle);
        }
    }

    private void applyTemplateLayout(Sheet sheet, CellStyle textCellStyle) {
        int[] widths = {24, 22, 22, 18, 18, 14, 58};
        for (int index = 0; index < widths.length; index++) {
            sheet.setColumnWidth(index, widths[index] * 256);
        }
        sheet.createFreezePane(0, 1);
        sheet.setDefaultColumnStyle(4, textCellStyle);
    }

    private void writeCatalogSheet(Sheet sheet, List<Career> careers) {
        for (int index = 0; index < TEMPLATE_SEX_OPTIONS.size(); index++) {
            Row row = getOrCreateRow(sheet, index);
            row.createCell(0).setCellValue(TEMPLATE_SEX_OPTIONS.get(index));
        }

        for (int index = 0; index < TEMPLATE_QUARTER_OPTIONS.size(); index++) {
            Row row = getOrCreateRow(sheet, index);
            row.createCell(1).setCellValue(TEMPLATE_QUARTER_OPTIONS.get(index));
        }

        for (int index = 0; index < careers.size(); index++) {
            Row row = getOrCreateRow(sheet, index);
            row.createCell(2).setCellValue(careers.get(index).getName());
        }
    }

    private Row getOrCreateRow(Sheet sheet, int rowIndex) {
        Row row = sheet.getRow(rowIndex);
        return row == null ? sheet.createRow(rowIndex) : row;
    }

    private void createNamedRanges(Workbook workbook, int careersCount) {
        Name sexRange = workbook.createName();
        sexRange.setNameName("SEX_OPTIONS");
        sexRange.setRefersToFormula("'" + CATALOG_SHEET_NAME + "'!$A$1:$A$" + TEMPLATE_SEX_OPTIONS.size());

        Name quarterRange = workbook.createName();
        quarterRange.setNameName("QUARTER_OPTIONS");
        quarterRange.setRefersToFormula("'" + CATALOG_SHEET_NAME + "'!$B$1:$B$" + TEMPLATE_QUARTER_OPTIONS.size());

        int safeCareerCount = Math.max(1, careersCount);
        Name careerRange = workbook.createName();
        careerRange.setNameName("CAREER_OPTIONS");
        careerRange.setRefersToFormula("'" + CATALOG_SHEET_NAME + "'!$C$1:$C$" + safeCareerCount);
    }

    private void applyDataValidations(Sheet templateSheet) {
        DataValidationHelper helper = templateSheet.getDataValidationHelper();

        applyListValidation(
                templateSheet,
                helper,
                "SEX_OPTIONS",
                1,
                TEMPLATE_VALIDATION_LAST_ROW,
                3,
                3,
                "Valor de sexo inválido",
                "Selecciona un valor válido: Masculino, Femenino o No binario.",
                "Sexo",
                "Selecciona un valor de la lista desplegable."
        );

        applyListValidation(
                templateSheet,
                helper,
                "QUARTER_OPTIONS",
                1,
                TEMPLATE_VALIDATION_LAST_ROW,
                5,
                5,
                "Cuatrimestre inválido",
                "Selecciona un valor entre 1 y 11.",
                "Cuatrimestre",
                "Selecciona un cuatrimestre del 1 al 11."
        );

        applyListValidation(
                templateSheet,
                helper,
                "CAREER_OPTIONS",
                1,
                TEMPLATE_VALIDATION_LAST_ROW,
                6,
                6,
                "Carrera inválida",
                "Selecciona una carrera válida del catálogo permitido.",
                "Carrera",
                "Selecciona una carrera de la lista desplegable."
        );
    }

    private void applyListValidation(
            Sheet sheet,
            DataValidationHelper helper,
            String listFormula,
            int firstRow,
            int lastRow,
            int firstCol,
            int lastCol,
            String errorTitle,
            String errorMessage,
            String promptTitle,
            String promptMessage
    ) {
        DataValidationConstraint constraint = helper.createFormulaListConstraint(listFormula);
        CellRangeAddressList addressList = new CellRangeAddressList(firstRow, lastRow, firstCol, lastCol);
        DataValidation validation = helper.createValidation(constraint, addressList);
        validation.setShowErrorBox(true);
        validation.setSuppressDropDownArrow(false);
        validation.createErrorBox(errorTitle, errorMessage);
        validation.createPromptBox(promptTitle, promptMessage);
        validation.setShowPromptBox(true);
        sheet.addValidationData(validation);
    }

    private void writeInstructionsSheet(
            Sheet instructionsSheet,
            CellStyle titleStyle,
            CellStyle textStyle,
            List<Career> careers
    ) {
        instructionsSheet.setColumnWidth(0, 120 * 256);

        int rowIndex = 0;
        Row titleRow = instructionsSheet.createRow(rowIndex++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Instrucciones de importación de estudiantes");
        titleCell.setCellStyle(titleStyle);

        rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "1. No modifiques los encabezados de la hoja '" + TEMPLATE_SHEET_NAME + "'.", textStyle);
        rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "2. Cada fila representa un estudiante.", textStyle);
        rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "3. Campos obligatorios: Nombres, Apellido paterno, Sexo, Matricula, Cuatrimestre y Carrera.", textStyle);
        rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "4. Campo opcional: Apellido materno.", textStyle);
        rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "5. Sexo válido: Masculino, Femenino, No binario.", textStyle);
        rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "6. Cuatrimestre válido: 1 a 11.", textStyle);
        rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "7. La carrera debe seleccionarse del catálogo desplegable.", textStyle);
        rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "8. La matrícula se trata como texto para conservar ceros y formato.", textStyle);

        rowIndex++;
        Row careersTitle = instructionsSheet.createRow(rowIndex++);
        Cell careersTitleCell = careersTitle.createCell(0);
        careersTitleCell.setCellValue("Carreras permitidas");
        careersTitleCell.setCellStyle(titleStyle);

        for (Career career : careers) {
            rowIndex = writeInstructionLine(instructionsSheet, rowIndex, "• " + career.getName(), textStyle);
        }
    }

    private int writeInstructionLine(Sheet sheet, int rowIndex, String text, CellStyle style) {
        Row row = sheet.createRow(rowIndex);
        Cell cell = row.createCell(0);
        cell.setCellValue(text);
        cell.setCellStyle(style);
        return rowIndex + 1;
    }

    private CellStyle createTemplateHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createInstructionTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createInstructionTextStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        style.setWrapText(true);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.TOP);
        return style;
    }

    private CellStyle createTextCellStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        DataFormat dataFormat = workbook.createDataFormat();
        style.setDataFormat(dataFormat.getFormat("@"));
        return style;
    }

    private CareerLookup buildCareerLookup() {
        List<Career> careers = loadTemplateCareers();

        Map<String, Career> byName = new HashMap<>();
        Map<String, Career> byCode = new HashMap<>();

        for (Career career : careers) {
            if (career == null) {
                continue;
            }
            String nameKey = normalizeCatalogToken(career.getName());
            if (StringUtils.hasText(nameKey)) {
                byName.putIfAbsent(nameKey, career);
            }
            String codeKey = normalizeCatalogToken(career.getCode()).replace(" ", "");
            if (StringUtils.hasText(codeKey)) {
                byCode.putIfAbsent(codeKey, career);
            }
        }

        return new CareerLookup(byName, byCode);
    }

    private static Map<String, String> buildHeaderAliasMap() {
        Map<String, String> aliases = new HashMap<>();

        putHeaderAlias(aliases, COL_NAME, "nombres", "nombre", "name");
        putHeaderAlias(aliases, COL_LAST_NAME_PATERNAL, "apellido paterno", "apellido_paterno", "apellidopaterno", "lastnamepaternal");
        putHeaderAlias(aliases, COL_LAST_NAME_MATERNAL, "apellido materno", "apellido_materno", "apellidomaterno", "lastnamematernal");
        putHeaderAlias(aliases, COL_SEX, "sexo", "sex");
        putHeaderAlias(aliases, COL_ENROLLMENT, "matricula", "matrícula", "enrollmentid", "enrollment_id");
        putHeaderAlias(aliases, COL_QUARTER, "cuatrimestre", "quarter");
        putHeaderAlias(aliases, COL_CAREER, "carrera", "career", "careercode", "career_code");
        putHeaderAlias(aliases, COL_INSTITUTIONAL_EMAIL, "institutionalemail", "institutional_email", "correo", "email", "correoinstitucional", "correo institucional");

        return aliases;
    }

    private static void putHeaderAlias(Map<String, String> aliases, String canonical, String... tokens) {
        for (String token : tokens) {
            aliases.put(normalizeHeaderToken(token), canonical);
        }
    }

    private static String normalizeHeaderToken(String raw) {
        if (raw == null) {
            return "";
        }
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
        return normalized.replaceAll("[^a-z0-9]", "");
    }

    private static String normalizeCatalogToken(String raw) {
        if (raw == null) {
            return "";
        }
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
        return normalized.replaceAll("\\s+", " ");
    }

    private record CareerLookup(
            Map<String, Career> byName,
            Map<String, Career> byCode
    ) {
        Career resolve(String rawValue) {
            String token = normalizeCatalogToken(rawValue);
            if (!StringUtils.hasText(token)) {
                return null;
            }

            Career byCareerName = byName.get(token);
            if (byCareerName != null) {
                return byCareerName;
            }

            String compactToken = token.replace(" ", "");
            return byCode.get(compactToken);
        }
    }

    private record ValidationOutcome<T>(T value, StudentImportRowError error) {
        static <T> ValidationOutcome<T> success(T value) {
            return new ValidationOutcome<>(value, null);
        }

        static <T> ValidationOutcome<T> error(StudentImportRowError error) {
            return new ValidationOutcome<>(null, error);
        }
    }

    private record ImportRowOutcome(StudentImportRowError error, EmailDispatchJobResponse emailJob) {
        static ImportRowOutcome error(StudentImportRowError error) {
            return new ImportRowOutcome(error, null);
        }

        static ImportRowOutcome success(EmailDispatchJobResponse emailJob) {
            return new ImportRowOutcome(null, emailJob);
        }
    }
}
