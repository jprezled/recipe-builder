package com.recipebuilder.service;

import com.recipebuilder.dto.CollectionDto;
import com.recipebuilder.exception.CollectionNameTakenException;
import com.recipebuilder.exception.CollectionNotFoundException;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.CollectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The collection name rules, with the repository mocked out. */
class CollectionServiceTest {

    private static final long A_USER = 7L;

    private CollectionRepository repository;
    private CollectionService service;

    @BeforeEach
    void setUp() {
        repository = mock(CollectionRepository.class);
        service = new CollectionService(repository);
        when(repository.findForUser(A_USER)).thenReturn(List.of());
        when(repository.create(anyLong(), anyString()))
                .thenReturn(new CollectionDto(1L, "Breakfast"));
    }

    @Test
    void aNameIsTrimmedBeforeItIsStored() {
        service.create(A_USER, "  Breakfast  ");

        verify(repository).create(A_USER, "Breakfast");
    }

    @Test
    void aBlankNameIsRefused() {
        for (String blank : new String[] {"", "   ", null}) {
            assertThatExceptionOfType(InvalidInputException.class)
                    .isThrownBy(() -> service.create(A_USER, blank))
                    .withMessage("Please give the collection a name.");
        }

        verify(repository, never()).create(anyLong(), anyString());
    }

    @Test
    void aNameOfExactlyFiftyCharactersIsAccepted() {
        service.create(A_USER, "x".repeat(50));

        verify(repository).create(A_USER, "x".repeat(50));
    }

    @Test
    void aNameLongerThanFiftyIsRefused() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.create(A_USER, "x".repeat(51)))
                .withMessage("That collection name is too long. Please use 50 characters or fewer.");

        verify(repository, never()).create(anyLong(), anyString());
    }

    @Test
    void aDuplicateNameIsRefused() {
        when(repository.findForUser(A_USER)).thenReturn(List.of(new CollectionDto(1L, "Breakfast")));

        assertThatExceptionOfType(CollectionNameTakenException.class)
                .isThrownBy(() -> service.create(A_USER, "Breakfast"))
                .withMessage("You already have a collection with that name.");
    }

    @Test
    void aDuplicateNameDifferingOnlyInCaseIsRefused() {
        when(repository.findForUser(A_USER)).thenReturn(List.of(new CollectionDto(1L, "Breakfast")));

        assertThatExceptionOfType(CollectionNameTakenException.class)
                .isThrownBy(() -> service.create(A_USER, "breakfast"));

        verify(repository, never()).create(anyLong(), anyString());
    }

    @Test
    void aDuplicateNameDifferingOnlyInSpaceIsRefused() {
        when(repository.findForUser(A_USER)).thenReturn(List.of(new CollectionDto(1L, "Breakfast")));

        assertThatExceptionOfType(CollectionNameTakenException.class)
                .isThrownBy(() -> service.create(A_USER, " Breakfast "));
    }

    @Test
    void renamingWritesTheTrimmedName() {
        when(repository.rename(A_USER, 3L, "Brunch")).thenReturn(1);

        service.rename(A_USER, 3L, " Brunch ");

        verify(repository).rename(A_USER, 3L, "Brunch");
    }

    @Test
    void renamingToAnotherOfTheirNamesIsRefused() {
        when(repository.findForUser(A_USER)).thenReturn(List.of(
                new CollectionDto(3L, "Brunch"), new CollectionDto(4L, "Dinner")));

        assertThatExceptionOfType(CollectionNameTakenException.class)
                .isThrownBy(() -> service.rename(A_USER, 3L, "dinner"));

        verify(repository, never()).rename(anyLong(), anyLong(), anyString());
    }

    @Test
    void renamingACollectionToItsOwnNameIsNotADuplicate() {
        when(repository.findForUser(A_USER)).thenReturn(List.of(new CollectionDto(3L, "Brunch")));
        when(repository.rename(A_USER, 3L, "BRUNCH")).thenReturn(1);

        service.rename(A_USER, 3L, "BRUNCH");

        verify(repository).rename(A_USER, 3L, "BRUNCH");
    }

    @Test
    void renamingACollectionThatIsNotTheirsIsRefused() {
        when(repository.rename(A_USER, 99L, "Brunch")).thenReturn(0);

        assertThatExceptionOfType(CollectionNotFoundException.class)
                .isThrownBy(() -> service.rename(A_USER, 99L, "Brunch"))
                .withMessage("That collection could not be found.");
    }

    @Test
    void deletingACollectionThatIsNotTheirsIsRefused() {
        when(repository.delete(A_USER, 99L)).thenReturn(0);

        assertThatExceptionOfType(CollectionNotFoundException.class)
                .isThrownBy(() -> service.delete(A_USER, 99L))
                .withMessage("That collection could not be found.");
    }

    @Test
    void listingAsksForThatCooksCollections() {
        when(repository.findForUser(A_USER)).thenReturn(List.of(new CollectionDto(1L, "Breakfast")));

        assertThat(service.list(A_USER)).hasSize(1);
    }
}
