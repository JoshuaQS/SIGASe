package mx.edu.utez.server.modules.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.logs.access.service.StudentAccessAlertService;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

@ExtendWith(MockitoExtension.class)
class StudentGoogleLoginServiceTest {

    @Mock private GoogleTokenVerifierService googleTokenVerifierService;
    @Mock private GoogleSubjectPolicyService googleSubjectPolicyService;
    @Mock private StudentRepository studentRepository;
    @Mock private AppProperties appProperties;
    @Mock private EmailNormalizer emailNormalizer;
    @Mock private StudentAccessAlertService studentAccessAlertService;
    @Mock private StudentAccessLoggingFacade studentAccessLoggingFacade;
    @Mock private StudentAuthAuditFacade studentAuthAuditFacade;
    @Mock private AuthLockoutPolicy authLockoutPolicy;
    @Mock private StudentAuthTokenFactory studentAuthTokenFactory;

    private StudentGoogleLoginService service;

    @BeforeEach
    void setUp() {
        service = new StudentGoogleLoginService(
                googleTokenVerifierService,
                googleSubjectPolicyService,
                studentRepository,
                appProperties,
                emailNormalizer,
                studentAccessAlertService,
                studentAccessLoggingFacade,
                studentAuthAuditFacade,
                authLockoutPolicy,
                studentAuthTokenFactory
        );
    }

    @Test
    void shouldLogInvalidGoogleTokenCategoryWhenVerifierRejectsCredentials() {
        assertVerifierFailureMapping(
                ErrorCode.INVALID_TOKEN,
                AccessResult.FAILED_INVALID_GOOGLE_TOKEN,
                "INVALID_GOOGLE_TOKEN"
        );
    }

    @Test
    void shouldLogProviderUnavailableCategoryWhenVerifierHasTransientFailure() {
        assertVerifierFailureMapping(
                ErrorCode.SERVICE_UNAVAILABLE,
                AccessResult.FAILED_GOOGLE_PROVIDER_UNAVAILABLE,
                "GOOGLE_PROVIDER_UNAVAILABLE"
        );
    }

    @Test
    void shouldLogProviderErrorCategoryWhenVerifierFailsUnexpectedly() {
        assertVerifierFailureMapping(
                ErrorCode.PROVIDER_ERROR,
                AccessResult.FAILED_GOOGLE_PROVIDER_ERROR,
                "GOOGLE_PROVIDER_ERROR"
        );
    }

    private void assertVerifierFailureMapping(
            ErrorCode errorCode,
            AccessResult expectedResult,
            String expectedAccessErrorCode
    ) {
        HttpServletRequest request = new MockHttpServletRequest();
        BusinessException verifierException = new BusinessException(errorCode, "verifier failure");
        when(googleTokenVerifierService.verify("google-token")).thenThrow(verifierException);

        BusinessException thrown = assertThrows(
                BusinessException.class,
                () -> service.loginWithGoogle("google-token", request)
        );

        assertEquals(errorCode, thrown.getErrorCode());
        verify(studentAccessLoggingFacade).log(
                eq(request),
                anyLong(),
                isNull(),
                isNull(),
                isNull(),
                eq(expectedResult),
                eq(expectedAccessErrorCode),
                any()
        );
    }
}
