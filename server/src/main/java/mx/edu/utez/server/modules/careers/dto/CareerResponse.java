package mx.edu.utez.server.modules.careers.dto;

import java.util.UUID;

public record CareerResponse(
        UUID id,
        String code,
        String name
) {
}
