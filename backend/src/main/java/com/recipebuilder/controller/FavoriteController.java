package com.recipebuilder.controller;

import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.service.FavoriteService;
import com.recipebuilder.service.SessionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import java.util.List;

/**
 * Our favorites addresses:
 *
 *   GET    /api/favorites        what the signed-in cook has saved
 *   POST   /api/favorites        save one
 *   DELETE /api/favorites/{id}   unsave one, by Spoonacular's id
 *
 * Deliberately thin, like RecipeController. It unpacks the request, hands the
 * work to the service and returns the result. No rules live here.
 *
 * None of these three ever contacts Spoonacular. Favorites are pure database
 * work, which is exactly why the favorites page proves the database works: it
 * has no other source the data could be coming from.
 */
@RestController
public class FavoriteController {

    private final FavoriteService service;

    public FavoriteController(FavoriteService service) {
        this.service = service;
    }

    /** @return the signed-in cook's saved recipes, newest first */
    @GetMapping("/api/favorites")
    public List<FavoriteDto> list(HttpServletRequest http) {
        return service.list(signedInUserId(http));
    }

    /**
     * Saves a recipe.
     *
     * 201 Created even when the recipe was already saved. Saving twice is a
     * no-op rather than an error, so a double-tapped button cannot produce a
     * failure the cook has to understand.
     */
    @PostMapping("/api/favorites")
    @ResponseStatus(HttpStatus.CREATED)
    public void add(@RequestBody FavoriteRequest recipe, HttpServletRequest http) {
        service.add(signedInUserId(http), recipe);
    }

    /**
     * Removes a recipe.
     *
     * 204 No Content even when it was not saved in the first place, for the
     * same reason: the browser can retry without having to check first.
     *
     * @param id Spoonacular's recipe id, from the end of the address
     */
    @DeleteMapping("/api/favorites/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable long id, HttpServletRequest http) {
        service.remove(signedInUserId(http), id);
    }

    /**
     * Whose favorites this request is about.
     *
     * getSession(false) rather than getSession(): the plain version CREATES a
     * session, which would hand a cookie to every signed-out visitor who ever
     * opens the favorites page and pile up empty sessions on the server.
     *
     * Having a session is not the same as being signed in - one can exist for
     * other reasons - so the userId attribute is what actually decides.
     */
    private long signedInUserId(HttpServletRequest http) {
        HttpSession session = http.getSession(false);

        if (session == null || !(session.getAttribute(SessionController.USER_ID) instanceof Long id)) {
            throw new NotSignedInException(SessionService.NOT_SIGNED_IN);
        }

        return id;
    }

    /**
     * RB-205: writes the signed-in cook's note about one saved recipe.
     *
     * PUT rather than POST: writing the same note twice leaves the same note.
     * The body is the note itself rather than a wrapper object, because there
     * is exactly one field - so the request is text/plain, not JSON.
     *
     * @param id   the recipe, by Spoonacular's id, from the end of the address
     * @param note the text, or blank to clear it
     * @param http the request, which is where the session lives
     */
    @PutMapping("/api/favorites/{id}/note")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void note(@PathVariable long id,
                     @RequestBody(required = false) String note,
                     HttpServletRequest http) {

        service.saveNote(signedInUserId(http), id, note);
    }

    /**
     * RB-210: moves a saved recipe into a collection, or out of one.
     *
     * Same shape as note: PUT, and the body is the bare collection id as
     * text. An empty body makes the recipe loose.
     */
    @PutMapping("/api/favorites/{id}/collection")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void collection(@PathVariable long id,
                           @RequestBody(required = false) String collectionId,
                           HttpServletRequest http) {

        Long chosen = null;

        if (collectionId != null && !collectionId.isBlank()) {
            try {
                chosen = Long.valueOf(collectionId.trim());
            } catch (NumberFormatException notANumber) {
                throw new InvalidInputException("That collection could not be found.");
            }
        }

        service.moveToCollection(signedInUserId(http), id, chosen);
    }
}
