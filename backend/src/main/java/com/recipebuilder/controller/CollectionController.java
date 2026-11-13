package com.recipebuilder.controller;

import com.recipebuilder.dto.CollectionDto;
import com.recipebuilder.dto.CollectionRequest;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.service.CollectionService;
import com.recipebuilder.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RB-210: the collection addresses.
 *
 *   GET    /api/collections        the signed-in cook's collections
 *   POST   /api/collections        make one
 *   PUT    /api/collections/{id}   rename one
 *   DELETE /api/collections/{id}   delete one (its recipes stay saved)
 *
 * Thin, like FavoriteController. No rules live here.
 */
@RestController
public class CollectionController {

    private final CollectionService service;

    public CollectionController(CollectionService service) {
        this.service = service;
    }

    @GetMapping("/api/collections")
    public List<CollectionDto> list(HttpServletRequest http) {
        return service.list(signedInUserId(http));
    }

    @PostMapping("/api/collections")
    @ResponseStatus(HttpStatus.CREATED)
    public CollectionDto create(@RequestBody CollectionRequest request, HttpServletRequest http) {
        return service.create(signedInUserId(http), request.name());
    }

    @PutMapping("/api/collections/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rename(@PathVariable long id,
                       @RequestBody CollectionRequest request,
                       HttpServletRequest http) {
        service.rename(signedInUserId(http), id, request.name());
    }

    @DeleteMapping("/api/collections/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id, HttpServletRequest http) {
        service.delete(signedInUserId(http), id);
    }

    /**
     * The twin of the one in FavoriteController. getSession(false) so a
     * signed-out visitor is not handed a session cookie.
     */
    private long signedInUserId(HttpServletRequest http) {
        HttpSession session = http.getSession(false);

        if (session == null || !(session.getAttribute(SessionController.USER_ID) instanceof Long id)) {
            throw new NotSignedInException(SessionService.NOT_SIGNED_IN);
        }

        return id;
    }
}
