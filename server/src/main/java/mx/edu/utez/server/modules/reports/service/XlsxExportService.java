package mx.edu.utez.server.modules.reports.service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
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
import org.apache.poi.xssf.usermodel.DefaultIndexedColorMap;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.springframework.stereotype.Service;

@Service
public class XlsxExportService {

    private static final DateTimeFormatter DISPLAY_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC);

    static String sanitize(String value) {
        if (value == null) {
            return "";
        }
        if (value.isEmpty()) {
            return value;
        }
        char first = value.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
            return "'" + value;
        }
        return value;
    }

    static String formatInstantDisplay(Instant instant) {
        if (instant == null) {
            return "";
        }
        return DISPLAY_FORMATTER.format(instant);
    }

    static String formatInstantNow() {
        return DISPLAY_FORMATTER.format(Instant.now());
    }

    static ReportStyles createReportStyles(Workbook workbook) {
        return new ReportStyles(workbook);
    }

    // Legacy compatibility helpers
    static CellStyle createTitleStyle(Workbook wb) {
        return createReportStyles(wb).titleStyle();
    }

    static CellStyle createSubtitleStyle(Workbook wb) {
        return createReportStyles(wb).subtitleStyle();
    }

    static CellStyle createHeaderStyle(Workbook wb) {
        return createReportStyles(wb).tableHeaderStyle();
    }

    static CellStyle createDateStyle(Workbook wb) {
        return createReportStyles(wb).dateTimeStyle();
    }

    static CellStyle createActiveStyle(Workbook wb) {
        return createReportStyles(wb).activeStatusStyle();
    }

    static CellStyle createInactiveStyle(Workbook wb) {
        return createReportStyles(wb).inactiveStatusStyle();
    }

    static CellStyle createKpiLabelStyle(Workbook wb) {
        return createReportStyles(wb).labelStyle();
    }

    static void writeMergedRow(Sheet sheet, int rowIdx, int lastCol, String value, CellStyle style) {
        Row row = sheet.createRow(rowIdx);
        createTextCell(row, 0, value, style);
        if (lastCol > 0) {
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, lastCol));
        }
    }

    static void createTextCell(Row row, int columnIndex, String value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        cell.setCellValue(sanitize(value));
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    static void createNumericCell(Row row, int columnIndex, Number value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        cell.setCellValue(value == null ? 0d : value.doubleValue());
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    static int writeContextRow(
            Sheet sheet,
            int rowIndex,
            int valueLastColumn,
            String label,
            String value,
            CellStyle labelStyle,
            CellStyle valueStyle
    ) {
        Row row = sheet.createRow(rowIndex);
        createTextCell(row, 0, label, labelStyle);
        createTextCell(row, 1, value, valueStyle);
        if (valueLastColumn > 1) {
            sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, 1, valueLastColumn));
        }
        return rowIndex + 1;
    }

    static void paintCardRange(
            Sheet sheet,
            int startRow,
            int endRow,
            int startCol,
            int endCol,
            CellStyle style
    ) {
        for (int row = startRow; row <= endRow; row++) {
            Row currentRow = sheet.getRow(row);
            if (currentRow == null) {
                currentRow = sheet.createRow(row);
            }
            for (int col = startCol; col <= endCol; col++) {
                Cell cell = currentRow.getCell(col);
                if (cell == null) {
                    cell = currentRow.createCell(col);
                }
                cell.setCellStyle(style);
            }
        }
    }

    static void applyColumnWidths(Sheet sheet, int... widths) {
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    static void buildKpiCard(
            Sheet sheet,
            ReportStyles styles,
            int startRow,
            int startCol,
            int endCol,
            String label,
            Number value,
            KpiVariant variant
    ) {
        int endRow = startRow + 4;
        paintCardRange(sheet, startRow, endRow, startCol, endCol, styles.kpiContainerStyle(variant));

        sheet.addMergedRegion(new CellRangeAddress(startRow, startRow, startCol, endCol));
        sheet.addMergedRegion(new CellRangeAddress(startRow + 1, endRow, startCol, endCol));

        Row labelRow = sheet.getRow(startRow);
        createTextCell(labelRow, startCol, label, styles.kpiLabelStyle(variant));

        Row valueRow = sheet.getRow(startRow + 1);
        createNumericCell(valueRow, startCol, value, styles.kpiValueStyle(variant));
    }

    enum KpiVariant {
        PRIMARY,
        INFO,
        SUCCESS,
        DANGER
    }

    static final class ReportStyles {

        private final Workbook workbook;
        private final CellStyle titleStyle;
        private final CellStyle subtitleStyle;
        private final CellStyle sectionHeaderStyle;
        private final CellStyle labelStyle;
        private final CellStyle valueStyle;
        private final CellStyle tableHeaderStyle;
        private final CellStyle numberStyle;
        private final CellStyle percentStyle;
        private final CellStyle dateTimeStyle;
        private final CellStyle activeStatusStyle;
        private final CellStyle inactiveStatusStyle;

        private final Map<KpiVariant, CellStyle> kpiContainerStyles = new LinkedHashMap<>();
        private final Map<KpiVariant, CellStyle> kpiLabelStyles = new LinkedHashMap<>();
        private final Map<KpiVariant, CellStyle> kpiValueStyles = new LinkedHashMap<>();

        private ReportStyles(Workbook workbook) {
            this.workbook = workbook;
            this.titleStyle = createTitleStyleInternal();
            this.subtitleStyle = createSubtitleStyleInternal();
            this.sectionHeaderStyle = createSectionHeaderStyle();
            this.labelStyle = createLabelStyle();
            this.valueStyle = createValueStyle();
            this.tableHeaderStyle = createTableHeaderStyle();
            this.numberStyle = createNumberStyle();
            this.percentStyle = createPercentStyle();
            this.dateTimeStyle = createDateTimeStyle();
            this.activeStatusStyle = createStatusStyle("#ECFDF5", "#065F46");
            this.inactiveStatusStyle = createStatusStyle("#FEF2F2", "#991B1B");
            initializeKpiStyles();
        }

        CellStyle titleStyle() {
            return titleStyle;
        }

        CellStyle subtitleStyle() {
            return subtitleStyle;
        }

        CellStyle sectionHeaderStyle() {
            return sectionHeaderStyle;
        }

        CellStyle labelStyle() {
            return labelStyle;
        }

        CellStyle valueStyle() {
            return valueStyle;
        }

        CellStyle tableHeaderStyle() {
            return tableHeaderStyle;
        }

        CellStyle numberStyle() {
            return numberStyle;
        }

        CellStyle percentStyle() {
            return percentStyle;
        }

        CellStyle dateTimeStyle() {
            return dateTimeStyle;
        }

        CellStyle activeStatusStyle() {
            return activeStatusStyle;
        }

        CellStyle inactiveStatusStyle() {
            return inactiveStatusStyle;
        }

        CellStyle kpiContainerStyle(KpiVariant variant) {
            return kpiContainerStyles.get(variant);
        }

        CellStyle kpiLabelStyle(KpiVariant variant) {
            return kpiLabelStyles.get(variant);
        }

        CellStyle kpiValueStyle(KpiVariant variant) {
            return kpiValueStyles.get(variant);
        }

        private void initializeKpiStyles() {
            registerKpiVariant(KpiVariant.PRIMARY, "#EFF6FF", "#BFDBFE", "#1D4ED8");
            registerKpiVariant(KpiVariant.INFO, "#ECFEFF", "#A5F3FC", "#0F766E");
            registerKpiVariant(KpiVariant.SUCCESS, "#ECFDF5", "#86EFAC", "#047857");
            registerKpiVariant(KpiVariant.DANGER, "#FEF2F2", "#FECACA", "#B91C1C");
        }

        private void registerKpiVariant(KpiVariant variant, String bgHex, String borderHex, String textHex) {
            CellStyle container = createBaseStyle();
            container.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setFillColor(container, bgHex, IndexedColors.GREY_25_PERCENT.getIndex());
            container.setBorderTop(BorderStyle.THIN);
            container.setBorderBottom(BorderStyle.THIN);
            container.setBorderLeft(BorderStyle.THIN);
            container.setBorderRight(BorderStyle.THIN);
            setBorderColor(container, borderHex, IndexedColors.GREY_40_PERCENT.getIndex());
            kpiContainerStyles.put(variant, container);

            CellStyle label = workbook.createCellStyle();
            label.cloneStyleFrom(container);
            Font labelFont = workbook.createFont();
            labelFont.setBold(true);
            labelFont.setFontHeightInPoints((short) 10);
            labelFont.setFontName("Calibri");
            setFontColor(labelFont, textHex, IndexedColors.BLACK.getIndex());
            label.setFont(labelFont);
            label.setAlignment(HorizontalAlignment.LEFT);
            kpiLabelStyles.put(variant, label);

            CellStyle value = workbook.createCellStyle();
            value.cloneStyleFrom(container);
            Font valueFont = workbook.createFont();
            valueFont.setBold(true);
            valueFont.setFontHeightInPoints((short) 20);
            valueFont.setFontName("Calibri");
            setFontColor(valueFont, textHex, IndexedColors.BLACK.getIndex());
            value.setFont(valueFont);
            value.setAlignment(HorizontalAlignment.CENTER);
            value.setVerticalAlignment(VerticalAlignment.CENTER);
            value.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
            kpiValueStyles.put(variant, value);
        }

        private CellStyle createTitleStyleInternal() {
            CellStyle style = createBaseStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 18);
            font.setFontName("Calibri");
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.LEFT);
            return style;
        }

        private CellStyle createSubtitleStyleInternal() {
            CellStyle style = createBaseStyle();
            Font font = workbook.createFont();
            font.setItalic(true);
            font.setFontHeightInPoints((short) 10);
            font.setFontName("Calibri");
            font.setColor(IndexedColors.GREY_80_PERCENT.getIndex());
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.LEFT);
            return style;
        }

        private CellStyle createSectionHeaderStyle() {
            CellStyle style = createBaseStyle();
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setFillColor(style, "#E2E8F0", IndexedColors.GREY_25_PERCENT.getIndex());
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            setBorderColor(style, "#CBD5E1", IndexedColors.GREY_40_PERCENT.getIndex());

            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 11);
            font.setFontName("Calibri");
            style.setFont(font);
            return style;
        }

        private CellStyle createLabelStyle() {
            CellStyle style = createBaseStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 10);
            font.setFontName("Calibri");
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.LEFT);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            return style;
        }

        private CellStyle createValueStyle() {
            CellStyle style = createBaseStyle();
            Font font = workbook.createFont();
            font.setFontHeightInPoints((short) 10);
            font.setFontName("Calibri");
            style.setFont(font);
            style.setAlignment(HorizontalAlignment.LEFT);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            return style;
        }

        private CellStyle createTableHeaderStyle() {
            CellStyle style = createBaseStyle();
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setFillColor(style, "#DCEBFF", IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            setBorderColor(style, "#93C5FD", IndexedColors.CORNFLOWER_BLUE.getIndex());
            style.setAlignment(HorizontalAlignment.CENTER);

            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 10);
            font.setFontName("Calibri");
            style.setFont(font);
            return style;
        }

        private CellStyle createNumberStyle() {
            CellStyle style = workbook.createCellStyle();
            style.cloneStyleFrom(valueStyle);
            style.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
            style.setAlignment(HorizontalAlignment.RIGHT);
            return style;
        }

        private CellStyle createPercentStyle() {
            CellStyle style = workbook.createCellStyle();
            style.cloneStyleFrom(valueStyle);
            style.setDataFormat(workbook.createDataFormat().getFormat("0.00\"%\""));
            style.setAlignment(HorizontalAlignment.RIGHT);
            return style;
        }

        private CellStyle createDateTimeStyle() {
            CellStyle style = workbook.createCellStyle();
            style.cloneStyleFrom(valueStyle);
            style.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd hh:mm:ss"));
            return style;
        }

        private CellStyle createStatusStyle(String bgHex, String textHex) {
            CellStyle style = workbook.createCellStyle();
            style.cloneStyleFrom(valueStyle);
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setFillColor(style, bgHex, IndexedColors.GREY_25_PERCENT.getIndex());
            style.setAlignment(HorizontalAlignment.CENTER);

            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontName("Calibri");
            font.setFontHeightInPoints((short) 10);
            setFontColor(font, textHex, IndexedColors.BLACK.getIndex());
            style.setFont(font);
            return style;
        }

        private CellStyle createBaseStyle() {
            CellStyle style = workbook.createCellStyle();
            style.setVerticalAlignment(VerticalAlignment.CENTER);
            style.setWrapText(true);
            return style;
        }

        private void setFillColor(CellStyle style, String hex, short fallbackIndexedColor) {
            if (style instanceof XSSFCellStyle xssfStyle) {
                xssfStyle.setFillForegroundColor(toXssfColor(hex));
            } else {
                style.setFillForegroundColor(fallbackIndexedColor);
            }
        }

        private void setBorderColor(CellStyle style, String hex, short fallbackIndexedColor) {
            if (style instanceof XSSFCellStyle xssfStyle) {
                XSSFColor color = toXssfColor(hex);
                xssfStyle.setTopBorderColor(color);
                xssfStyle.setBottomBorderColor(color);
                xssfStyle.setLeftBorderColor(color);
                xssfStyle.setRightBorderColor(color);
            } else {
                style.setTopBorderColor(fallbackIndexedColor);
                style.setBottomBorderColor(fallbackIndexedColor);
                style.setLeftBorderColor(fallbackIndexedColor);
                style.setRightBorderColor(fallbackIndexedColor);
            }
        }

        private void setFontColor(Font font, String hex, short fallbackIndexedColor) {
            if (font instanceof org.apache.poi.xssf.usermodel.XSSFFont xssfFont) {
                xssfFont.setColor(toXssfColor(hex));
            } else {
                font.setColor(fallbackIndexedColor);
            }
        }

        private XSSFColor toXssfColor(String hex) {
            String cleaned = hex.startsWith("#") ? hex.substring(1) : hex;
            byte[] rgb = new byte[]{
                    (byte) Integer.parseInt(cleaned.substring(0, 2), 16),
                    (byte) Integer.parseInt(cleaned.substring(2, 4), 16),
                    (byte) Integer.parseInt(cleaned.substring(4, 6), 16)
            };
            return new XSSFColor(rgb, new DefaultIndexedColorMap());
        }
    }
}
