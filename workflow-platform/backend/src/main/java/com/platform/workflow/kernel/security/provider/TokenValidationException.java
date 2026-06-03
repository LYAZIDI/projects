package com.platform.workflow.kernel.security.provider;

/** Thrown when a token cannot be validated by any registered {@link TokenValidatorSPI}. */
public class TokenValidationException extends RuntimeException {

    public TokenValidationException(String message) {
        super(message);
    }

    public TokenValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
