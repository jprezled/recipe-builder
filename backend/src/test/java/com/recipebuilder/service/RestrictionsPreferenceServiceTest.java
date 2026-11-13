package com.recipebuilder.service;
// == for RB-249 == //
/** Overview
 * 1) a service test asserting a nonsense diet is refused with the 
 * agreed sentence, before anything is stored.
 * 
 * 2) Write a second asserting "none" is stored as null, 
 * and a third asserting nothing saved comes back as empty
 * strings rather than null.
 *  */ 

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import com.recipebuilder.dto.SavedRestrictionsDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.UserRepository;

class RestrictionsPreferenceServiceTest {

    private final UserRepository repository = mock(UserRepository.class);
    private final RestrictionsPreferenceService service = new RestrictionsPreferenceService(repository);

    @Test
    void save_rejectsUnsupportedDietBeforeSaving() {
        InvalidInputException ex = assertThrows(
                InvalidInputException.class,
                () -> service.save(7L, "paleo-ish", "none"));

        assertEquals("That dietary filter is not one we support.", ex.getMessage());

        verify(repository, never()).saveRestrictions(anyLong(), any(), any());
    }

    @Test
    void save_noneIsStoredAsNull() {
        service.save(7L, "none", "none");

        verify(repository).saveRestrictions(7L, null, null);
    }

    @Test
    void get_returnsEmptyStringsWhenNothingIsSaved() {
        when(repository.findDiet(7L)).thenReturn(null);
        when(repository.findIntolerances(7L)).thenReturn(null);

        SavedRestrictionsDto result = service.get(7L);

        assertEquals("", result.diet());
        assertEquals("", result.intolerances());
    }
}
