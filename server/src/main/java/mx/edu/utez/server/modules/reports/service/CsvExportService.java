package mx.edu.utez.server.modules.reports.service;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.Function;
import org.springframework.stereotype.Service;

@Service
public class CsvExportService {

    private static final char BOM = '\uFEFF';
    private static final char SEPARATOR = ',';
    private static final char QUOTE = '"';
    private static final String LINE_END = "\r\n";
    private static final DateTimeFormatter ISO_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(ZoneOffset.UTC);

    public <T> void write(
            OutputStream outputStream,
            String[] headers,
            List<Function<T, String>> extractors,
            ChunkedDataProvider<T> dataProvider
    ) throws IOException {
        Writer writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);
        writer.write(BOM);
        writeLine(writer, headers);

        int page = 0;
        List<T> chunk;
        while (!(chunk = dataProvider.fetchChunk(page)).isEmpty()) {
            for (T item : chunk) {
                String[] values = new String[extractors.size()];
                for (int i = 0; i < extractors.size(); i++) {
                    values[i] = extractors.get(i).apply(item);
                }
                writeLine(writer, values);
            }
            writer.flush();
            page++;
        }
        writer.flush();
    }

    private void writeLine(Writer writer, String[] values) throws IOException {
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                writer.write(SEPARATOR);
            }
            String safe = sanitize(values[i]);
            if (needsQuoting(safe)) {
                writer.write(QUOTE);
                writer.write(safe.replace("\"", "\"\""));
                writer.write(QUOTE);
            } else {
                writer.write(safe);
            }
        }
        writer.write(LINE_END);
    }

    private boolean needsQuoting(String value) {
        if (value == null || value.isEmpty()) {
            return false;
        }
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == SEPARATOR || c == QUOTE || c == '\n' || c == '\r') {
                return true;
            }
        }
        return false;
    }

    static String sanitize(String value) {
        if (value == null) {
            return "";
        }
        if (value.isEmpty()) {
            return value;
        }
        char first = value.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@'
                || first == '\t' || first == '\r') {
            return "'" + value;
        }
        return value;
    }

    public static String formatInstant(Instant instant) {
        if (instant == null) {
            return "";
        }
        return ISO_FORMATTER.format(instant);
    }

    @FunctionalInterface
    public interface ChunkedDataProvider<T> {
        List<T> fetchChunk(int page);
    }
}
