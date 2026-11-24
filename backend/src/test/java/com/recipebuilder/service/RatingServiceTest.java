package com.recipebuilder.service;

import com.recipebuilder.dto.RatingDto;
import com.recipebuilder.dto.RatingSummaryDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.RatingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** RB-297 / RB-294: the rating rules, with the repository mocked out. */
class RatingServiceTest {

    private static final long A_USER = 7L;
    private static final long A_RECIPE = 716429L;

    private RatingRepository repository;
    private RatingService service;

    @BeforeEach
    void setUp() {
        repository = mock(RatingRepository.class);
        service = new RatingService(repository);
    }

    @Test
    void submittingSavesTheRatingAndAnswersWithTheNewAverage() {
        when(repository.aggregateFor(A_RECIPE)).thenReturn(new RatingSummaryDto(A_RECIPE, 4.0, 1));
        when(repository.yourRating(A_USER, A_RECIPE)).thenReturn(4);

        RatingDto answer = service.submit(A_USER, A_RECIPE, 4);

        verify(repository).upsert(A_USER, A_RECIPE, 4);
        assertThat(answer).isEqualTo(new RatingDto(4.0, 1, 4));
    }

    @Test
    void aRatingOfZeroIsRefusedWithTheAgreedSentence() {
        assertThatThrownBy(() -> service.submit(A_USER, A_RECIPE, 0)).isInstanceOf(InvalidInputException.class).hasMessage("Please choose a rating from 1 to 5 stars.");
        verify(repository, never()).upsert(anyLong(), anyLong(), anyInt());
    }

    @Test
    void aRatingOfSixIsRefused() {
        assertThatThrownBy(() -> service.submit(A_USER, A_RECIPE, 6)).isInstanceOf(InvalidInputException.class).hasMessage("Please choose a rating from 1 to 5 stars.");
        verify(repository, never()).upsert(anyLong(), anyLong(), anyInt());
    }

    @Test
    void theEdgesOneAndFiveAreAccepted() {
        when(repository.aggregateFor(A_RECIPE)).thenReturn(new RatingSummaryDto(A_RECIPE, 1.0, 1));

        service.submit(A_USER, A_RECIPE, 1);
        service.submit(A_USER, A_RECIPE, 5);

        verify(repository).upsert(A_USER, A_RECIPE, 1);
        verify(repository).upsert(A_USER, A_RECIPE, 5);
    }

    @Test
    void aSignedInCookGetsTheirOwnRatingAlongsideTheAverage() {
        when(repository.aggregateFor(A_RECIPE)).thenReturn(new RatingSummaryDto(A_RECIPE, 3.5, 2));
        when(repository.yourRating(A_USER, A_RECIPE)).thenReturn(5);

        assertThat(service.get(A_USER, A_RECIPE)).isEqualTo(new RatingDto(3.5, 2, 5));
    }

    @Test
    void aSignedOutVisitorGetsTheAverageAndNoRatingOfTheirOwn() {
        when(repository.aggregateFor(A_RECIPE)).thenReturn(new RatingSummaryDto(A_RECIPE, 3.5, 2));

        RatingDto answer = service.get(null, A_RECIPE);

        assertThat(answer).isEqualTo(new RatingDto(3.5, 2, null));
        verify(repository, never()).yourRating(anyLong(), anyLong());
    }

    @Test
    void theBulkLookupPassesStraightThrough() {
        List<RatingSummaryDto> summaries = List.of(new RatingSummaryDto(1L, 4.0, 3));
        when(repository.aggregatesFor(List.of(1L))).thenReturn(summaries);

        assertThat(service.summaries(List.of(1L))).isEqualTo(summaries);
    }
}
