package mx.edu.utez.server.security;

import org.springframework.security.core.AuthenticationException;

public class SessionExpiredAuthenticationException extends AuthenticationException {

    public SessionExpiredAuthenticationException(String message, Throwable cause) {
        super(message, cause);
    }
}
