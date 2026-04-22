package mx.edu.utez.server.modules.dashboard.service.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessTrendsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisExportRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisWidgetControlsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerKpiResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerRankingKpiResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerRankingTableItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerRankingTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerStudentTableItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerStudentTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardExportFormat;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterSummary;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentAccessSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentActivityItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentActivityTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentRankingKpiResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentRankingTableItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentRankingTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTableWidgetControlRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareerItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareersResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTrendPointResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardWidgetResponse;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xddf.usermodel.chart.AxisCrosses;
import org.apache.poi.xddf.usermodel.chart.AxisPosition;
import org.apache.poi.xddf.usermodel.chart.BarDirection;
import org.apache.poi.xddf.usermodel.chart.ChartTypes;
import org.apache.poi.xddf.usermodel.chart.LegendPosition;
import org.apache.poi.xddf.usermodel.chart.MarkerStyle;
import org.apache.poi.xddf.usermodel.chart.XDDFBarChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFCategoryAxis;
import org.apache.poi.xddf.usermodel.chart.XDDFChartLegend;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSourcesFactory;
import org.apache.poi.xddf.usermodel.chart.XDDFLineChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFNumericalDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFValueAxis;
import org.apache.poi.xssf.usermodel.DefaultIndexedColorMap;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFChart;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class DashboardAnalysisExportService {

    private static final DateTimeFormatter DISPLAY_TS_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DISPLAY_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter FILENAME_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final String CSV_CONTENT_TYPE = "text/csv; charset=UTF-8";
    private static final String XLSX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final DashboardAnalysisService dashboardAnalysisService;
    private final ObjectMapper objectMapper;

    public DashboardAnalysisExportService(
            DashboardAnalysisService dashboardAnalysisService,
            ObjectMapper objectMapper
    ) {
        this.dashboardAnalysisService = dashboardAnalysisService;
        this.objectMapper = objectMapper;
    }

    public ExportedDashboardAnalysisFile export(DashboardAnalysisExportRequest request) {
        validateRequest(request);

        DashboardAnalysisRequest exportRequest = buildExportAnalysisRequest(request.analysis());
        DashboardAnalysisResponse analysisResponse = dashboardAnalysisService.analyze(exportRequest);

        ExportAnalysisSnapshot snapshot = new ExportAnalysisSnapshot(
                exportRequest,
                analysisResponse,
                collectCareerStudentRows(exportRequest, analysisResponse),
                collectStudentActivityRows(exportRequest, analysisResponse)
        );

        byte[] content = switch (request.format()) {
            case CSV -> exportCsv(snapshot.analysisResponse());
            case XLSX -> exportMonitoringReportToXlsx(snapshot);
        };

        return new ExportedDashboardAnalysisFile(
                buildFilename(snapshot.request(), snapshot.analysisResponse(), request.format()),
                request.format() == DashboardExportFormat.XLSX ? XLSX_CONTENT_TYPE : CSV_CONTENT_TYPE,
                content
        );
    }

    private void validateRequest(DashboardAnalysisExportRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "El body de export no puede ser nulo.");
        }
        if (request.analysis() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "analysis es obligatorio para export.");
        }
        if (request.format() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "format es obligatorio para export.");
        }
    }

    private DashboardAnalysisRequest buildExportAnalysisRequest(DashboardAnalysisRequest request) {
        DashboardAnalysisWidgetControlsRequest controls = request.widgetControls();

        DashboardTableWidgetControlRequest studentActivityControl = controls == null ? null : controls.studentActivityTable();
        DashboardTableWidgetControlRequest careerStudentControl = controls == null ? null : controls.careerStudentTable();

        if (isStudentDetailRequest(request)) {
            DashboardTableWidgetControlRequest source = studentActivityControl;
            studentActivityControl = new DashboardTableWidgetControlRequest(
                    0,
                    DashboardWidgetComposer.STUDENT_ACTIVITY_MAX_SIZE,
                    source == null || source.sortBy() == null || source.sortBy().isBlank()
                            ? DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SORT_BY
                            : source.sortBy(),
                    source == null || source.sortDirection() == null
                            ? DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SORT_DIRECTION
                            : source.sortDirection()
            );
        }

        if (isCareerDetailRequest(request)) {
            DashboardTableWidgetControlRequest source = careerStudentControl;
            careerStudentControl = new DashboardTableWidgetControlRequest(
                    0,
                    DashboardWidgetComposer.CAREER_STUDENT_TABLE_MAX_SIZE,
                    source == null || source.sortBy() == null || source.sortBy().isBlank()
                            ? DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_BY
                            : source.sortBy(),
                    source == null || source.sortDirection() == null
                            ? DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_DIRECTION
                            : source.sortDirection()
            );
        }

        DashboardAnalysisWidgetControlsRequest exportControls =
                studentActivityControl == null && careerStudentControl == null
                        ? null
                        : new DashboardAnalysisWidgetControlsRequest(studentActivityControl, careerStudentControl);

        return new DashboardAnalysisRequest(
                request.scope(),
                request.mode(),
                request.studentId(),
                request.careerIds(),
                request.accessResult(),
                request.dateFilterType(),
                request.dateFrom(),
                request.dateTo(),
                request.rankingMode(),
                request.topN(),
                request.sortDirection(),
                exportControls
        );
    }

    private boolean isStudentDetailRequest(DashboardAnalysisRequest request) {
        DashboardRankingMode rankingMode = request.rankingMode() == null ? DashboardRankingMode.NONE : request.rankingMode();
        return request.scope() == DashboardFilterScope.STUDENTS
                && request.mode() == DashboardFilterMode.INDIVIDUAL
                && rankingMode == DashboardRankingMode.NONE;
    }

    private boolean isCareerDetailRequest(DashboardAnalysisRequest request) {
        DashboardRankingMode rankingMode = request.rankingMode() == null ? DashboardRankingMode.NONE : request.rankingMode();
        return request.scope() == DashboardFilterScope.CAREERS
                && request.mode() == DashboardFilterMode.INDIVIDUAL
                && rankingMode == DashboardRankingMode.NONE;
    }

    private List<DashboardCareerStudentTableItemResponse> collectCareerStudentRows(
            DashboardAnalysisRequest baseRequest,
            DashboardAnalysisResponse firstResponse
    ) {
        DashboardCareerStudentTableResponse firstTable = extractWidgetData(
                firstResponse,
                DashboardCareerStudentTableResponse.class
        );

        if (firstTable == null) {
            return List.of();
        }

        List<DashboardCareerStudentTableItemResponse> allItems = new ArrayList<>(firstTable.items());
        if (firstTable.totalElements() <= firstTable.items().size()) {
            return allItems;
        }

        int pageSize = Math.max(1, firstTable.size());
        int totalPages = (int) Math.ceil(firstTable.totalElements() / (double) pageSize);

        for (int page = 1; page < totalPages; page++) {
            DashboardAnalysisRequest pagedRequest = withCareerStudentTablePage(baseRequest, page, pageSize);
            DashboardAnalysisResponse pageResponse = dashboardAnalysisService.analyze(pagedRequest);
            DashboardCareerStudentTableResponse pageTable = extractWidgetData(
                    pageResponse,
                    DashboardCareerStudentTableResponse.class
            );
            if (pageTable == null || pageTable.items().isEmpty()) {
                continue;
            }
            allItems.addAll(pageTable.items());
        }

        return allItems;
    }

    private DashboardAnalysisRequest withCareerStudentTablePage(
            DashboardAnalysisRequest request,
            int page,
            int size
    ) {
        DashboardAnalysisWidgetControlsRequest controls = request.widgetControls();
        DashboardTableWidgetControlRequest careerControl = controls == null ? null : controls.careerStudentTable();

        DashboardTableWidgetControlRequest updatedCareerControl = new DashboardTableWidgetControlRequest(
                page,
                size,
                careerControl == null || careerControl.sortBy() == null || careerControl.sortBy().isBlank()
                        ? DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_BY
                        : careerControl.sortBy(),
                careerControl == null || careerControl.sortDirection() == null
                        ? DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_DIRECTION
                        : careerControl.sortDirection()
        );

        DashboardAnalysisWidgetControlsRequest updatedControls = new DashboardAnalysisWidgetControlsRequest(
                controls == null ? null : controls.studentActivityTable(),
                updatedCareerControl
        );

        return new DashboardAnalysisRequest(
                request.scope(),
                request.mode(),
                request.studentId(),
                request.careerIds(),
                request.accessResult(),
                request.dateFilterType(),
                request.dateFrom(),
                request.dateTo(),
                request.rankingMode(),
                request.topN(),
                request.sortDirection(),
                updatedControls
        );
    }

    private List<DashboardStudentActivityItemResponse> collectStudentActivityRows(
            DashboardAnalysisRequest baseRequest,
            DashboardAnalysisResponse firstResponse
    ) {
        DashboardStudentActivityTableResponse firstTable = extractWidgetData(
                firstResponse,
                DashboardStudentActivityTableResponse.class
        );

        if (firstTable == null) {
            return List.of();
        }

        List<DashboardStudentActivityItemResponse> allItems = new ArrayList<>(firstTable.items());
        if (firstTable.totalElements() <= firstTable.items().size()) {
            return allItems;
        }

        int pageSize = Math.max(1, firstTable.size());
        int totalPages = (int) Math.ceil(firstTable.totalElements() / (double) pageSize);

        for (int page = 1; page < totalPages; page++) {
            DashboardAnalysisRequest pagedRequest = withStudentActivityPage(baseRequest, page, pageSize);
            DashboardAnalysisResponse pageResponse = dashboardAnalysisService.analyze(pagedRequest);
            DashboardStudentActivityTableResponse pageTable = extractWidgetData(
                    pageResponse,
                    DashboardStudentActivityTableResponse.class
            );
            if (pageTable == null || pageTable.items().isEmpty()) {
                continue;
            }
            allItems.addAll(pageTable.items());
        }

        return allItems;
    }

    private DashboardAnalysisRequest withStudentActivityPage(
            DashboardAnalysisRequest request,
            int page,
            int size
    ) {
        DashboardAnalysisWidgetControlsRequest controls = request.widgetControls();
        DashboardTableWidgetControlRequest activityControl = controls == null ? null : controls.studentActivityTable();

        DashboardTableWidgetControlRequest updatedActivityControl = new DashboardTableWidgetControlRequest(
                page,
                size,
                activityControl == null || activityControl.sortBy() == null || activityControl.sortBy().isBlank()
                        ? DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SORT_BY
                        : activityControl.sortBy(),
                activityControl == null || activityControl.sortDirection() == null
                        ? DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SORT_DIRECTION
                        : activityControl.sortDirection()
        );

        DashboardAnalysisWidgetControlsRequest updatedControls = new DashboardAnalysisWidgetControlsRequest(
                updatedActivityControl,
                controls == null ? null : controls.careerStudentTable()
        );

        return new DashboardAnalysisRequest(
                request.scope(),
                request.mode(),
                request.studentId(),
                request.careerIds(),
                request.accessResult(),
                request.dateFilterType(),
                request.dateFrom(),
                request.dateTo(),
                request.rankingMode(),
                request.topN(),
                request.sortDirection(),
                updatedControls
        );
    }

    private <T> T extractWidgetData(DashboardAnalysisResponse analysisResponse, Class<T> type) {
        for (DashboardWidgetResponse widget : analysisResponse.widgets()) {
            if (type.isInstance(widget.data())) {
                return type.cast(widget.data());
            }
        }
        return null;
    }

    private byte[] exportMonitoringReportToXlsx(ExportAnalysisSnapshot snapshot) {
        MonitoringReportExportData exportData = buildMonitoringReportExportData(snapshot);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             XSSFWorkbook workbook = new XSSFWorkbook()) {
            WorkbookStyles styles = new WorkbookStyles(workbook);

            buildSummarySheet(workbook, styles, exportData);
            buildTrendSheet(workbook, styles, exportData);
            buildTopCareersSheet(workbook, styles, exportData);
            buildTopUsersSheet(workbook, styles, exportData);
            buildRawDataSheet(workbook, styles, exportData);

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new RuntimeException("No fue posible generar el export XLSX de Monitoring and Reports.", ex);
        }
    }

    private MonitoringReportExportData buildMonitoringReportExportData(ExportAnalysisSnapshot snapshot) {
        ReportContext context = buildReportContext(snapshot.request(), snapshot.analysisResponse());
        SummaryExportData summary = buildSummaryExportData(snapshot.analysisResponse());
        List<TrendExportRow> trendRows = buildTrendExportData(snapshot.analysisResponse());
        List<TopCareerExportRow> careerRows = buildTopCareersExportData(snapshot.analysisResponse());
        List<TopUserExportRow> userRows = buildTopUsersExportData(
                snapshot.analysisResponse(),
                snapshot.allCareerStudents(),
                snapshot.allStudentActivities()
        );

        if (summary.totalAccesses() == 0L && !trendRows.isEmpty()) {
            long computedTotal = trendRows.stream().mapToLong(TrendExportRow::total).sum();
            summary = summary.withTotals(summary.totalStudents(), computedTotal, summary.successfulAccesses(), summary.failedAccesses());
        }

        if (summary.totalStudents() == 0L && !userRows.isEmpty()) {
            summary = summary.withTotals(userRows.size(), summary.totalAccesses(), summary.successfulAccesses(), summary.failedAccesses());
        }

        List<RawExportRow> rawRows = buildRawExportData(
                trendRows,
                careerRows,
                userRows,
                snapshot.allCareerStudents(),
                snapshot.allStudentActivities()
        );

        return new MonitoringReportExportData(context, summary, trendRows, careerRows, userRows, rawRows);
    }

    private ReportContext buildReportContext(
            DashboardAnalysisRequest request,
            DashboardAnalysisResponse analysisResponse
    ) {
        DashboardFilterSummary summary = analysisResponse.summary();
        Instant from = summary.dateFrom();
        Instant to = summary.dateTo();

        boolean filtered = isFilteredRequest(request, summary);
        String exportKind = filtered ? "Filtrada" : "General";

        String range = from != null && to != null
                ? DISPLAY_DATE_FORMAT.format(from) + " - " + DISPLAY_DATE_FORMAT.format(to)
                : "No definido";
        long days = from != null && to != null
                ? Math.max(1L, Duration.between(from, to).toDays() + 1L)
                : 0L;
        String window = days > 0 ? days + " días" : "No definido";

        List<String> filters = buildFiltersDescription(request, summary);

        return new ReportContext(
                exportKind,
                DISPLAY_TS_FORMAT.format(Instant.now()),
                range,
                window,
                analysisResponse.layoutType().name(),
                summary.scope().name(),
                summary.mode().name(),
                summary.accessResult().name(),
                summary.rankingMode().name(),
                summary.topN(),
                summary.sortDirection().name(),
                filters
        );
    }

    private boolean isFilteredRequest(DashboardAnalysisRequest request, DashboardFilterSummary summary) {
        boolean hasDateRange = summary.dateFilterType() == DashboardDateFilterType.CUSTOM_RANGE;
        boolean hasScopeModeFilter = request.scope() != DashboardFilterScope.STUDENTS || request.mode() != DashboardFilterMode.ALL;
        boolean hasEntityFilter = request.studentId() != null || (request.careerIds() != null && !request.careerIds().isEmpty());
        boolean hasResultFilter = summary.accessResult() != null && !"ALL".equals(summary.accessResult().name());
        boolean hasRanking = summary.rankingMode() == DashboardRankingMode.TOP;
        return hasDateRange || hasScopeModeFilter || hasEntityFilter || hasResultFilter || hasRanking;
    }

    private List<String> buildFiltersDescription(DashboardAnalysisRequest request, DashboardFilterSummary summary) {
        List<String> filters = new ArrayList<>();

        if (request.studentId() != null) {
            filters.add("Alumno: " + request.studentId());
        }
        if (request.careerIds() != null && !request.careerIds().isEmpty()) {
            filters.add("Carreras: " + request.careerIds().stream().map(UUID::toString).toList());
        }
        if (summary.accessResult() != null && !"ALL".equals(summary.accessResult().name())) {
            filters.add("Resultado de acceso: " + summary.accessResult().name());
        }
        if (summary.dateFilterType() == DashboardDateFilterType.CUSTOM_RANGE && summary.dateFrom() != null && summary.dateTo() != null) {
            filters.add("Rango personalizado: "
                    + DISPLAY_DATE_FORMAT.format(summary.dateFrom())
                    + " a "
                    + DISPLAY_DATE_FORMAT.format(summary.dateTo()));
        }
        if (summary.rankingMode() == DashboardRankingMode.TOP) {
            filters.add("Top N: " + (summary.topN() == null ? "No definido" : summary.topN()));
        }
        if (summary.sortDirection() != null) {
            filters.add("Orden: " + summary.sortDirection().name());
        }

        if (filters.isEmpty()) {
            filters.add("Sin filtros adicionales");
        }

        return filters;
    }

    private SummaryExportData buildSummaryExportData(DashboardAnalysisResponse analysisResponse) {
        DashboardSummaryResponse summaryWidget = extractWidgetData(analysisResponse, DashboardSummaryResponse.class);
        if (summaryWidget != null) {
            long successful = summaryWidget.successfulAccessesInRange();
            long failed = summaryWidget.failedAccessesInRange();
            return new SummaryExportData(
                    summaryWidget.totalStudents(),
                    successful + failed,
                    successful,
                    failed
            );
        }

        DashboardCareerKpiResponse careerKpi = extractWidgetData(analysisResponse, DashboardCareerKpiResponse.class);
        if (careerKpi != null) {
            return new SummaryExportData(
                    careerKpi.uniqueStudentsImpacted(),
                    careerKpi.totalAccesses(),
                    careerKpi.successfulAccesses(),
                    careerKpi.failedAccesses()
            );
        }

        DashboardStudentRankingKpiResponse studentRankingKpi = extractWidgetData(
                analysisResponse,
                DashboardStudentRankingKpiResponse.class
        );
        if (studentRankingKpi != null) {
            return new SummaryExportData(
                    studentRankingKpi.uniqueStudentsImpacted(),
                    studentRankingKpi.totalAccesses(),
                    studentRankingKpi.successfulAccesses(),
                    studentRankingKpi.failedAccesses()
            );
        }

        DashboardCareerRankingKpiResponse careerRankingKpi = extractWidgetData(
                analysisResponse,
                DashboardCareerRankingKpiResponse.class
        );
        if (careerRankingKpi != null) {
            return new SummaryExportData(
                    careerRankingKpi.uniqueCareersImpacted(),
                    careerRankingKpi.totalAccesses(),
                    careerRankingKpi.successfulAccesses(),
                    careerRankingKpi.failedAccesses()
            );
        }

        DashboardStudentAccessSummaryResponse studentSummary = extractWidgetData(
                analysisResponse,
                DashboardStudentAccessSummaryResponse.class
        );
        if (studentSummary != null) {
            return new SummaryExportData(
                    1,
                    studentSummary.totalAccesses(),
                    studentSummary.successfulAccesses(),
                    studentSummary.failedAccesses()
            );
        }

        return new SummaryExportData(0L, 0L, 0L, 0L);
    }

    private List<TrendExportRow> buildTrendExportData(DashboardAnalysisResponse analysisResponse) {
        DashboardAccessTrendsResponse trendWidget = extractWidgetData(analysisResponse, DashboardAccessTrendsResponse.class);
        if (trendWidget == null || trendWidget.points() == null) {
            return List.of();
        }

        List<TrendExportRow> rows = new ArrayList<>();
        for (DashboardTrendPointResponse point : trendWidget.points()) {
            long successful = point.successful();
            long failed = point.failed();
            rows.add(new TrendExportRow(point.day(), successful + failed, successful, failed));
        }
        return rows;
    }

    private List<TopCareerExportRow> buildTopCareersExportData(DashboardAnalysisResponse analysisResponse) {
        DashboardTopCareersResponse topCareers = extractWidgetData(analysisResponse, DashboardTopCareersResponse.class);
        if (topCareers != null && topCareers.careers() != null && !topCareers.careers().isEmpty()) {
            List<TopCareerExportRow> rows = new ArrayList<>();
            int position = 1;
            for (DashboardTopCareerItemResponse item : topCareers.careers()) {
                rows.add(new TopCareerExportRow(
                        position++,
                        item.careerCode(),
                        item.careerName(),
                        item.successfulAccesses(),
                        item.failedAccesses(),
                        item.totalAccesses(),
                        "TOTAL"
                ));
            }
            return rows;
        }

        List<DashboardCareerRankingTableResponse> rankingTables = extractWidgetDataList(
                analysisResponse,
                DashboardCareerRankingTableResponse.class
        );

        if (rankingTables.isEmpty()) {
            return List.of();
        }

        Map<UUID, MutableCareerAggregate> aggregateMap = new LinkedHashMap<>();
        for (DashboardCareerRankingTableResponse table : rankingTables) {
            String metric = table.rankingMetric() == null ? "TOTAL" : table.rankingMetric().toUpperCase(Locale.ROOT);
            for (DashboardCareerRankingTableItemResponse item : table.items()) {
                MutableCareerAggregate aggregate = aggregateMap.computeIfAbsent(
                        item.careerId(),
                        id -> new MutableCareerAggregate(item.careerCode(), item.careerName())
                );
                if ("SUCCESS".equals(metric)) {
                    aggregate.successful += item.rankingValue();
                } else if ("FAILED".equals(metric)) {
                    aggregate.failed += item.rankingValue();
                } else {
                    aggregate.total += item.rankingValue();
                }
                aggregate.metric = metric;
            }
        }

        List<TopCareerExportRow> rows = new ArrayList<>();
        for (MutableCareerAggregate aggregate : aggregateMap.values()) {
            long effectiveTotal = aggregate.total > 0 ? aggregate.total : aggregate.successful + aggregate.failed;
            rows.add(new TopCareerExportRow(
                    0,
                    aggregate.careerCode,
                    aggregate.careerName,
                    aggregate.successful,
                    aggregate.failed,
                    effectiveTotal,
                    aggregate.metric
            ));
        }

        rows.sort(Comparator.comparingLong(TopCareerExportRow::totalAccesses).reversed()
                .thenComparing(TopCareerExportRow::careerCode));

        for (int i = 0; i < rows.size(); i++) {
            TopCareerExportRow current = rows.get(i);
            rows.set(i, new TopCareerExportRow(
                    i + 1,
                    current.careerCode(),
                    current.careerName(),
                    current.successfulAccesses(),
                    current.failedAccesses(),
                    current.totalAccesses(),
                    current.metric()
            ));
        }

        return rows;
    }

    private List<TopUserExportRow> buildTopUsersExportData(
            DashboardAnalysisResponse analysisResponse,
            List<DashboardCareerStudentTableItemResponse> allCareerStudents,
            List<DashboardStudentActivityItemResponse> allStudentActivities
    ) {
        DashboardTopStudentsResponse topStudents = extractWidgetData(analysisResponse, DashboardTopStudentsResponse.class);
        if (topStudents != null && topStudents.students() != null && !topStudents.students().isEmpty()) {
            List<TopUserExportRow> rows = new ArrayList<>();
            int position = 1;
            for (DashboardTopStudentItemResponse item : topStudents.students()) {
                double successRate = item.totalAccesses() == 0L
                        ? 0.0
                        : (item.successfulAccesses() * 100.0) / item.totalAccesses();
                rows.add(new TopUserExportRow(
                        position++,
                        item.studentId() == null ? "" : item.studentId().toString(),
                        item.name(),
                        item.enrollmentId(),
                        item.successfulAccesses(),
                        item.failedAccesses(),
                        item.totalAccesses(),
                        successRate
                ));
            }
            return rows;
        }

        DashboardStudentRankingTableResponse rankingTable = extractWidgetData(
                analysisResponse,
                DashboardStudentRankingTableResponse.class
        );
        if (rankingTable != null && rankingTable.items() != null && !rankingTable.items().isEmpty()) {
            return rankingTable.items().stream()
                    .map(item -> new TopUserExportRow(
                            item.position(),
                            item.studentId() == null ? "" : item.studentId().toString(),
                            item.studentName(),
                            item.enrollmentId(),
                            item.successfulAccesses(),
                            item.failedAccesses(),
                            item.totalAccesses(),
                            item.successRate()
                    ))
                    .toList();
        }

        if (!allCareerStudents.isEmpty()) {
            List<TopUserExportRow> rows = new ArrayList<>();
            int position = 1;
            for (DashboardCareerStudentTableItemResponse item : allCareerStudents) {
                rows.add(new TopUserExportRow(
                        position++,
                        item.studentId() == null ? "" : item.studentId().toString(),
                        item.studentName(),
                        item.enrollmentId(),
                        item.successfulAccesses(),
                        item.failedAccesses(),
                        item.totalAccesses(),
                        item.successRate()
                ));
            }
            return rows;
        }

        DashboardStudentAccessSummaryResponse studentSummary = extractWidgetData(
                analysisResponse,
                DashboardStudentAccessSummaryResponse.class
        );
        if (studentSummary != null) {
            return List.of(new TopUserExportRow(
                    1,
                    studentSummary.studentId() == null ? "" : studentSummary.studentId().toString(),
                    studentSummary.studentName(),
                    studentSummary.enrollmentId(),
                    studentSummary.successfulAccesses(),
                    studentSummary.failedAccesses(),
                    studentSummary.totalAccesses(),
                    studentSummary.successRate()
            ));
        }

        if (!allStudentActivities.isEmpty()) {
            return List.of(new TopUserExportRow(
                    1,
                    "",
                    "Actividad de estudiante (detalle)",
                    "",
                    (long) allStudentActivities.stream().filter(item -> "SUCCESS".equalsIgnoreCase(item.result())).count(),
                    (long) allStudentActivities.stream().filter(item -> !"SUCCESS".equalsIgnoreCase(item.result())).count(),
                    (long) allStudentActivities.size(),
                    allStudentActivities.isEmpty()
                            ? 0.0
                            : (100.0 * allStudentActivities.stream().filter(item -> "SUCCESS".equalsIgnoreCase(item.result())).count())
                            / allStudentActivities.size()
            ));
        }

        return List.of();
    }

    private <T> List<T> extractWidgetDataList(DashboardAnalysisResponse analysisResponse, Class<T> type) {
        List<T> result = new ArrayList<>();
        for (DashboardWidgetResponse widget : analysisResponse.widgets()) {
            if (type.isInstance(widget.data())) {
                result.add(type.cast(widget.data()));
            }
        }
        return result;
    }

    private List<RawExportRow> buildRawExportData(
            List<TrendExportRow> trendRows,
            List<TopCareerExportRow> careerRows,
            List<TopUserExportRow> userRows,
            List<DashboardCareerStudentTableItemResponse> allCareerStudents,
            List<DashboardStudentActivityItemResponse> allStudentActivities
    ) {
        List<RawExportRow> rows = new ArrayList<>();

        for (TrendExportRow row : trendRows) {
            rows.add(RawExportRow.fromTrend(row));
        }
        for (TopCareerExportRow row : careerRows) {
            rows.add(RawExportRow.fromCareer(row));
        }
        for (TopUserExportRow row : userRows) {
            rows.add(RawExportRow.fromUser(row));
        }
        for (DashboardCareerStudentTableItemResponse row : allCareerStudents) {
            rows.add(RawExportRow.fromCareerStudent(row));
        }
        for (DashboardStudentActivityItemResponse row : allStudentActivities) {
            rows.add(RawExportRow.fromStudentActivity(row));
        }

        return rows;
    }

    private void buildSummarySheet(XSSFWorkbook workbook, WorkbookStyles styles, MonitoringReportExportData data) {
        XSSFSheet sheet = workbook.createSheet("Resumen");
        configureSummaryColumns(sheet);

        int row = 0;
        row = writeMergedRow(sheet, row, 0, 11, "Monitoring and Reports", styles.titleStyle());
        row = writeMergedRow(sheet, row, 0, 11, "Reporte ejecutivo de monitoreo y acceso", styles.subtitleStyle());
        row++;

        row = writeMergedRow(sheet, row, 0, 11, "Contexto del reporte", styles.sectionHeaderStyle());
        row = writeContextRow(sheet, row, "Tipo de exportación", data.context().exportKind(), styles);
        row = writeContextRow(sheet, row, "Fecha de generación", data.context().generatedAtUtc() + " UTC", styles);
        row = writeContextRow(sheet, row, "Rango analizado", data.context().analyzedRange(), styles);
        row = writeContextRow(sheet, row, "Tamaño de ventana", data.context().windowSize(), styles);
        row = writeContextRow(sheet, row, "Layout", data.context().layoutType(), styles);
        row = writeContextRow(sheet, row, "Scope / Mode", data.context().scope() + " / " + data.context().mode(), styles);

        row++;
        row = writeMergedRow(sheet, row, 0, 11, "Filtros aplicados", styles.sectionHeaderStyle());
        for (String filter : data.context().filters()) {
            Row filterRow = sheet.createRow(row++);
            createTextCell(filterRow, 0, "• " + filter, styles.valueStyle());
            mergeCells(sheet, filterRow.getRowNum(), filterRow.getRowNum(), 0, 11);
        }

        int kpiStartRow = Math.max(row + 1, 12);
        writeMergedRow(sheet, kpiStartRow - 1, 0, 11, "KPIs principales", styles.sectionHeaderStyle());

        buildKpiCard(sheet, styles, kpiStartRow, 0, 2, "Alumnos totales", data.summary().totalStudents(), KpiVariant.PRIMARY);
        buildKpiCard(sheet, styles, kpiStartRow, 3, 5, "Accesos totales", data.summary().totalAccesses(), KpiVariant.INFO);
        buildKpiCard(sheet, styles, kpiStartRow, 6, 8, "Accesos exitosos", data.summary().successfulAccesses(), KpiVariant.SUCCESS);
        buildKpiCard(sheet, styles, kpiStartRow, 9, 11, "Accesos fallidos", data.summary().failedAccesses(), KpiVariant.DANGER);
    }

    private void configureSummaryColumns(Sheet sheet) {
        int[] widths = {16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16};
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    private int writeContextRow(
            Sheet sheet,
            int rowIndex,
            String label,
            String value,
            WorkbookStyles styles
    ) {
        Row row = sheet.createRow(rowIndex);
        createTextCell(row, 0, label, styles.labelStyle());
        createTextCell(row, 1, value, styles.valueStyle());
        mergeCells(sheet, rowIndex, rowIndex, 1, 11);
        return rowIndex + 1;
    }

    private void buildKpiCard(
            Sheet sheet,
            WorkbookStyles styles,
            int startRow,
            int startCol,
            int endCol,
            String label,
            long value,
            KpiVariant variant
    ) {
        CellStyle containerStyle = styles.kpiContainerStyle(variant);
        CellStyle labelStyle = styles.kpiLabelStyle(variant);
        CellStyle valueStyle = styles.kpiValueStyle(variant);

        int endRow = startRow + 4;
        for (int row = startRow; row <= endRow; row++) {
            Row current = sheet.getRow(row);
            if (current == null) {
                current = sheet.createRow(row);
            }
            for (int col = startCol; col <= endCol; col++) {
                Cell cell = current.getCell(col);
                if (cell == null) {
                    cell = current.createCell(col);
                }
                cell.setCellStyle(containerStyle);
            }
        }

        mergeCells(sheet, startRow, startRow, startCol, endCol);
        mergeCells(sheet, startRow + 1, endRow, startCol, endCol);

        Row labelRow = sheet.getRow(startRow);
        createTextCell(labelRow, startCol, label, labelStyle);

        Row valueRow = sheet.getRow(startRow + 1);
        createNumericCell(valueRow, startCol, value, valueStyle);
    }

    private void buildTrendSheet(XSSFWorkbook workbook, WorkbookStyles styles, MonitoringReportExportData data) {
        XSSFSheet sheet = workbook.createSheet("Tendencia de accesos");
        configureStandardColumns(sheet, 10, 20);

        int row = 0;
        row = writeMergedRow(sheet, row, 0, 9, "Tendencia de accesos", styles.titleStyle());
        row = writeMergedRow(sheet, row, 0, 9, "Serie diaria: ambos, exitosos y fallidos", styles.subtitleStyle());

        int tableHeaderRow = 21;
        Row header = sheet.createRow(tableHeaderRow);
        createTextCell(header, 0, "Día", styles.tableHeaderStyle());
        createTextCell(header, 1, "Ambos", styles.tableHeaderStyle());
        createTextCell(header, 2, "Exitosos", styles.tableHeaderStyle());
        createTextCell(header, 3, "Fallidos", styles.tableHeaderStyle());

        int currentRow = tableHeaderRow + 1;
        for (TrendExportRow trend : data.trendRows()) {
            Row dataRow = sheet.createRow(currentRow++);
            createTextCell(dataRow, 0, trend.day(), styles.valueStyle());
            createNumericCell(dataRow, 1, trend.total(), styles.numberStyle());
            createNumericCell(dataRow, 2, trend.successful(), styles.numberStyle());
            createNumericCell(dataRow, 3, trend.failed(), styles.numberStyle());
        }

        if (currentRow == tableHeaderRow + 1) {
            Row emptyRow = sheet.createRow(currentRow++);
            createTextCell(emptyRow, 0, "Sin datos para la tendencia seleccionada", styles.valueStyle());
            mergeCells(sheet, emptyRow.getRowNum(), emptyRow.getRowNum(), 0, 3);
        }

        sheet.setAutoFilter(new CellRangeAddress(tableHeaderRow, currentRow - 1, 0, 3));

        if (!data.trendRows().isEmpty()) {
            addTrendChart(sheet, tableHeaderRow + 1, currentRow - 1);
        }
    }

    private void addTrendChart(XSSFSheet sheet, int firstDataRow, int lastDataRow) {
        XSSFDrawing drawing = sheet.createDrawingPatriarch();
        XSSFClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0, 0, 3, 9, 19);
        XSSFChart chart = drawing.createChart(anchor);

        chart.setTitleText("Tendencia de accesos");
        chart.setTitleOverlay(false);

        XDDFCategoryAxis bottomAxis = chart.createCategoryAxis(AxisPosition.BOTTOM);
        XDDFValueAxis leftAxis = chart.createValueAxis(AxisPosition.LEFT);
        leftAxis.setCrosses(AxisCrosses.AUTO_ZERO);

        XDDFDataSource<String> days = XDDFDataSourcesFactory.fromStringCellRange(
                sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, 0, 0)
        );
        XDDFNumericalDataSource<Double> total = XDDFDataSourcesFactory.fromNumericCellRange(
                sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, 1, 1)
        );
        XDDFNumericalDataSource<Double> successful = XDDFDataSourcesFactory.fromNumericCellRange(
                sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, 2, 2)
        );
        XDDFNumericalDataSource<Double> failed = XDDFDataSourcesFactory.fromNumericCellRange(
                sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, 3, 3)
        );

        XDDFLineChartData lineChartData = (XDDFLineChartData) chart.createData(ChartTypes.LINE, bottomAxis, leftAxis);
        XDDFLineChartData.Series totalSeries = (XDDFLineChartData.Series) lineChartData.addSeries(days, total);
        totalSeries.setTitle("Ambos", null);
        totalSeries.setSmooth(false);
        totalSeries.setMarkerStyle(MarkerStyle.CIRCLE);

        XDDFLineChartData.Series successfulSeries = (XDDFLineChartData.Series) lineChartData.addSeries(days, successful);
        successfulSeries.setTitle("Exitosos", null);
        successfulSeries.setSmooth(false);
        successfulSeries.setMarkerStyle(MarkerStyle.CIRCLE);

        XDDFLineChartData.Series failedSeries = (XDDFLineChartData.Series) lineChartData.addSeries(days, failed);
        failedSeries.setTitle("Fallidos", null);
        failedSeries.setSmooth(false);
        failedSeries.setMarkerStyle(MarkerStyle.CIRCLE);

        chart.plot(lineChartData);
        XDDFChartLegend legend = chart.getOrAddLegend();
        legend.setPosition(LegendPosition.TOP_RIGHT);
    }

    private void buildTopCareersSheet(XSSFWorkbook workbook, WorkbookStyles styles, MonitoringReportExportData data) {
        XSSFSheet sheet = workbook.createSheet("Top Carreras");
        configureStandardColumns(sheet, 8, 24);

        int row = 0;
        row = writeMergedRow(sheet, row, 0, 7, "Top Carreras", styles.titleStyle());
        row = writeMergedRow(sheet, row, 0, 7, "Ranking de carreras por accesos", styles.subtitleStyle());

        int tableHeaderRow = 19;
        Row header = sheet.createRow(tableHeaderRow);
        createTextCell(header, 0, "Posición", styles.tableHeaderStyle());
        createTextCell(header, 1, "Código", styles.tableHeaderStyle());
        createTextCell(header, 2, "Carrera", styles.tableHeaderStyle());
        createTextCell(header, 3, "Exitosos", styles.tableHeaderStyle());
        createTextCell(header, 4, "Fallidos", styles.tableHeaderStyle());
        createTextCell(header, 5, "Total", styles.tableHeaderStyle());
        createTextCell(header, 6, "Métrica", styles.tableHeaderStyle());

        int currentRow = tableHeaderRow + 1;
        for (TopCareerExportRow career : data.topCareers()) {
            Row dataRow = sheet.createRow(currentRow++);
            createNumericCell(dataRow, 0, career.position(), styles.numberStyle());
            createTextCell(dataRow, 1, career.careerCode(), styles.valueStyle());
            createTextCell(dataRow, 2, career.careerName(), styles.valueStyle());
            createNumericCell(dataRow, 3, career.successfulAccesses(), styles.numberStyle());
            createNumericCell(dataRow, 4, career.failedAccesses(), styles.numberStyle());
            createNumericCell(dataRow, 5, career.totalAccesses(), styles.numberStyle());
            createTextCell(dataRow, 6, career.metric(), styles.valueStyle());
        }

        if (currentRow == tableHeaderRow + 1) {
            Row emptyRow = sheet.createRow(currentRow++);
            createTextCell(emptyRow, 0, "Sin datos para carreras en el contexto seleccionado", styles.valueStyle());
            mergeCells(sheet, emptyRow.getRowNum(), emptyRow.getRowNum(), 0, 6);
        }

        sheet.setAutoFilter(new CellRangeAddress(tableHeaderRow, currentRow - 1, 0, 6));

        if (!data.topCareers().isEmpty()) {
            int chartLastRow = Math.min(currentRow - 1, tableHeaderRow + 12);
            addTopCareersBarChart(sheet, tableHeaderRow + 1, chartLastRow);
        }
    }

    private void addTopCareersBarChart(XSSFSheet sheet, int firstDataRow, int lastDataRow) {
        XSSFDrawing drawing = sheet.createDrawingPatriarch();
        XSSFClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0, 0, 3, 8, 17);
        XSSFChart chart = drawing.createChart(anchor);

        chart.setTitleText("Top carreras por accesos");
        chart.setTitleOverlay(false);

        XDDFCategoryAxis bottomAxis = chart.createCategoryAxis(AxisPosition.BOTTOM);
        XDDFValueAxis leftAxis = chart.createValueAxis(AxisPosition.LEFT);
        leftAxis.setCrosses(AxisCrosses.AUTO_ZERO);

        XDDFDataSource<String> careers = XDDFDataSourcesFactory.fromStringCellRange(
                sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, 2, 2)
        );
        XDDFNumericalDataSource<Double> totals = XDDFDataSourcesFactory.fromNumericCellRange(
                sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, 5, 5)
        );

        XDDFBarChartData barChartData = (XDDFBarChartData) chart.createData(ChartTypes.BAR, bottomAxis, leftAxis);
        XDDFBarChartData.Series series = (XDDFBarChartData.Series) barChartData.addSeries(careers, totals);
        series.setTitle("Accesos totales", null);
        barChartData.setBarDirection(BarDirection.COL);

        chart.plot(barChartData);
        XDDFChartLegend legend = chart.getOrAddLegend();
        legend.setPosition(LegendPosition.TOP_RIGHT);
    }

    private void buildTopUsersSheet(XSSFWorkbook workbook, WorkbookStyles styles, MonitoringReportExportData data) {
        XSSFSheet sheet = workbook.createSheet("Top Usuarios");
        configureStandardColumns(sheet, 9, 24);

        int row = 0;
        row = writeMergedRow(sheet, row, 0, 8, "Top Usuarios", styles.titleStyle());
        row = writeMergedRow(sheet, row, 0, 8, "Ranking completo de estudiantes", styles.subtitleStyle());

        int headerRowIndex = 2;
        Row header = sheet.createRow(headerRowIndex);
        createTextCell(header, 0, "Posición", styles.tableHeaderStyle());
        createTextCell(header, 1, "ID Estudiante", styles.tableHeaderStyle());
        createTextCell(header, 2, "Nombre", styles.tableHeaderStyle());
        createTextCell(header, 3, "Matrícula", styles.tableHeaderStyle());
        createTextCell(header, 4, "Exitosos", styles.tableHeaderStyle());
        createTextCell(header, 5, "Fallidos", styles.tableHeaderStyle());
        createTextCell(header, 6, "Total", styles.tableHeaderStyle());
        createTextCell(header, 7, "% Éxito", styles.tableHeaderStyle());

        int currentRow = headerRowIndex + 1;
        for (TopUserExportRow user : data.topUsers()) {
            Row dataRow = sheet.createRow(currentRow++);
            createNumericCell(dataRow, 0, user.position(), styles.numberStyle());
            createTextCell(dataRow, 1, user.studentId(), styles.valueStyle());
            createTextCell(dataRow, 2, user.studentName(), styles.valueStyle());
            createTextCell(dataRow, 3, user.enrollmentId(), styles.valueStyle());
            createNumericCell(dataRow, 4, user.successfulAccesses(), styles.numberStyle());
            createNumericCell(dataRow, 5, user.failedAccesses(), styles.numberStyle());
            createNumericCell(dataRow, 6, user.totalAccesses(), styles.numberStyle());
            createNumericCell(dataRow, 7, user.successRate(), styles.percentValueStyle());
        }

        if (currentRow == headerRowIndex + 1) {
            Row emptyRow = sheet.createRow(currentRow++);
            createTextCell(emptyRow, 0, "Sin datos de usuarios para el contexto seleccionado", styles.valueStyle());
            mergeCells(sheet, emptyRow.getRowNum(), emptyRow.getRowNum(), 0, 7);
        }

        sheet.setAutoFilter(new CellRangeAddress(headerRowIndex, currentRow - 1, 0, 7));
        sheet.createFreezePane(0, headerRowIndex + 1);
    }

    private void buildRawDataSheet(XSSFWorkbook workbook, WorkbookStyles styles, MonitoringReportExportData data) {
        XSSFSheet sheet = workbook.createSheet("Datos exportados");
        configureRawDataColumns(sheet);

        int headerRowIndex = 0;
        Row header = sheet.createRow(headerRowIndex);
        String[] columns = {
                "Fuente",
                "Posición",
                "Día",
                "Código carrera",
                "Carrera",
                "ID estudiante",
                "Estudiante",
                "Matrícula",
                "Exitosos",
                "Fallidos",
                "Total",
                "% Éxito",
                "Resultado",
                "Ocurrió en",
                "Latencia (ms)",
                "Canal",
                "Request ID",
                "Provider Error",
                "Error Code"
        };
        for (int i = 0; i < columns.length; i++) {
            createTextCell(header, i, columns[i], styles.tableHeaderStyle());
        }

        int currentRow = headerRowIndex + 1;
        for (RawExportRow raw : data.rawRows()) {
            Row row = sheet.createRow(currentRow++);
            createTextCell(row, 0, raw.source(), styles.valueStyle());
            if (raw.position() != null) {
                createNumericCell(row, 1, raw.position(), styles.numberStyle());
            } else {
                createTextCell(row, 1, "", styles.valueStyle());
            }
            createTextCell(row, 2, raw.day(), styles.valueStyle());
            createTextCell(row, 3, raw.careerCode(), styles.valueStyle());
            createTextCell(row, 4, raw.careerName(), styles.valueStyle());
            createTextCell(row, 5, raw.studentId(), styles.valueStyle());
            createTextCell(row, 6, raw.studentName(), styles.valueStyle());
            createTextCell(row, 7, raw.enrollmentId(), styles.valueStyle());
            if (raw.successfulAccesses() != null) {
                createNumericCell(row, 8, raw.successfulAccesses(), styles.numberStyle());
            } else {
                createTextCell(row, 8, "", styles.valueStyle());
            }
            if (raw.failedAccesses() != null) {
                createNumericCell(row, 9, raw.failedAccesses(), styles.numberStyle());
            } else {
                createTextCell(row, 9, "", styles.valueStyle());
            }
            if (raw.totalAccesses() != null) {
                createNumericCell(row, 10, raw.totalAccesses(), styles.numberStyle());
            } else {
                createTextCell(row, 10, "", styles.valueStyle());
            }
            if (raw.successRate() != null) {
                createNumericCell(row, 11, raw.successRate(), styles.percentValueStyle());
            } else {
                createTextCell(row, 11, "", styles.valueStyle());
            }
            createTextCell(row, 12, raw.result(), styles.valueStyle());
            if (raw.occurredAt() != null) {
                createTextCell(row, 13, DISPLAY_TS_FORMAT.format(raw.occurredAt()), styles.valueStyle());
            } else {
                createTextCell(row, 13, "", styles.valueStyle());
            }
            if (raw.latencyMs() != null) {
                createNumericCell(row, 14, raw.latencyMs(), styles.numberStyle());
            } else {
                createTextCell(row, 14, "", styles.valueStyle());
            }
            createTextCell(row, 15, raw.channelName(), styles.valueStyle());
            createTextCell(row, 16, raw.requestId(), styles.valueStyle());
            createTextCell(row, 17, raw.providerErrorCode(), styles.valueStyle());
            createTextCell(row, 18, raw.errorCode(), styles.valueStyle());
        }

        if (currentRow == 1) {
            Row emptyRow = sheet.createRow(currentRow);
            createTextCell(emptyRow, 0, "Sin datos disponibles para exportar", styles.valueStyle());
            mergeCells(sheet, emptyRow.getRowNum(), emptyRow.getRowNum(), 0, columns.length - 1);
            currentRow++;
        }

        sheet.setAutoFilter(new CellRangeAddress(0, currentRow - 1, 0, columns.length - 1));
        sheet.createFreezePane(0, 1);
    }

    private void configureStandardColumns(Sheet sheet, int columns, int widthChars) {
        for (int i = 0; i < columns; i++) {
            sheet.setColumnWidth(i, widthChars * 256);
        }
    }

    private void configureRawDataColumns(Sheet sheet) {
        int[] widths = {20, 10, 14, 14, 28, 38, 32, 18, 12, 12, 12, 12, 14, 24, 14, 16, 26, 18, 18};
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    private int writeMergedRow(
            Sheet sheet,
            int rowIndex,
            int startCol,
            int endCol,
            String value,
            CellStyle style
    ) {
        Row row = sheet.createRow(rowIndex);
        createTextCell(row, startCol, value, style);
        if (endCol > startCol) {
            mergeCells(sheet, rowIndex, rowIndex, startCol, endCol);
        }
        return rowIndex + 1;
    }

    private void mergeCells(Sheet sheet, int firstRow, int lastRow, int firstCol, int lastCol) {
        if (lastCol <= firstCol && lastRow <= firstRow) {
            return;
        }
        sheet.addMergedRegion(new CellRangeAddress(firstRow, lastRow, firstCol, lastCol));
    }

    private void createTextCell(Row row, int columnIndex, String value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        cell.setCellValue(sanitizeForSpreadsheet(value));
        cell.setCellStyle(style);
    }

    private void createNumericCell(Row row, int columnIndex, Number value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        cell.setCellValue(value == null ? 0d : value.doubleValue());
        cell.setCellStyle(style);
    }

    private String sanitizeForSpreadsheet(String value) {
        if (value == null || value.isEmpty()) {
            return value == null ? "" : value;
        }
        char first = value.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
            return "'" + value;
        }
        return value;
    }

    private byte[] exportCsv(DashboardAnalysisResponse analysisResponse) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             Writer writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8)) {
            writer.write('\uFEFF');

            writeCsvSingleValueRow(writer, "Dashboard Analysis Export");
            writeCsvLine(writer, "layoutType", analysisResponse.layoutType().name());
            writeCsvLine(writer, "generatedAtUtc", DISPLAY_TS_FORMAT.format(Instant.now()));
            writeCsvLine(writer, "widgetCount", String.valueOf(analysisResponse.widgets().size()));
            writer.write("\r\n");

            writeCsvKeyValueSection(
                    writer,
                    "Filter Summary",
                    flattenObject(objectMapper.valueToTree(analysisResponse.summary()))
            );

            for (DashboardWidgetResponse widget : analysisResponse.widgets()) {
                writeCsvWidgetSection(writer, widget);
            }
            writer.flush();
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new RuntimeException("No fue posible generar el export CSV de dashboard analysis.", ex);
        }
    }

    private void writeCsvWidgetSection(Writer writer, DashboardWidgetResponse widget) throws IOException {
        WidgetExportContent content = describeWidget(widget.data());
        writeCsvSingleValueRow(writer, "Widget: " + widget.title());

        LinkedHashMap<String, String> widgetMetadata = new LinkedHashMap<>();
        widgetMetadata.put("widgetId", widget.widgetId());
        widgetMetadata.put("widgetType", widget.type().name());
        widgetMetadata.put("order", String.valueOf(widget.order()));
        widgetMetadata.putAll(content.metadata());
        writeCsvLine(writer, "field", "value");
        for (Map.Entry<String, String> entry : widgetMetadata.entrySet()) {
            writeCsvLine(writer, entry.getKey(), entry.getValue());
        }

        for (WidgetExportTable table : content.tables()) {
            writer.write("\r\n");
            writeCsvSingleValueRow(writer, "Table: " + table.name());
            if (table.headers().isEmpty()) {
                writeCsvLine(writer, "value");
                writeCsvLine(writer, "Sin registros");
                continue;
            }
            writeCsvLine(writer, table.headers().toArray(String[]::new));
            for (Map<String, String> row : table.rows()) {
                List<String> values = new ArrayList<>(table.headers().size());
                for (String header : table.headers()) {
                    values.add(row.getOrDefault(header, ""));
                }
                writeCsvLine(writer, values.toArray(String[]::new));
            }
        }
        writer.write("\r\n");
    }

    private WidgetExportContent describeWidget(Object widgetData) {
        JsonNode root = objectMapper.valueToTree(widgetData);
        LinkedHashMap<String, String> metadata = new LinkedHashMap<>();
        List<WidgetExportTable> tables = new ArrayList<>();

        if (root == null || root.isNull()) {
            return new WidgetExportContent(metadata, tables);
        }

        if (root.isObject()) {
            root.properties().forEach(entry -> {
                JsonNode value = entry.getValue();
                if (value.isArray()) {
                    tables.add(buildTable(entry.getKey(), value));
                } else {
                    flattenObject(entry.getKey(), value, metadata);
                }
            });
            return new WidgetExportContent(metadata, tables);
        }

        if (root.isArray()) {
            tables.add(buildTable("items", root));
            return new WidgetExportContent(metadata, tables);
        }

        metadata.put("value", stringify(root));
        return new WidgetExportContent(metadata, tables);
    }

    private WidgetExportTable buildTable(String name, JsonNode arrayNode) {
        LinkedHashSet<String> headers = new LinkedHashSet<>();
        List<Map<String, String>> rows = new ArrayList<>();

        for (JsonNode item : arrayNode) {
            LinkedHashMap<String, String> row = new LinkedHashMap<>();
            if (item.isObject()) {
                item.properties().forEach(entry -> flattenObject(entry.getKey(), entry.getValue(), row));
            } else if (item.isArray()) {
                row.put("value", item.toString());
            } else {
                row.put("value", stringify(item));
            }
            headers.addAll(row.keySet());
            rows.add(row);
        }

        return new WidgetExportTable(name, new ArrayList<>(headers), rows);
    }

    private LinkedHashMap<String, String> flattenObject(JsonNode node) {
        LinkedHashMap<String, String> values = new LinkedHashMap<>();
        if (node == null || node.isNull()) {
            return values;
        }
        if (!node.isObject()) {
            values.put("value", stringify(node));
            return values;
        }
        node.properties().forEach(entry -> {
            if (!entry.getValue().isArray()) {
                flattenObject(entry.getKey(), entry.getValue(), values);
            }
        });
        return values;
    }

    private void flattenObject(String prefix, JsonNode node, LinkedHashMap<String, String> target) {
        if (node == null || node.isNull()) {
            target.put(prefix, "");
            return;
        }
        if (node.isValueNode()) {
            target.put(prefix, stringify(node));
            return;
        }
        if (node.isObject()) {
            node.properties().forEach(entry -> flattenObject(prefix + "." + entry.getKey(), entry.getValue(), target));
            return;
        }
        target.put(prefix, node.toString());
    }

    private String stringify(JsonNode node) {
        if (node == null || node.isNull()) {
            return "";
        }
        if (node.isTextual()) {
            return node.textValue();
        }
        return node.asText();
    }

    private void writeCsvKeyValueSection(
            Writer writer,
            String title,
            LinkedHashMap<String, String> values
    ) throws IOException {
        writeCsvSingleValueRow(writer, title);
        writeCsvLine(writer, "field", "value");
        for (Map.Entry<String, String> entry : values.entrySet()) {
            writeCsvLine(writer, entry.getKey(), entry.getValue());
        }
        writer.write("\r\n");
    }

    private void writeCsvSingleValueRow(Writer writer, String value) throws IOException {
        writeCsvLine(writer, value);
    }

    private void writeCsvLine(Writer writer, String... values) throws IOException {
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                writer.write(',');
            }
            writer.write(escapeCsv(values[i]));
        }
        writer.write("\r\n");
    }

    private String escapeCsv(String value) {
        String safe = value == null ? "" : value;
        if (!safe.isEmpty()) {
            char first = safe.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
                safe = "'" + safe;
            }
        }
        boolean needsQuotes = safe.contains(",") || safe.contains("\n") || safe.contains("\r") || safe.contains("\"");
        if (!needsQuotes) {
            return safe;
        }
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private String buildFilename(
            DashboardAnalysisRequest request,
            DashboardAnalysisResponse analysisResponse,
            DashboardExportFormat format
    ) {
        DashboardFilterSummary summary = analysisResponse.summary();
        boolean filtered = isFilteredRequest(request, summary);

        List<String> tokens = new ArrayList<>();
        tokens.add("monitoring");
        tokens.add("reports");
        tokens.add(filtered ? "filtrado" : "general");

        String descriptor = buildContextDescriptor(request);
        if (!descriptor.isBlank()) {
            tokens.add(descriptor);
        }

        tokens.add(FILENAME_DATE_FORMAT.format(LocalDate.now(ZoneOffset.UTC)));

        String base = normalizeFilenameToken(String.join("-", tokens));
        return base + "." + format.name().toLowerCase(Locale.ROOT);
    }

    private String buildContextDescriptor(DashboardAnalysisRequest request) {
        if (request.studentId() != null) {
            return "alumno-" + request.studentId().toString().substring(0, 8);
        }
        if (request.careerIds() != null && request.careerIds().size() == 1) {
            return "carrera-" + request.careerIds().get(0).toString().substring(0, 8);
        }
        if (request.careerIds() != null && request.careerIds().size() > 1) {
            return "carreras-" + request.careerIds().size();
        }
        return "";
    }

    private String normalizeFilenameToken(String raw) {
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^-|-$)", "");

        return normalized.isBlank() ? "monitoring-reports" : normalized;
    }

    public record ExportedDashboardAnalysisFile(
            String filename,
            String contentType,
            byte[] content
    ) {
    }

    private record WidgetExportContent(
            LinkedHashMap<String, String> metadata,
            List<WidgetExportTable> tables
    ) {
    }

    private record WidgetExportTable(
            String name,
            List<String> headers,
            List<Map<String, String>> rows
    ) {
    }

    private record ExportAnalysisSnapshot(
            DashboardAnalysisRequest request,
            DashboardAnalysisResponse analysisResponse,
            List<DashboardCareerStudentTableItemResponse> allCareerStudents,
            List<DashboardStudentActivityItemResponse> allStudentActivities
    ) {
    }

    private record MonitoringReportExportData(
            ReportContext context,
            SummaryExportData summary,
            List<TrendExportRow> trendRows,
            List<TopCareerExportRow> topCareers,
            List<TopUserExportRow> topUsers,
            List<RawExportRow> rawRows
    ) {
    }

    private record ReportContext(
            String exportKind,
            String generatedAtUtc,
            String analyzedRange,
            String windowSize,
            String layoutType,
            String scope,
            String mode,
            String accessResult,
            String rankingMode,
            Integer topN,
            String sortDirection,
            List<String> filters
    ) {
    }

    private record SummaryExportData(
            long totalStudents,
            long totalAccesses,
            long successfulAccesses,
            long failedAccesses
    ) {
        SummaryExportData withTotals(long students, long total, long successful, long failed) {
            return new SummaryExportData(students, total, successful, failed);
        }
    }

    private record TrendExportRow(
            String day,
            long total,
            long successful,
            long failed
    ) {
    }

    private record TopCareerExportRow(
            int position,
            String careerCode,
            String careerName,
            long successfulAccesses,
            long failedAccesses,
            long totalAccesses,
            String metric
    ) {
    }

    private record TopUserExportRow(
            int position,
            String studentId,
            String studentName,
            String enrollmentId,
            long successfulAccesses,
            long failedAccesses,
            long totalAccesses,
            double successRate
    ) {
    }

    private record RawExportRow(
            String source,
            Integer position,
            String day,
            String careerCode,
            String careerName,
            String studentId,
            String studentName,
            String enrollmentId,
            Long successfulAccesses,
            Long failedAccesses,
            Long totalAccesses,
            Double successRate,
            String result,
            Instant occurredAt,
            Long latencyMs,
            String channelName,
            String requestId,
            String providerErrorCode,
            String errorCode
    ) {
        static RawExportRow fromTrend(TrendExportRow row) {
            return new RawExportRow(
                    "TENDENCIA",
                    null,
                    row.day(),
                    "",
                    "",
                    "",
                    "",
                    "",
                    row.successful(),
                    row.failed(),
                    row.total(),
                    null,
                    "",
                    null,
                    null,
                    "",
                    "",
                    "",
                    ""
            );
        }

        static RawExportRow fromCareer(TopCareerExportRow row) {
            return new RawExportRow(
                    "TOP_CARRERAS",
                    row.position(),
                    "",
                    row.careerCode(),
                    row.careerName(),
                    "",
                    "",
                    "",
                    row.successfulAccesses(),
                    row.failedAccesses(),
                    row.totalAccesses(),
                    null,
                    "",
                    null,
                    null,
                    "",
                    "",
                    "",
                    ""
            );
        }

        static RawExportRow fromUser(TopUserExportRow row) {
            return new RawExportRow(
                    "TOP_USUARIOS",
                    row.position(),
                    "",
                    "",
                    "",
                    row.studentId(),
                    row.studentName(),
                    row.enrollmentId(),
                    row.successfulAccesses(),
                    row.failedAccesses(),
                    row.totalAccesses(),
                    row.successRate(),
                    "",
                    null,
                    null,
                    "",
                    "",
                    "",
                    ""
            );
        }

        static RawExportRow fromCareerStudent(DashboardCareerStudentTableItemResponse row) {
            return new RawExportRow(
                    "CAREER_STUDENT_TABLE",
                    null,
                    "",
                    "",
                    "",
                    row.studentId() == null ? "" : row.studentId().toString(),
                    row.studentName(),
                    row.enrollmentId(),
                    row.successfulAccesses(),
                    row.failedAccesses(),
                    row.totalAccesses(),
                    row.successRate(),
                    "",
                    null,
                    null,
                    "",
                    "",
                    "",
                    ""
            );
        }

        static RawExportRow fromStudentActivity(DashboardStudentActivityItemResponse row) {
            long successful = "SUCCESS".equalsIgnoreCase(row.result()) ? 1L : 0L;
            long failed = successful == 1L ? 0L : 1L;
            return new RawExportRow(
                    "STUDENT_ACTIVITY",
                    null,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    successful,
                    failed,
                    1L,
                    successful == 1L ? 100.0 : 0.0,
                    row.result(),
                    row.occurredAt(),
                    row.latencyMs(),
                    row.channelName(),
                    row.requestId(),
                    row.providerErrorCode(),
                    row.errorCode()
            );
        }
    }

    private static final class MutableCareerAggregate {
        private final String careerCode;
        private final String careerName;
        private long successful;
        private long failed;
        private long total;
        private String metric;

        private MutableCareerAggregate(String careerCode, String careerName) {
            this.careerCode = careerCode;
            this.careerName = careerName;
            this.metric = "TOTAL";
        }
    }

    private enum KpiVariant {
        PRIMARY,
        INFO,
        SUCCESS,
        DANGER
    }

    private static final class WorkbookStyles {
        private final XSSFWorkbook workbook;
        private final XSSFCellStyle titleStyle;
        private final XSSFCellStyle subtitleStyle;
        private final XSSFCellStyle sectionHeaderStyle;
        private final XSSFCellStyle labelStyle;
        private final XSSFCellStyle valueStyle;
        private final XSSFCellStyle tableHeaderStyle;
        private final XSSFCellStyle numberStyle;
        private final XSSFCellStyle percentValueStyle;

        private final Map<KpiVariant, XSSFCellStyle> kpiContainerStyles = new LinkedHashMap<>();
        private final Map<KpiVariant, XSSFCellStyle> kpiLabelStyles = new LinkedHashMap<>();
        private final Map<KpiVariant, XSSFCellStyle> kpiValueStyles = new LinkedHashMap<>();

        private WorkbookStyles(XSSFWorkbook workbook) {
            this.workbook = workbook;
            this.titleStyle = createTitleStyle();
            this.subtitleStyle = createSubtitleStyle();
            this.sectionHeaderStyle = createSectionHeaderStyle();
            this.labelStyle = createLabelStyle();
            this.valueStyle = createValueStyle();
            this.tableHeaderStyle = createTableHeaderStyle();
            this.numberStyle = createNumberStyle();
            this.percentValueStyle = createPercentStyle();
            initializeKpiStyles();
        }

        private XSSFCellStyle titleStyle() {
            return titleStyle;
        }

        private XSSFCellStyle subtitleStyle() {
            return subtitleStyle;
        }

        private XSSFCellStyle sectionHeaderStyle() {
            return sectionHeaderStyle;
        }

        private XSSFCellStyle labelStyle() {
            return labelStyle;
        }

        private XSSFCellStyle valueStyle() {
            return valueStyle;
        }

        private XSSFCellStyle tableHeaderStyle() {
            return tableHeaderStyle;
        }

        private XSSFCellStyle numberStyle() {
            return numberStyle;
        }

        private XSSFCellStyle percentValueStyle() {
            return percentValueStyle;
        }

        private CellStyle kpiContainerStyle(KpiVariant variant) {
            return kpiContainerStyles.get(variant);
        }

        private CellStyle kpiLabelStyle(KpiVariant variant) {
            return kpiLabelStyles.get(variant);
        }

        private CellStyle kpiValueStyle(KpiVariant variant) {
            return kpiValueStyles.get(variant);
        }

        private void initializeKpiStyles() {
            registerKpiVariant(KpiVariant.PRIMARY, "#EFF6FF", "#BFDBFE", "#1D4ED8");
            registerKpiVariant(KpiVariant.INFO, "#ECFEFF", "#A5F3FC", "#0F766E");
            registerKpiVariant(KpiVariant.SUCCESS, "#ECFDF5", "#86EFAC", "#047857");
            registerKpiVariant(KpiVariant.DANGER, "#FEF2F2", "#FECACA", "#B91C1C");
        }

        private void registerKpiVariant(KpiVariant variant, String background, String border, String textColor) {
            XSSFCellStyle container = createBaseStyle();
            container.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            container.setFillForegroundColor(toColor(background));
            container.setBorderTop(BorderStyle.THIN);
            container.setBorderBottom(BorderStyle.THIN);
            container.setBorderLeft(BorderStyle.THIN);
            container.setBorderRight(BorderStyle.THIN);
            container.setTopBorderColor(toColor(border));
            container.setBottomBorderColor(toColor(border));
            container.setLeftBorderColor(toColor(border));
            container.setRightBorderColor(toColor(border));
            kpiContainerStyles.put(variant, container);

            XSSFCellStyle label = clone(container);
            XSSFFont labelFont = workbook.createFont();
            labelFont.setBold(true);
            labelFont.setFontHeightInPoints((short) 10);
            labelFont.setColor(toColor(textColor));
            labelFont.setFontName("Calibri");
            label.setFont(labelFont);
            label.setAlignment(HorizontalAlignment.LEFT);
            kpiLabelStyles.put(variant, label);

            XSSFCellStyle value = clone(container);
            XSSFFont valueFont = workbook.createFont();
            valueFont.setBold(true);
            valueFont.setFontHeightInPoints((short) 20);
            valueFont.setColor(toColor(textColor));
            valueFont.setFontName("Calibri");
            value.setFont(valueFont);
            value.setAlignment(HorizontalAlignment.CENTER);
            value.setVerticalAlignment(VerticalAlignment.CENTER);
            value.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
            kpiValueStyles.put(variant, value);
        }

        private XSSFCellStyle createTitleStyle() {
            XSSFCellStyle style = createBaseStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 20);
            font.setFontName("Calibri");
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.LEFT);
            return style;
        }

        private XSSFCellStyle createSubtitleStyle() {
            XSSFCellStyle style = createBaseStyle();
            Font font = workbook.createFont();
            font.setItalic(true);
            font.setFontHeightInPoints((short) 11);
            font.setColor(IndexedColors.GREY_80_PERCENT.getIndex());
            font.setFontName("Calibri");
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.LEFT);
            return style;
        }

        private XSSFCellStyle createSectionHeaderStyle() {
            XSSFCellStyle style = createBaseStyle();
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            style.setFillForegroundColor(toColor("#E2E8F0"));
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            style.setBottomBorderColor(toColor("#CBD5E1"));
            style.setTopBorderColor(toColor("#CBD5E1"));
            style.setLeftBorderColor(toColor("#CBD5E1"));
            style.setRightBorderColor(toColor("#CBD5E1"));

            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 11);
            font.setFontName("Calibri");
            style.setFont(font);
            return style;
        }

        private XSSFCellStyle createLabelStyle() {
            XSSFCellStyle style = createBaseStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 10);
            font.setFontName("Calibri");
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.LEFT);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBottomBorderColor(toColor("#E2E8F0"));
            return style;
        }

        private XSSFCellStyle createValueStyle() {
            XSSFCellStyle style = createBaseStyle();
            Font font = workbook.createFont();
            font.setFontHeightInPoints((short) 10);
            font.setFontName("Calibri");
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.LEFT);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBottomBorderColor(toColor("#E2E8F0"));
            return style;
        }

        private XSSFCellStyle createTableHeaderStyle() {
            XSSFCellStyle style = createBaseStyle();
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            style.setFillForegroundColor(toColor("#DCEBFF"));
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            style.setTopBorderColor(toColor("#93C5FD"));
            style.setBottomBorderColor(toColor("#93C5FD"));
            style.setLeftBorderColor(toColor("#93C5FD"));
            style.setRightBorderColor(toColor("#93C5FD"));
            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 10);
            font.setFontName("Calibri");
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.CENTER);
            return style;
        }

        private XSSFCellStyle createNumberStyle() {
            XSSFCellStyle style = createValueStyle();
            style.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
            style.setAlignment(HorizontalAlignment.RIGHT);
            return style;
        }

        private XSSFCellStyle createPercentStyle() {
            XSSFCellStyle style = createValueStyle();
            style.setDataFormat(workbook.createDataFormat().getFormat("0.00\"%\""));
            style.setAlignment(HorizontalAlignment.RIGHT);
            return style;
        }

        private XSSFCellStyle createBaseStyle() {
            XSSFCellStyle style = workbook.createCellStyle();
            style.setVerticalAlignment(VerticalAlignment.CENTER);
            style.setWrapText(true);
            return style;
        }

        private XSSFCellStyle clone(XSSFCellStyle source) {
            XSSFCellStyle style = workbook.createCellStyle();
            style.cloneStyleFrom(source);
            return style;
        }

        private XSSFColor toColor(String hex) {
            return colorFromHex(hex);
        }
    }

    private static XSSFColor colorFromHex(String hex) {
        String cleaned = hex.startsWith("#") ? hex.substring(1) : hex;
        if (cleaned.length() != 6) {
            cleaned = "000000";
        }
        byte[] rgb = new byte[]{
                (byte) Integer.parseInt(cleaned.substring(0, 2), 16),
                (byte) Integer.parseInt(cleaned.substring(2, 4), 16),
                (byte) Integer.parseInt(cleaned.substring(4, 6), 16)
        };
        return new XSSFColor(rgb, new DefaultIndexedColorMap());
    }
}
