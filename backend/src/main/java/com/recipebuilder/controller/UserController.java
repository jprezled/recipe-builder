package com.recipebuilder.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recipebuilder.dto.PantryRequest; // Create this or use a String/DTO payload
import com.recipebuilder.dto.SignUpRequest;
import com.recipebuilder.dto.UserDto;
import com.recipebuilder.service.UserService;

/**
 * Creating an account and managing user pantry data.
 *
 * Unpacks the request and hands it to the service. No rules live here - see
 * UserService for those.
 */
@RestController
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    /** 201 rather than 200: this call creates something that did not exist. */
    @PostMapping("/api/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto signUp(@RequestBody SignUpRequest request) {
        return service.signUp(request);
    }

    /** GET endpoint to read the user's pantry data. */
    @GetMapping("/api/users/{userId}/pantry")
    public String getPantry(@PathVariable Long userId) {
        return service.getPantry(userId);
    }

    /** PUT endpoint to write/update the user's pantry data. */
    @PutMapping("/api/users/{userId}/pantry")
    public void updatePantry(@PathVariable Long userId, @RequestBody PantryRequest request) {
        service.updatePantry(userId, request.getPantry());
    }
}