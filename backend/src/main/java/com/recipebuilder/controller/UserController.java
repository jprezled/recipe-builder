package com.recipebuilder.controller;
//for RB-159
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recipebuilder.dto.SignUpRequest;
import com.recipebuilder.dto.UserDto;
import com.recipebuilder.service.UserService;

/**
 * Creating an account.
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
}
