package com.recipebuilder.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recipebuilder.dto.ChangePasswordRequest;
import com.recipebuilder.dto.DeleteAccountRequest;
import com.recipebuilder.dto.SignUpRequest;
import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.service.SessionService;
import com.recipebuilder.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * Creating an account.
 *
 * Unpacks the request and hands it to the service. No rules live here - see
 * UserService for those.
 */
@RestController
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    /** 201 rather than 200: this call creates something that did not exist. */
    @PostMapping("/api/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto signUp(@RequestBody SignUpRequest request) {
        return service.signUp(request);
    }

    /**
     * RB-290: change this cook's password.
     *
     * No id in the address - the cook is whoever the session says, so asking
     * to change somebody else's password cannot be expressed.
     */
    @PutMapping("/api/users/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@RequestBody ChangePasswordRequest body, HttpServletRequest http) {
        service.changePassword(signedInUserId(http), body.currentPassword(), body.newPassword());
    }

    /** RB-290: delete this cook's account, and everything belonging only to it. */
    @DeleteMapping("/api/users/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@RequestBody DeleteAccountRequest body, HttpServletRequest http) {
        service.deleteAccount(signedInUserId(http), body.currentPassword());

        // The account is gone, so the session pointing at it is meaningless -
        // leaving it would have the app holding a signed-in session for a
        // user id that no longer exists.
        HttpSession session = http.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    /**
     * The only place in this class allowed to know a session exists.
     *
     * getSession(false) so an anonymous visitor is not handed one. Same shape
     * as PantryController and RestrictionsController.
     */
    private long signedInUserId(HttpServletRequest http) {
        HttpSession session = http.getSession(false);

        if (session != null && session.getAttribute("userId") instanceof Long id) {
            return id;
        }

        throw new NotSignedInException(SessionService.NOT_SIGNED_IN);
    }
}