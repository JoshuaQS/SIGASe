package mx.edu.utez.server.modules.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class GoogleTokenVerifierService {

    private final GoogleIdTokenVerifier verifier;

    @Autowired
    public GoogleTokenVerifierService(AppProperties appProperties) {
        this(buildVerifier(appProperties));
    }

    GoogleTokenVerifierService(GoogleIdTokenVerifier verifier) {
        this.verifier = verifier;
    }

    private static GoogleIdTokenVerifier buildVerifier(AppProperties appProperties) {
        return new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(appProperties.getGoogle().getAudience())
                .setIssuers(List.of("https://accounts.google.com", "accounts.google.com"))
                .build();
    }

    public GoogleIdentity verify(String idTokenRaw) {
        try {
            if (!StringUtils.hasText(idTokenRaw)) {
                throw invalidToken();
            }
            GoogleIdToken idToken = verifier.verify(idTokenRaw);
            if (idToken == null) {
                throw invalidToken();
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            if (payload == null) {
                throw invalidToken();
            }
            String subject = payload.getSubject();
            String email = payload.getEmail();
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
            if (subject == null || email == null || !emailVerified) {
                throw invalidToken();
            }
            return new GoogleIdentity(subject, email, true);
        } catch (BusinessException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new BusinessException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    "Google no está disponible para validar el token en este momento."
            );
        } catch (GeneralSecurityException ex) {
            throw new BusinessException(
                    ErrorCode.PROVIDER_ERROR,
                    "Error del proveedor al verificar token de Google."
            );
        } catch (IllegalArgumentException ex) {
            throw invalidToken();
        } catch (RuntimeException ex) {
            throw new BusinessException(
                    ErrorCode.PROVIDER_ERROR,
                    "Error inesperado durante la verificación con Google."
            );
        }
    }

    private BusinessException invalidToken() {
        return new BusinessException(ErrorCode.INVALID_TOKEN, "Token de Google inválido.");
    }
}
