package com.recipebuilder.controller;

import com.recipebuilder.dto.RatingDto;
import com.recipebuilder.dto.RatingRequest;
import com.recipebuilder.dto.RatingSummaryDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.service.RatingService;
import com.recipebuilder.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * RB-297 / RB-294: recipe ratings.
 *
 *   GET  /api/recipes/{id}/rating       average, count, and the caller's own
 *   POST /api/recipes/{id}/rating       rate it (signed in only)
 *   GET  /api/recipes/ratings?ids=1,2   average and count for a page of cards
 *
 * Nothing here goes through RecipeService, whose results are cached for every
 * cook at once.
 */
@RestController
public class RatingController {

    /** The session attribute RB-160 writes on sign-in. */
    private static final String USER_ID = "userId";

    private final RatingService service;

    public RatingController(RatingService service) {
        this.service = service;
    }

    @GetMapping("/api/recipes/{id}/rating")
    public RatingDto get(@PathVariable long id, HttpServletRequest http) {
        return service.get(maybeSignedInUserId(http), id);
    }

    @PostMapping("/api/recipes/{id}/rating")
    public RatingDto submit(@PathVariable long id, @RequestBody RatingRequest body, HttpServletRequest http) {
        long userId = signedInUserId(http);

        return service.submit(userId, id, body.rating());
    }

    @GetMapping("/api/recipes/ratings")
    public List<RatingSummaryDto> summaries(@RequestParam String ids) {
        List<Long> recipeIds = new ArrayList<>();

        for (String piece : ids.split(",")) {
            if (piece.isBlank()) {
                continue;
            }
            try {
                recipeIds.add(Long.parseLong(piece.trim()));
            } catch (NumberFormatException notANumber) {
                throw new InvalidInputException("That recipe link is not valid.");
            }
        }

        return service.summaries(recipeIds);
    }

    /** getSession(false) so reading a rating does not hand every visitor a session. */
    private Long maybeSignedInUserId(HttpServletRequest http) {
        HttpSession session = http.getSession(false);

        if (session != null && session.getAttribute(USER_ID) instanceof Long id) {
            return id;
        }

        return null;
    }

    private long signedInUserId(HttpServletRequest http) {
        Long id = maybeSignedInUserId(http);

        if (id == null) {
            throw new NotSignedInException(SessionService.NOT_SIGNED_IN);
        }

        return id;
    }
}
