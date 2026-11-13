//refuseUnsupported is written as plain loops on purpose. 
// This is the code that decides whether an allergy filter works, 
// so it should be readable by anybody on the team.

package com.recipebuilder.service;

import org.springframework.stereotype.Service;

import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.dto.SavedRestrictionsDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.UserRepository;

/**
 * RB-209: the dietary choices a cook has saved to their account.
 *
 * Knows nothing about HTTP. The controller reads the signed-in user from the
 * session and passes the id in, which is the rule RB-161 established and what
 * lets this be tested with no web server.
 *
 * Validates on the way IN rather than on the way out, so a value we do not
 * support can never reach the column. A bad value stored once would come back
 * on every future search, and Spoonacular would silently ignore it - the
 * exact failure the dietary filter contract exists to prevent.
 */
@Service
public class RestrictionsPreferenceService {

    /** The agreed wording. Change docs/error-shape.md first. */
    private static final String NOT_SUPPORTED = "That dietary filter is not one we support.";

    private final UserRepository repository;

    public RestrictionsPreferenceService(UserRepository repository) {
        this.repository = repository;
    }

    /**
     * What this cook last saved.
     *
     * @param userId whose preference - the controller reads this from the session
     * @return the saved choices; empty strings when nothing is saved
     */
    public SavedRestrictionsDto get(long userId) {
        String diet = repository.findDiet(userId);
        String intolerances = repository.findIntolerances(userId);

        // Empty rather than null, so the page has one shape to handle and can
        // put it straight into the address.
        if (diet == null) {
            diet = "";
        }
        if (intolerances == null) {
            intolerances = "";
        }

        return new SavedRestrictionsDto(diet, intolerances);
    }

    /**
     * Replaces this cook's saved choices.
     *
     * @param userId       whose preference
     * @param diet         one agreed diet, "none", or blank to clear
     * @param intolerances agreed intolerances, "none", or blank to clear
     */
    public void save(long userId, String diet, String intolerances) {

        // Clean them exactly the way a search does, so what is stored is what
        // a search would have used.
        DietaryRestrictions cleaned =
                RestrictionsCleaner.clean(new DietaryRestrictions(diet, intolerances));

        refuseUnsupported(cleaned);

        // A cleared preference is null in the column, so "never saved" and
        // "saved then cleared" read the same.
        String dietToStore = cleaned.diet();
        if (dietToStore.equals(RestrictionsCleaner.NONE)) {
            dietToStore = null;
        }

        String intolerancesToStore = cleaned.intolerances();
        if (intolerancesToStore.equals(RestrictionsCleaner.NONE)) {
            intolerancesToStore = null;
        }

        repository.saveRestrictions(userId, dietToStore, intolerancesToStore);
    }

    /**
     * Refuses anything not on the agreed lists.
     *
     * The same check RecipeService makes before a search. Written out as plain
     * loops rather than anything clever, because this is the code that decides
     * whether an allergy filter works.
     */
    private static void refuseUnsupported(DietaryRestrictions choices) {

        if (!choices.diet().equals(RestrictionsCleaner.NONE)
                && !DietaryRestrictions.APPROVED_DIETS.contains(choices.diet())) {
            throw new InvalidInputException(NOT_SUPPORTED);
        }

        if (choices.intolerances().equals(RestrictionsCleaner.NONE)) {
            return;
        }

        String[] parts = choices.intolerances().split(",");

        for (String part : parts) {
            String one = part.trim();

            if (!one.isEmpty() && !DietaryRestrictions.APPROVED_INTOLERANCES.contains(one)) {
                throw new InvalidInputException(NOT_SUPPORTED);
            }
        }
    }
}

