package mx.edu.utez.server.modules.dashboard.service.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisExportRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardExportFormat;
import mx.edu.utez.server.modules.dashboard.dto.DashboardWidgetResponse;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class DashboardAnalysisExportService {

    private static final DateTimeFormatter FILE_TS_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DISPLAY_TS_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneOffset.UTC);
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

        DashboardAnalysisResponse analysisResponse = dashboardAnalysisService.analyze(request.analysis());
        byte[] content = switch (request.format()) {
            case CSV -> exportCsv(analysisResponse);
            case XLSX -> exportXlsx(analysisResponse);
        };

        return new ExportedDashboardAnalysisFile(
                buildFilename(analysisResponse, request.format()),
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

    private byte[] exportXlsx(DashboardAnalysisResponse analysisResponse) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             Workbook workbook = new XSSFWorkbook()) {
            writeSummarySheet(workbook, analysisResponse);
            for (DashboardWidgetResponse widget : analysisResponse.widgets()) {
                writeWidgetSheet(workbook, widget);
            }
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new RuntimeException("No fue posible generar el export XLSX de dashboard analysis.", ex);
        }
    }

    private void writeSummarySheet(Workbook workbook, DashboardAnalysisResponse analysisResponse) {
        Sheet sheet = workbook.createSheet("Resumen");
        CellStyle titleStyle = createTitleStyle(workbook);
        CellStyle subtitleStyle = createSubtitleStyle(workbook);
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle labelStyle = createLabelStyle(workbook);

        int rowIndex = 0;
        rowIndex = writeMergedTextRow(sheet, rowIndex, 4, "Dashboard Analysis Export", titleStyle);
        rowIndex = writeMergedTextRow(
                sheet,
                rowIndex,
                4,
                "Generado: " + DISPLAY_TS_FORMAT.format(Instant.now()) + " UTC",
                subtitleStyle
        );
        rowIndex = writeMergedTextRow(
                sheet,
                rowIndex,
                4,
                "Layout: " + analysisResponse.layoutType().name(),
                subtitleStyle
        );
        rowIndex++;

        Row summaryHeader = sheet.createRow(rowIndex++);
        createCell(summaryHeader, 0, "Resumen de filtros", headerStyle);
        createCell(summaryHeader, 1, "Valor", headerStyle);
        for (Map.Entry<String, String> entry : flattenObject(objectMapper.valueToTree(analysisResponse.summary())).entrySet()) {
            Row row = sheet.createRow(rowIndex++);
            createCell(row, 0, entry.getKey(), labelStyle);
            createCell(row, 1, entry.getValue(), null);
        }

        rowIndex++;
        Row widgetsHeader = sheet.createRow(rowIndex++);
        createCell(widgetsHeader, 0, "order", headerStyle);
        createCell(widgetsHeader, 1, "widgetId", headerStyle);
        createCell(widgetsHeader, 2, "widgetType", headerStyle);
        createCell(widgetsHeader, 3, "title", headerStyle);
        for (DashboardWidgetResponse widget : analysisResponse.widgets()) {
            Row row = sheet.createRow(rowIndex++);
            row.createCell(0).setCellValue(widget.order());
            createCell(row, 1, widget.widgetId(), null);
            createCell(row, 2, widget.type().name(), null);
            createCell(row, 3, widget.title(), null);
        }

        setColumnWidth(sheet, 0, 28);
        setColumnWidth(sheet, 1, 22);
        setColumnWidth(sheet, 2, 22);
        setColumnWidth(sheet, 3, 36);
    }

    private void writeWidgetSheet(Workbook workbook, DashboardWidgetResponse widget) {
        WidgetExportContent content = describeWidget(widget.data());
        Sheet sheet = workbook.createSheet(buildSheetName(widget.order(), widget.widgetId()));
        CellStyle titleStyle = createTitleStyle(workbook);
        CellStyle subtitleStyle = createSubtitleStyle(workbook);
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle labelStyle = createLabelStyle(workbook);

        int rowIndex = 0;
        rowIndex = writeMergedTextRow(sheet, rowIndex, 8, widget.title(), titleStyle);
        rowIndex = writeMergedTextRow(
                sheet,
                rowIndex,
                8,
                widget.widgetId() + " | " + widget.type().name(),
                subtitleStyle
        );
        rowIndex++;

        Row metaHeader = sheet.createRow(rowIndex++);
        createCell(metaHeader, 0, "Campo", headerStyle);
        createCell(metaHeader, 1, "Valor", headerStyle);

        LinkedHashMap<String, String> widgetMetadata = new LinkedHashMap<>();
        widgetMetadata.put("widgetId", widget.widgetId());
        widgetMetadata.put("widgetType", widget.type().name());
        widgetMetadata.put("order", String.valueOf(widget.order()));
        widgetMetadata.putAll(content.metadata());
        for (Map.Entry<String, String> entry : widgetMetadata.entrySet()) {
            Row row = sheet.createRow(rowIndex++);
            createCell(row, 0, entry.getKey(), labelStyle);
            createCell(row, 1, entry.getValue(), null);
        }

        for (WidgetExportTable table : content.tables()) {
            rowIndex++;
            rowIndex = writeMergedTextRow(sheet, rowIndex, Math.max(table.headers().size() - 1, 0), table.name(), subtitleStyle);
            if (table.headers().isEmpty()) {
                Row emptyHeader = sheet.createRow(rowIndex++);
                createCell(emptyHeader, 0, "value", headerStyle);
                Row emptyRow = sheet.createRow(rowIndex++);
                createCell(emptyRow, 0, "Sin registros", null);
                continue;
            }

            Row headerRow = sheet.createRow(rowIndex++);
            for (int i = 0; i < table.headers().size(); i++) {
                createCell(headerRow, i, table.headers().get(i), headerStyle);
            }
            int tableStartRow = rowIndex - 1;
            for (Map<String, String> tableRow : table.rows()) {
                Row row = sheet.createRow(rowIndex++);
                for (int i = 0; i < table.headers().size(); i++) {
                    createCell(row, i, tableRow.getOrDefault(table.headers().get(i), ""), null);
                }
            }
            if (!table.rows().isEmpty()) {
                sheet.setAutoFilter(new CellRangeAddress(
                        tableStartRow,
                        tableStartRow + table.rows().size(),
                        0,
                        table.headers().size() - 1
                ));
            }
        }

        for (int i = 0; i < 9; i++) {
            setColumnWidth(sheet, i, 24);
        }
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
                item.properties().forEach(entry -> {
                    flattenObject(entry.getKey(), entry.getValue(), row);
                });
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
            if (entry.getValue().isArray()) {
                return;
            }
            flattenObject(entry.getKey(), entry.getValue(), values);
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
            node.properties().forEach(entry -> {
                flattenObject(prefix + "." + entry.getKey(), entry.getValue(), target);
            });
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

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        style.setFont(font);
        return style;
    }

    private CellStyle createSubtitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setItalic(true);
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor((short) 22);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        return style;
    }

    private CellStyle createLabelStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private int writeMergedTextRow(Sheet sheet, int rowIndex, int lastColumn, String value, CellStyle style) {
        Row row = sheet.createRow(rowIndex);
        createCell(row, 0, value, style);
        if (lastColumn > 0) {
            sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, 0, lastColumn));
        }
        return rowIndex + 1;
    }

    private void createCell(Row row, int columnIndex, String value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        cell.setCellValue(sanitizeForSpreadsheet(value));
        if (style != null) {
            cell.setCellStyle(style);
        }
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

    private void setColumnWidth(Sheet sheet, int columnIndex, int widthInChars) {
        sheet.setColumnWidth(columnIndex, widthInChars * 256);
    }

    private String buildSheetName(int order, String widgetId) {
        String raw = String.format("%02d_%s", order, widgetId)
                .replaceAll("[\\\\/*?:\\[\\]]", "_");
        return raw.length() <= 31 ? raw : raw.substring(0, 31);
    }

    private String buildFilename(DashboardAnalysisResponse analysisResponse, DashboardExportFormat format) {
        return "dashboard-analysis_"
                + analysisResponse.layoutType().name().toLowerCase(Locale.ROOT)
                + "_"
                + FILE_TS_FORMAT.format(Instant.now())
                + "."
                + format.name().toLowerCase(Locale.ROOT);
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
}
