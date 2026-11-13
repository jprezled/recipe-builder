//Two endpoints, same session handling as the pantry.

/**Its own controller rather than more methods on an
 *  existing one — the one-class-per-thing rule from docs/accounts-contract.md, 
 * which is what keeps two people out of the same file. */

package com.recipebuilder.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recipebuilder.dto.SavedRestrictionsDto;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.service.RestrictionsPreferenceService; 
import com.recipebuilder.service.SessionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * RB-209: the signed-in cook's saved dietary choices.
 *
 *   GET /api/restrictions   what they last saved
 *   PUT /api/restrictions   replace it
 *
 * Its own controller rather than more methods on an existing one, so two
 * people are never editing the same file - the rule docs/accounts-contract.md
 * set when the account classes were divided up.
 */
@RestController
public class RestrictionsController {

    /** The session attribute RB-160 writes on sign-in. */
    private static final String USER_ID = "userId";

    private final RestrictionsPreferenceService service;

    public RestrictionsController(RestrictionsPreferenceService service) {
        this.service = service;
    }

    @GetMapping("/api/restrictions")
    public SavedRestrictionsDto get(HttpServletRequest http) {
        return service.get(signedInUserId(http));
    }

    /**
     * Replaces the saved choices.
     *
     * PUT because sending the same choices twice leaves the same choices.
     */
    @PutMapping("/api/restrictions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(@RequestBody SavedRestrictionsDto choices, HttpServletRequest http) {
        service.save(signedInUserId(http), choices.diet(), choices.intolerances());
    }

    /**
     * The only place in this class allowed to know a session exists.
     *
     * getSession(false) so reading a preference does not hand every anonymous
     * visitor a session.
     */
    private long signedInUserId(HttpServletRequest http) {
        HttpSession session = http.getSession(false);

        if (session != null && session.getAttribute(USER_ID) instanceof Long id) {
            return id;
        }

        throw new NotSignedInException(SessionService.NOT_SIGNED_IN);
    }
}
