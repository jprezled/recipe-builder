package com.recipebuilder.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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

    /** ?ingredients= was left off the address entirely. */
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

    /**
     * The database is not reachable, or refused what we asked of it.
     *
     * 503 rather than 500: nothing is wrong with the request, the thing we
     * depend on is simply not there right now.
     */
    @ExceptionHandler(DatabaseUnavailableException.class)
    public ResponseEntity<ApiErrorResponse> onDatabaseDown(DatabaseUnavailableException failure) {
        return build(HttpStatus.SERVICE_UNAVAILABLE,
                "Could not save your favorite right now. Please try again shortly.");
    }

    /**
     * Favorites have nothing to hang off because the demo user row is missing.
     *
     * The message names the setup step on purpose. This is what a teammate hits
     * after applying V1 and skipping V2, and without this sentence it looks
     * like the favorites feature is broken.
     */
    @ExceptionHandler(DemoUserMissingException.class)
    public ResponseEntity<ApiErrorResponse> onDemoUserMissing(DemoUserMissingException failure) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, failure.getMessage());
    }

    /** No recipe exists with the id that was asked for. */
    @ExceptionHandler(RecipeNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> onRecipeNotFound(RecipeNotFoundException failure) {
        return build(HttpStatus.NOT_FOUND, failure.getMessage());
    }

    /**
     * The id in the address was not a number, so Spring could not turn it into
     * one and threw before our controller ran.
     *
     * Without this the browser gets Spring's default error page, which carries
     * a stack trace - the one thing RB-80's fourth criterion forbids.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> onUnreadableId(
            MethodArgumentTypeMismatchException failure) {
        return build(HttpStatus.BAD_REQUEST, "That recipe link is not valid.");
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(message));
    }

    /**
     * Nobody is signed in, or the sign-in details were wrong. Both are 401, and
     * the message is the agreed sentence for whichever it was.
     */
    @ExceptionHandler(NotSignedInException.class)
    public ResponseEntity<ApiErrorResponse> onNotSignedIn(NotSignedInException failure) {
        return build(HttpStatus.UNAUTHORIZED, failure.getMessage());
    }
    
}
