package com.recipebuilder.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SpoonacularSearchResponse(
        List<SpoonacularSearchResult> results
) {}