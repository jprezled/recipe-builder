package com.recipebuilder.controller;

import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.service.SessionService;
import com.recipebuilder.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * RB-208: the pantry a cook has saved to their account.
 *
 *   GET /api/pantry   what they last saved, as "eggs,milk"
 *   PUT /api/pantry   replace it
 *
 * Plain text both ways, like the note - the body IS the list, so wrapping it
 * in JSON would add a field name nobody needs. See
 * docs/saved-pantry-contract.md.
 *
 * There is deliberately no id in the address. The cook is whoever the session
 * says, so asking for somebody else's pantry cannot be expressed.
 */
@RestController
public class PantryController {

    /** The session attribute RB-160 writes on sign-in. */
    private static final String USER_ID = "userId";

    private final UserService service;

    public PantryController(UserService service) {
        this.service = service;
    }

    @GetMapping(value = "/api/pantry", produces = "text/plain")
    public String get(HttpServletRequest http) {
        return service.getPantry(signedInUserId(http));
    }

    /**
     * Replaces the saved pantry.
     *
     * PUT because sending the same list twice leaves the same list. An empty
     * body clears it, which is how a cook removes their last ingredient.
     */
    @PutMapping(value = "/api/pantry", consumes = "text/plain")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(@RequestBody(required = false) String pantry, HttpServletRequest http) {
        service.updatePantry(signedInUserId(http), pantry == null ? "" : pantry);
    }

    /**
     * The only place in this class allowed to know a session exists.
     *
     * getSession(false) so reading a pantry does not hand every anonymous
     * visitor a session. Same shape as RestrictionsController.
     */
    private long signedInUserId(HttpServletRequest http) {
        HttpSession session = http.getSession(false);

        if (session != null && session.getAttribute(USER_ID) instanceof Long id) {
            return id;
        }

        throw new NotSignedInException(SessionService.NOT_SIGNED_IN);
    }
}
