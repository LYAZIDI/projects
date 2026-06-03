package com.platform.workflow.kernel.workflow.engine;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Typed exception thrown by the workflow engine.
 *
 * <p>Each error code maps to a specific HTTP status, allowing the REST controller
 * to return clean, meaningful responses without try/catch boilerplate.
 *
 * <p>The exception message is safe to expose to API clients (no stack traces, no internals).
 */
@Getter
public class WorkflowException extends RuntimeException {

    public enum Code {
        DEFINITION_NOT_FOUND(HttpStatus.NOT_FOUND),
        TRANSITION_NOT_FOUND(HttpStatus.NOT_FOUND),
        ENTITY_NOT_FOUND(HttpStatus.NOT_FOUND),
        PERMISSION_DENIED(HttpStatus.FORBIDDEN),
        CONDITION_FAILED(HttpStatus.UNPROCESSABLE_ENTITY),
        ADAPTER_NOT_FOUND(HttpStatus.INTERNAL_SERVER_ERROR),
        CONCURRENT_MODIFICATION(HttpStatus.CONFLICT),
        INVALID_STATE(HttpStatus.BAD_REQUEST);

        private final HttpStatus httpStatus;

        Code(HttpStatus httpStatus) {
            this.httpStatus = httpStatus;
        }

        public int getStatusCode() {
            return httpStatus.value();
        }
    }

    private final Code code;

    public WorkflowException(Code code, String message) {
        super(message);
        this.code = code;
    }

    public int getStatusCode() {
        return code.getStatusCode();
    }
}
