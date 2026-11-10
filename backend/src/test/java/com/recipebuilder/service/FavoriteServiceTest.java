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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The rules about saving favorites, with the repository mocked out.
 *
 * No database runs during this test. That is the point of having a service
 * layer that knows no SQL.
 */
class FavoriteServiceTest {

    /** Any user id. The point of this subtask is that it is not fixed. */
    private static final long A_USER = 7L;

    private FavoriteRepository repository;
    private FavoriteService service;

    @BeforeEach
    void setUp() {
        repository = mock(FavoriteRepository.class);
        service = new FavoriteService(repository);
    }

    @Test
    void savingPassesTheRecipeAndTheGivenUserToTheRepository() {
        service.add(A_USER, new FavoriteRequest(716429L, "Pasta", "http://img/1.jpg"));

        ArgumentCaptor<Long> userId = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<FavoriteRequest> saved = ArgumentCaptor.forClass(FavoriteRequest.class);
        verify(repository).save(userId.capture(), saved.capture());

        assertThat(userId.getValue()).isEqualTo(A_USER);
        assertThat(saved.getValue().id()).isEqualTo(716429L);
    }

    @Test
    void listingAsksForThatUsersFavorites() {
        when(repository.findForUser(A_USER))
                .thenReturn(List.of(new FavoriteDto(716429L, "Pasta", null, null)));

        assertThat(service.list(A_USER)).hasSize(1);
        verify(repository).findForUser(A_USER);
    }

    @Test
    void removingPassesThatUserAndTheSpoonacularId() {
        service.remove(A_USER, 716429L);

        verify(repository).remove(A_USER, 716429L);
    }

    @Test
    void refusesARecipeWithNoTitle() {
        // Spoonacular's payload is not guaranteed. A blank row would sit on the
        // favorites page forever as a card nobody can identify.
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.add(A_USER, new FavoriteRequest(716429L, "  ", null)));

        verify(repository, never()).save(anyLong(), any());
    }

    @Test
    void refusesARecipeWithNoId() {
        // An id of 0 or less cannot be looked up again.
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.add(A_USER, new FavoriteRequest(0L, "Pasta", null)));

        verify(repository, never()).save(anyLong(), any());
    }

    @Test
    void refusesNothingAtAll() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.add(A_USER, null));

        verify(repository, never()).save(anyLong(), any());
    }

    @Test
    void refusesToRemoveWithNoId() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.remove(A_USER, 0L));

        verify(repository, never()).remove(anyLong(), anyLong());
    }

    @Test
    void twoDifferentUsersEachReachTheRepositoryAsThemselves() {
        service.add(7L, new FavoriteRequest(1111L, "Mine", null));
        service.add(8L, new FavoriteRequest(2222L, "Yours", null));

        verify(repository).save(eq(7L), any(FavoriteRequest.class));
        verify(repository).save(eq(8L), any(FavoriteRequest.class));
    }

    // RB-205: notes ------------------------------------------------------

    @Test
    void aNoteIsWrittenForTheSignedInCook() {
        when(repository.saveNote(A_USER, 660101L, "double the garlic")).thenReturn(1);

        service.saveNote(A_USER, 660101L, "double the garlic");

        verify(repository).saveNote(A_USER, 660101L, "double the garlic");
    }

    /**
     * Clearing a note and never writing one must end up the same in the
     * column, so the page has one empty case to render rather than two.
     */
    @Test
    void anEmptyNoteIsStoredAsNothingAtAll() {
        when(repository.saveNote(eq(A_USER), eq(660101L), isNull())).thenReturn(1);

        service.saveNote(A_USER, 660101L, "   ");

        verify(repository).saveNote(A_USER, 660101L, null);
    }

    @Test
    void surroundingSpaceIsTrimmedOffANote() {
        when(repository.saveNote(eq(A_USER), eq(660101L), anyString())).thenReturn(1);

        service.saveNote(A_USER, 660101L, "  used less salt  ");

        verify(repository).saveNote(A_USER, 660101L, "used less salt");
    }

    @Test
    void aNoteLongerThanTheLimitIsRefused() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.saveNote(A_USER, 660101L, "x".repeat(501)))
                .withMessage(FavoriteService.NOTE_TOO_LONG);

        verify(repository, never()).saveNote(anyLong(), anyLong(), anyString());
    }

    @Test
    void aNoteExactlyAtTheLimitIsAccepted() {
        when(repository.saveNote(eq(A_USER), eq(660101L), anyString())).thenReturn(1);

        service.saveNote(A_USER, 660101L, "x".repeat(500));

        verify(repository).saveNote(eq(A_USER), eq(660101L), anyString());
    }

    /**
     * The note hangs off the saved_recipes row. With no such row, accepting the
     * note would throw it away without telling the cook.
     */
    @Test
    void aNoteOnARecipeTheCookHasNotSavedIsRefused() {
        when(repository.saveNote(eq(A_USER), eq(660101L), anyString())).thenReturn(0);

        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.saveNote(A_USER, 660101L, "a note"))
                .withMessage(FavoriteService.NOT_SAVED);
    }
}
