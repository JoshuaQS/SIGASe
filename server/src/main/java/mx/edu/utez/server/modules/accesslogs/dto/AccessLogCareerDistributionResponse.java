package mx.edu.utez.server.modules.accesslogs.dto;

public record AccessLogCareerDistributionResponse(
        String careerCode,
        String careerName,
        long total
) {
}

