package mx.edu.utez.server.modules.reports.service;

import mx.edu.utez.server.modules.dashboard.repository.DashboardMetricsRepository;
import mx.edu.utez.server.modules.reports.repository.ReportMetricsRepository;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportDataCollector {

    private final DashboardMetricsRepository dashboardMetrics;
    private final ReportMetricsRepository reportMetrics;

    public ReportDataCollector(
            DashboardMetricsRepository dashboardMetrics,
            ReportMetricsRepository reportMetrics
    ) {
        this.dashboardMetrics = dashboardMetrics;
        this.reportMetrics = reportMetrics;
    }

    @Transactional(readOnly = true)
    public ReportData collect(
            Instant dateFrom, Instant dateTo,
            AccessResult resultFilter,
            String career, StudentStatus studentStatus
    ) {
        long successful = dashboardMetrics.countSuccessfulAccesses(dateFrom, dateTo, career, studentStatus);
        long failed = dashboardMetrics.countFailedAccesses(dateFrom, dateTo, career, studentStatus);
        long totalAccesses = successful + failed;
        long uniqueStudents = dashboardMetrics.countUniqueStudentsWithSuccessfulAccess(
                dateFrom, dateTo, career, studentStatus);

        double successRate = totalAccesses > 0
                ? BigDecimal.valueOf(successful).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totalAccesses), 2, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        // Trend points
        List<DashboardMetricsRepository.DailyResultCountProjection> dailyRows =
                dashboardMetrics.findDailyAccessCounts(dateFrom, dateTo, career, studentStatus, resultFilter);

        Map<LocalDate, long[]> byDay = new HashMap<>();
        LocalDate fromDay = dateFrom.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate toDay = dateTo.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate cursor = fromDay;
        while (!cursor.isAfter(toDay)) {
            byDay.put(cursor, new long[]{0, 0});
            cursor = cursor.plusDays(1);
        }
        for (var row : dailyRows) {
            LocalDate day = row.getDay().toLocalDate();
            long[] counts = byDay.get(day);
            if (counts != null) {
                if (row.getResult() == AccessResult.SUCCESS) {
                    counts[0] += row.getTotal();
                } else {
                    counts[1] += row.getTotal();
                }
            }
        }
        List<TrendPoint> trendPoints = new ArrayList<>();
        cursor = fromDay;
        while (!cursor.isAfter(toDay)) {
            long[] counts = byDay.getOrDefault(cursor, new long[]{0, 0});
            trendPoints.add(new TrendPoint(cursor.toString(), counts[0], counts[1]));
            cursor = cursor.plusDays(1);
        }

        // Top students
        List<TopStudentItem> topStudents = dashboardMetrics.findTopStudentsDesc(
                        dateFrom, dateTo, career, studentStatus, PageRequest.of(0, 10))
                .map(p -> new TopStudentItem(p.getEnrollmentId(), p.getName(), p.getCareer(), p.getSuccessfulAccesses()))
                .getContent();

        // Top careers
        List<CareerItem> topCareers = reportMetrics.findTopCareers(
                        dateFrom, dateTo, resultFilter, career, studentStatus, PageRequest.of(0, 10))
                .stream()
                .map(p -> new CareerItem(p.getCareer(), p.getTotal()))
                .toList();

        // Error breakdown
        List<ErrorBreakdownItem> errorBreakdown = reportMetrics.findErrorBreakdown(
                        dateFrom, dateTo, career, studentStatus)
                .stream()
                .map(p -> new ErrorBreakdownItem(p.getResult().name(), p.getTotal()))
                .toList();

        // Rendering hints
        boolean showPie = successful > 0 && failed > 0 && resultFilter == null;
        boolean showTrend = trendPoints.stream().anyMatch(tp -> tp.successful() > 0 || tp.failed() > 0)
                && trendPoints.size() >= 3;
        boolean showTopStudents = topStudents.size() > 1;
        boolean showTopCareers = topCareers.size() > 1;
        boolean showErrorBreakdown = failed > 0 && !errorBreakdown.isEmpty()
                && (resultFilter == null || resultFilter != AccessResult.SUCCESS);

        Map<String, String> appliedFilters = new LinkedHashMap<>();
        appliedFilters.put("dateFrom", dateFrom.toString());
        appliedFilters.put("dateTo", dateTo.toString());
        if (resultFilter != null) appliedFilters.put("result", resultFilter.name());
        if (career != null) appliedFilters.put("career", career);
        if (studentStatus != null) appliedFilters.put("studentStatus", studentStatus.name());

        return new ReportData(
                "Reporte de Access Logs — SIGASe",
                appliedFilters,
                totalAccesses, successful, failed, successRate, uniqueStudents,
                trendPoints, topStudents, topCareers, errorBreakdown,
                showPie, showTrend, showTopStudents, showTopCareers, showErrorBreakdown
        );
    }

    public record ReportData(
            String title,
            Map<String, String> appliedFilters,
            long totalAccesses, long successfulAccesses, long failedAccesses,
            double successRate, long uniqueStudentsWithSuccess,
            List<TrendPoint> trendPoints,
            List<TopStudentItem> topStudents,
            List<CareerItem> topCareers,
            List<ErrorBreakdownItem> errorBreakdown,
            boolean showPieChart, boolean showTrendChart,
            boolean showTopStudentsChart, boolean showTopCareersChart,
            boolean showErrorBreakdownChart
    ) {}

    public record TrendPoint(String day, long successful, long failed) {}
    public record TopStudentItem(String enrollmentId, String name, String career, long accesses) {}
    public record CareerItem(String career, long total) {}
    public record ErrorBreakdownItem(String errorType, long total) {}
}
