package mx.edu.utez.server.modules.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import java.io.IOException;
import java.security.GeneralSecurityException;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(MockitoExtension.class)
class GoogleTokenVerifierServiceTest {

    @Mock
    private GoogleIdTokenVerifier verifier;

    private GoogleTokenVerifierService service;

    @BeforeEach
    void setUp() {
        service = new GoogleTokenVerifierService(verifier);
    }

    @Test
    void shouldMapInvalidGoogleTokenWhenVerifierReturnsNull() throws Exception {
        when(verifier.verify("invalid-token")).thenReturn(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.verify("invalid-token")
        );

        assertEquals(ErrorCode.INVALID_TOKEN, exception.getErrorCode());
    }

    @Test
    void shouldMapServiceUnavailableWhenVerifierHasTransientCommunicationError() throws Exception {
        when(verifier.verify("network-token")).thenThrow(new IOException("timeout"));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.verify("network-token")
        );

        assertEquals(ErrorCode.SERVICE_UNAVAILABLE, exception.getErrorCode());
    }

    @Test
    void shouldMapProviderErrorWhenVerifierFailsUnexpectedly() throws Exception {
        when(verifier.verify("provider-token")).thenThrow(new GeneralSecurityException("crypto failure"));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.verify("provider-token")
        );

        assertEquals(ErrorCode.PROVIDER_ERROR, exception.getErrorCode());
    }
}
