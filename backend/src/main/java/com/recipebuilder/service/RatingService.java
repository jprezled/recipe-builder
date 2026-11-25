package com.recipebuilder.service;

import com.recipebuilder.dto.RatingDto;
import com.recipebuilder.dto.RatingSummaryDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.RatingRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * The rules about rating a recipe.
 *
 * Deliberately NOT cached. RecipeService caches each recipe once for every
 * cook, so anything per-cook or quick to go stale - a rating - has to be read
 * here, live, instead of riding along inside the recipe.
 */
@Service
public class RatingService {

    /** The agreed sentence from docs/error-shape.md. Change it there first. */
    public static final String OUT_OF_RANGE = "Please choose a rating from 1 to 5 stars.";

    private final RatingRepository ratings;

    public RatingService(RatingRepository ratings) {
        this.ratings = ratings;
    }

    /** Saves the cook's rating, replacing an earlier one, and answers with the new average. */
    public RatingDto submit(long userId, long recipeId, int rating) {
        if (rating < 1 || rating > 5) {
            throw new InvalidInputException(OUT_OF_RANGE);
        }

        ratings.upsert(userId, recipeId, rating);

        return get(userId, recipeId);
    }

    /**
     * @param userId the signed-in cook, or null for a visitor who is not signed in
     */
    public RatingDto get(Long userId, long recipeId) {
        RatingSummaryDto summary = ratings.aggregateFor(recipeId);

        Integer yours = null;
        if (userId != null) {
            yours = ratings.yourRating(userId, recipeId);
        }

        return new RatingDto(summary.average(), summary.count(), yours);
    }

    /** The average and count for every id, for a page of cards in one call. */
    public List<RatingSummaryDto> summaries(List<Long> recipeIds) {
        return ratings.aggregatesFor(recipeIds);
    }
}
