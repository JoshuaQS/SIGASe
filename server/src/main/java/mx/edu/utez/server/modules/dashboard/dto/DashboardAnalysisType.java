package mx.edu.utez.server.modules.dashboard.dto;

public enum DashboardAnalysisType {
    STUDENTS_INDIVIDUAL,
    STUDENTS_ALL,
    CAREERS;

    public String toApiValue() {
        return switch (this) {
            case STUDENTS_INDIVIDUAL -> "students_individual";
            case STUDENTS_ALL -> "students_all";
            case CAREERS -> "careers";
        };
    }
}
