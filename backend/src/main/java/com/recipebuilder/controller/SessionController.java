package com.recipebuilder.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.recipebuilder.dto.SignInRequest;
import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.service.SessionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * Sign in, sign out, and "who am I".
 *
 * The session is Java's own: Tomcat sends a JSESSIONID cookie and the browser
 * returns it on every request, so there is nothing to build for "staying
 * signed in". The user's id goes in the session under "userId" as a Long, as
 * docs/accounts-contract.md says. This class is the only place that writes it.
 */
@RestController
public class SessionController {

    /** The literal agreed in docs/accounts-contract.md. Copy it, never retype it. */
    public static final String USER_ID = "userId";

    /** Stored beside the id so "who am I" needs no database call. */
    public static final String USERNAME = "username";

    private final SessionService service;

    public SessionController(SessionService service) {
        this.service = service;
    }

    @PostMapping("/api/sessions")
    public UserDto signIn(@RequestBody SignInRequest body, HttpServletRequest request) {
        UserDto user = service.signIn(body.username(), body.password());

        // A fresh session for every sign-in, so a session id someone planted
        // beforehand can never become a signed-in one.
        HttpSession old = request.getSession(false);
        if (old != null) {
            old.invalidate();
        }
        HttpSession session = request.getSession(true);

        session.setAttribute(USER_ID, user.id());
        session.setAttribute(USERNAME, user.username());
        return user;
    }

    /** 204 whether or not anybody was signed in. */
    @DeleteMapping("/api/sessions")
    public ResponseEntity<Void> signOut(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * Reads the session without creating one, so a page asking "who am I" on
     * load does not hand every anonymous visitor a session.
     */
    @GetMapping("/api/session")
    public UserDto whoAmI(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null
                && session.getAttribute(USER_ID) instanceof Long id
                && session.getAttribute(USERNAME) instanceof String name) {
            return new UserDto(id, name);
        }
        throw new NotSignedInException(SessionService.NOT_SIGNED_IN);
    }
}