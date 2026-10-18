package com.recipebuilder.service;

import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.FavoriteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The rules about saving favorites, with the repository mocked out.
 *
 * No database runs during this test. That is the point of having a service
 * layer that knows no SQL.
 */
class FavoriteServiceTest {

    /** The id database/migrations/V2__demo_user.sql creates. */
    private static final long DEMO_USER_ID = 1L;

    private FavoriteRepository repository;
    private FavoriteService service;

    @BeforeEach
    void setUp() {
        repository = mock(FavoriteRepository.class);
        service = new FavoriteService(repository);
    }

    @Test
    void savingPassesTheRecipeAndTheDemoUserToTheRepository() {
        service.add(new FavoriteRequest(716429L, "Pasta", "http://img/1.jpg"));

        ArgumentCaptor<Long> userId = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<FavoriteRequest> saved = ArgumentCaptor.forClass(FavoriteRequest.class);
        verify(repository).save(userId.capture(), saved.capture());

        assertThat(userId.getValue()).isEqualTo(DEMO_USER_ID);
        assertThat(saved.getValue().id()).isEqualTo(716429L);
    }

    @Test
    void listingAsksForTheDemoUsersFavorites() {
        when(repository.findForUser(DEMO_USER_ID))
                .thenReturn(List.of(new FavoriteDto(716429L, "Pasta", null)));

        assertThat(service.list()).hasSize(1);
        verify(repository).findForUser(DEMO_USER_ID);
    }

    @Test
    void removingPassesTheDemoUserAndTheSpoonacularId() {
        service.remove(716429L);

        verify(repository).remove(DEMO_USER_ID, 716429L);
    }

    @Test
    void refusesARecipeWithNoTitle() {
        // Spoonacular's payload is not guaranteed. A blank row would sit on the
        // favorites page forever as a card nobody can identify.
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.add(new FavoriteRequest(716429L, "  ", null)));

        verify(repository, never()).save(anyLong(), any());
    }

    @Test
    void refusesARecipeWithNoId() {
        // An id of 0 or less cannot be looked up again.
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.add(new FavoriteRequest(0L, "Pasta", null)));

        verify(repository, never()).save(anyLong(), any());
    }

    @Test
    void refusesNothingAtAll() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.add(null));

        verify(repository, never()).save(anyLong(), any());
    }

    @Test
    void refusesToRemoveWithNoId() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.remove(0L));

        verify(repository, never()).remove(anyLong(), anyLong());
    }
}
