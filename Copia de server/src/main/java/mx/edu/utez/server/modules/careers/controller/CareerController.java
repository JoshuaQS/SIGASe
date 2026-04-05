package mx.edu.utez.server.modules.careers.controller;

import mx.edu.utez.server.modules.careers.dto.CareerResponse;
import mx.edu.utez.server.modules.careers.service.CareerService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.CAREERS)
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
public class CareerController {

    private final CareerService careerService;

    public CareerController(CareerService careerService) {
        this.careerService = careerService;
    }

    @GetMapping
    @Operation(summary = "Listar carreras activas")
    public ApiResponse<List<CareerResponse>> listActive() {
        return new ApiResponse<>(
                true,
                "Listado de carreras activas.",
                careerService.listActive(),
                HttpStatus.OK.value()
        );
    }
}
