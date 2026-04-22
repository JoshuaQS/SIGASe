package mx.edu.utez.server.modules.students.dto;

public record StudentCareerDistributionResponse(
        String careerCode,
        long total
) {
}
