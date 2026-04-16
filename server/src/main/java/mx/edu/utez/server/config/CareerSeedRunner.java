package mx.edu.utez.server.config;

import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.shared.enums.CareerStatus;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CareerSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CareerSeedRunner.class);

    private final CareerRepository careerRepository;

    public CareerSeedRunner(CareerRepository careerRepository) {
        this.careerRepository = careerRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<CareerSeedItem> items = List.of(
                new CareerSeedItem("LAE", "Licenciatura en Administración"),
                new CareerSeedItem("LCON", "Licenciatura en Contaduría"),
                new CareerSeedItem("LDDPA", "Licenciatura en Diseño Digital y Producción Audiovisual"),
                new CareerSeedItem("LGB", "Licenciatura en Gestión del Bienestar"),
                new CareerSeedItem("LNM", "Licenciatura en Negocios y Mercadotecnia"),
                new CareerSeedItem("LTF", "Licenciatura en Terapia Física"),
                new CareerSeedItem("DSM", "Desarrollo de Software Multiplataforma"),
                new CareerSeedItem("IRD", "Infraestructura en Redes Digitales"),
                new CareerSeedItem("IDTM", "Ingeniería en Diseño Textil y Moda"),
                new CareerSeedItem("IMI", "Ingeniería en Mantenimiento Industrial"),
                new CareerSeedItem("INANO", "Ingeniería en Nanotecnología"),
                new CareerSeedItem("IIND", "Ingeniería Industrial"),
                new CareerSeedItem("IMEC", "Ingeniería Mecatrónica")
        );

        for (CareerSeedItem item : items) {
            String safeCode = item.code().trim().toUpperCase(Locale.ROOT);
            String safeName = item.name().trim();
            Career career = careerRepository.findByCodeIgnoreCase(safeCode).orElseGet(Career::new);
            career.setCode(safeCode);
            career.setName(safeName);
            career.setStatus(CareerStatus.ACTIVE);
            careerRepository.save(career);
        }

        log.info("Seed careers: {} carreras sincronizadas.", items.size());
    }

    private record CareerSeedItem(String code, String name) {
    }
}
