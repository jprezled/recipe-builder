package com.recipebuilder.controller;

import com.recipebuilder.dto.RatingDto;
import com.recipebuilder.dto.RatingSummaryDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.service.RatingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RB-297 / RB-294: the three rating addresses, with the service mocked.
 *
 * The signed-in cook is simulated with .sessionAttr("userId", 7L), the same
 * attribute sign-in writes, so these need none of the sign-in code.
 */
@WebMvcTest(RatingController.class)
class RatingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RatingService service;

    @Test
    void readingARatingNeedsNoSignIn() throws Exception {
        when(service.get(null, 42L)).thenReturn(new RatingDto(4.2, 18, null));

        mockMvc.perform(get("/api/recipes/42/rating")).andExpect(status().isOk()).andExpect(jsonPath("$.average").value(4.2)).andExpect(jsonPath("$.count").value(18)).andExpect(jsonPath("$.yourRating").doesNotExist());
    }

    @Test
    void aSignedInCookSeesTheirOwnRatingToo() throws Exception {
        when(service.get(7L, 42L)).thenReturn(new RatingDto(4.2, 18, 5));

        mockMvc.perform(get("/api/recipes/42/rating").sessionAttr("userId", 7L)).andExpect(status().isOk()).andExpect(jsonPath("$.yourRating").value(5));
    }

    @Test
    void submittingARatingAnswersWithTheNewAverage() throws Exception {
        when(service.submit(7L, 42L, 4)).thenReturn(new RatingDto(4.0, 1, 4));

        mockMvc.perform(post("/api/recipes/42/rating").sessionAttr("userId", 7L).contentType(MediaType.APPLICATION_JSON).content("{\"rating\":4}")).andExpect(status().isOk()).andExpect(jsonPath("$.average").value(4.0)).andExpect(jsonPath("$.count").value(1)).andExpect(jsonPath("$.yourRating").value(4));
    }

    @Test
    void submittingWhileSignedOutIs401WithTheAgreedSentence() throws Exception {
        mockMvc.perform(post("/api/recipes/42/rating").contentType(MediaType.APPLICATION_JSON).content("{\"rating\":4}")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Please sign in to save favorites."));

        verify(service, never()).submit(anyLong(), anyLong(), anyInt());
    }

    @Test
    void anOutOfRangeRatingIs400WithTheAgreedSentence() throws Exception {
        when(service.submit(7L, 42L, 9)).thenThrow(new InvalidInputException("Please choose a rating from 1 to 5 stars."));

        mockMvc.perform(post("/api/recipes/42/rating").sessionAttr("userId", 7L).contentType(MediaType.APPLICATION_JSON).content("{\"rating\":9}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Please choose a rating from 1 to 5 stars."));
    }

    @Test
    void theBulkAddressAnswersOneSummaryPerId() throws Exception {
        when(service.summaries(List.of(12345L, 67890L))).thenReturn(List.of(new RatingSummaryDto(12345L, 4.2, 18), new RatingSummaryDto(67890L, 0, 0)));

        mockMvc.perform(get("/api/recipes/ratings").param("ids", "12345,67890")).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(12345)).andExpect(jsonPath("$[0].average").value(4.2)).andExpect(jsonPath("$[0].count").value(18)).andExpect(jsonPath("$[1].count").value(0));
    }

    @Test
    void theBulkAddressCarriesNoRatingOfTheCallers() throws Exception {
        when(service.summaries(List.of(1L))).thenReturn(List.of(new RatingSummaryDto(1L, 4.0, 1)));

        mockMvc.perform(get("/api/recipes/ratings").param("ids", "1").sessionAttr("userId", 7L)).andExpect(jsonPath("$[0].yourRating").doesNotExist());
    }
}
