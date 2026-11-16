package com.recipebuilder.service;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.recipebuilder.model.PantryItem;
import com.recipebuilder.repository.PantryRepository;

/**
 * The rule about adding to a pantry, with the repository mocked out - no
 * database here.
 */
class PantryServiceTest {

    private static final long A_COOK = 7L;

    private PantryRepository repository;
    private PantryService service;

    @BeforeEach
    void setUp() {
        repository = mock(PantryRepository.class);
        service = new PantryService(repository);
    }

    @Test
    void aNewItemIsStoredAndComesBack() {
        when(repository.findByUserIdAndPantryIgnoreCase(A_COOK, "garlic"))
                .thenReturn(Optional.empty());
        when(repository.save(A_COOK, "garlic"))
                .thenReturn(new PantryItem(1L, A_COOK, "garlic"));

        PantryItem saved = service.savePantryItem(A_COOK, "garlic");

        assertThat(saved.getPantry()).isEqualTo("garlic");
        assertThat(saved.getUserId()).isEqualTo(A_COOK);
    }

    @Test
    void addingSomethingAlreadyThereIsRefusedWithoutWriting() {
        when(repository.findByUserIdAndPantryIgnoreCase(A_COOK, "garlic"))
                .thenReturn(Optional.of(new PantryItem(1L, A_COOK, "garlic")));

        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> service.savePantryItem(A_COOK, "garlic"))
                .withMessage("Item already exists in your pantry.");

        verify(repository, never()).save(A_COOK, "garlic");
    }

    @Test
    void theDuplicateCheckIsMadeAgainstThisCookOnly() {
        when(repository.findByUserIdAndPantryIgnoreCase(A_COOK, "garlic"))
                .thenReturn(Optional.empty());
        when(repository.save(A_COOK, "garlic"))
                .thenReturn(new PantryItem(1L, A_COOK, "garlic"));

        service.savePantryItem(A_COOK, "garlic");

        // Another cook having garlic must not block this one, so the lookup
        // has to carry the cook's id rather than search the whole table.
        verify(repository).findByUserIdAndPantryIgnoreCase(A_COOK, "garlic");
    }
}
