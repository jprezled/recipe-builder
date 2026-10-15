package com.recipebuilder.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Catches our exceptions anywhere in the app and turns each into a status code
 * plus one sentence a person can read.
 *
 * Without this, a thrown exception reaches the browser as Spring's default
 * error body - a stack trace, a timestamp, a path and a raw status - which
 * RB-80 forbids.
 *
 * The wording is fixed by docs/error-shape.md. Change a sentence there first.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** The user asked for something we cannot search with. */
    @ExceptionHandler(InvalidInputException.class)
    public ResponseEntity<ApiErrorResponse> onInvalidInput(InvalidInputException failure) {
        return build(HttpStatus.BAD_REQUEST, failure.getMessage());
    }

    /** ?ingredient= was left off the address entirely. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> onMissingParameter(
            MissingServletRequestParameterException failure) {
        return build(HttpStatus.BAD_REQUEST, "Please enter at least one ingredient.");
    }

    /** Our shared allowance is gone. Nothing to do but wait. */
    @ExceptionHandler(ApiLimitReachedException.class)
    public ResponseEntity<ApiErrorResponse> onLimitReached(ApiLimitReachedException failure) {
        return build(HttpStatus.TOO_MANY_REQUESTS, failure.getMessage());
    }

    /**
     * Our key is missing or rejected - our misconfiguration, not the user's
     * fault, so the message points at us rather than blaming them.
     */
    @ExceptionHandler(ApiKeyMissingException.class)
    public ResponseEntity<ApiErrorResponse> onKeyMissing(ApiKeyMissingException failure) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                "Recipe search is not configured correctly. Please tell the team.");
    }

    /** Spoonacular is unreachable or broke in some way we do not handle. */
    @ExceptionHandler(ExternalApiException.class)
    public ResponseEntity<ApiErrorResponse> onExternalFailure(ExternalApiException failure) {
        return build(HttpStatus.BAD_GATEWAY,
                "Recipe search is unavailable right now. Please try again shortly.");
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(message));
    }
}
