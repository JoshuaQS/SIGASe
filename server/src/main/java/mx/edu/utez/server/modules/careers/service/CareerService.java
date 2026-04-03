package mx.edu.utez.server.modules.careers.service;

import mx.edu.utez.server.modules.careers.dto.CareerResponse;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class CareerService {

    private final CareerRepository careerRepository;

    public CareerService(CareerRepository careerRepository) {
        this.careerRepository = careerRepository;
    }

    @Transactional(readOnly = true)
    public List<CareerResponse> listActive() {
        return careerRepository.findByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Career resolveCareer(UUID careerId, String careerCode) {
        boolean hasCareerId = careerId != null;
        boolean hasCareerCode = StringUtils.hasText(careerCode);
        if (!hasCareerId && !hasCareerCode) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Debe enviar careerId o careerCode.");
        }

        Career byId = null;
        if (hasCareerId) {
            byId = careerRepository.findById(careerId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR, "careerId no válido."));
        }

        Career byCode = null;
        if (hasCareerCode) {
            String safeCode = careerCode.trim().toUpperCase(Locale.ROOT);
            byCode = careerRepository.findByCodeIgnoreCase(safeCode)
                    .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR, "careerCode no válido."));
        }

        if (byId != null && byCode != null && !byId.getId().equals(byCode.getId())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "careerId y careerCode no coinciden.");
        }
        return byId != null ? byId : byCode;
    }

    public CareerResponse toResponse(Career career) {
        if (career == null) {
            return null;
        }
        return new CareerResponse(career.getId(), career.getCode(), career.getName());
    }
}
