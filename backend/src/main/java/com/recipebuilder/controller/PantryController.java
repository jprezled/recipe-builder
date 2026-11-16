package com.recipebuilder.controller;

import com.recipebuilder.dto.PantryRequest;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.model.PantryItem;
import com.recipebuilder.service.PantryService;
import com.recipebuilder.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pantry")
public class PantryController {

    /** The session attribute RB-160 writes on sign-in. */
    private static final String USER_ID = "userId";

    private final PantryService pantryService;

    public PantryController(PantryService pantryService) {
        this.pantryService = pantryService;
    }

    @PostMapping
    public ResponseEntity<?> savePantryItem(
            @Valid @RequestBody PantryRequest request, HttpServletRequest http) {

        request.cleanInput();

        try {
            PantryItem saved =
                    pantryService.savePantryItem(signedInUserId(http), request.getPantry());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * The only place in this class allowed to know a session exists.
     *
     * getSession(false) so saving does not hand every anonymous visitor a
     * session. Same shape as RestrictionsController.
     */
    private long signedInUserId(HttpServletRequest http) {
        HttpSession session = http.getSession(false);

        if (session != null && session.getAttribute(USER_ID) instanceof Long id) {
            return id;
        }

        throw new NotSignedInException(SessionService.NOT_SIGNED_IN);
    }
}
