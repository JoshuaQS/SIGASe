package mx.edu.utez.server.modules.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class GoogleTokenVerifierService {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifierService(AppProperties appProperties) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(appProperties.getGoogle().getAudience())
                .setIssuers(List.of("https://accounts.google.com", "accounts.google.com"))
                .build();
    }

    public GoogleIdentity verify(String idTokenRaw) {
        try {
            GoogleIdToken idToken = verifier.verify(idTokenRaw);
            if (idToken == null) {
                throw invalidToken();
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            String subject = payload.getSubject();
            String email = payload.getEmail();
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
            if (subject == null || email == null || !emailVerified) {
                throw invalidToken();
            }
            return new GoogleIdentity(subject, email, true);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw invalidToken();
        }
    }

    private BusinessException invalidToken() {
        return new BusinessException(ErrorCode.INVALID_TOKEN, "Token de Google inválido.");
    }
}
