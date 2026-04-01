package mx.edu.utez.server.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI backendOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SGB-UTEZ Backend API")
                        .version("v1")
                        .description("API backend para Portal Biblioteca UTEZ. "
                                + "En esta fase el logout de JWT es lógico (client-side) "
                                + "y no existe revocación server-side."));
    }
}
