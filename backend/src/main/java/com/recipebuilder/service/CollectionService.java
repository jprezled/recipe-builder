package com.recipebuilder.service;

import com.recipebuilder.dto.CollectionDto;
import com.recipebuilder.exception.CollectionNameTakenException;
import com.recipebuilder.exception.CollectionNotFoundException;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.CollectionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/** RB-210: the rules about collection names. */
@Service
public class CollectionService {

    /** The agreed wording, from docs/error-shape.md. Change it there first. */
    public static final String NAME_REQUIRED = "Please give the collection a name.";
    public static final String NAME_TOO_LONG =
            "That collection name is too long. Please use 50 characters or fewer.";
    public static final String NAME_TAKEN = "You already have a collection with that name.";
    public static final String NOT_FOUND = "That collection could not be found.";

    private static final int LONGEST_NAME = 50;

    private final CollectionRepository repository;

    public CollectionService(CollectionRepository repository) {
        this.repository = repository;
    }

    public List<CollectionDto> list(long userId) {
        return repository.findForUser(userId);
    }

    public CollectionDto create(long userId, String name) {
        String cleaned = validName(name);
        refuseDuplicate(userId, cleaned, -1L);

        return repository.create(userId, cleaned);
    }

    public void rename(long userId, long collectionId, String name) {
        String cleaned = validName(name);
        refuseDuplicate(userId, cleaned, collectionId);

        int rowsChanged = repository.rename(userId, collectionId, cleaned);

        if (rowsChanged == 0) {
            throw new CollectionNotFoundException(NOT_FOUND);
        }
    }

    public void delete(long userId, long collectionId) {
        int rowsChanged = repository.delete(userId, collectionId);

        if (rowsChanged == 0) {
            throw new CollectionNotFoundException(NOT_FOUND);
        }
    }

    /** Blank, then length, in that order, so each gets its own sentence. */
    private String validName(String name) {
        String cleaned = name == null ? "" : name.trim();

        if (cleaned.isEmpty()) {
            throw new InvalidInputException(NAME_REQUIRED);
        }

        if (cleaned.length() > LONGEST_NAME) {
            throw new InvalidInputException(NAME_TOO_LONG);
        }

        return cleaned;
    }

    /**
     * Checked here as well as by UNIQUE (user_id, name), because the constraint
     * is case-sensitive: "breakfast" and "Breakfast" would both be stored and
     * give two decks the cook cannot tell apart.
     *
     * @param ownId the collection being renamed, which is allowed to keep (or
     *              re-case) its own name. -1 when creating.
     */
    private void refuseDuplicate(long userId, String cleaned, long ownId) {
        List<CollectionDto> existing = repository.findForUser(userId);

        for (CollectionDto other : existing) {
            if (other.id() != ownId && other.name().equalsIgnoreCase(cleaned)) {
                throw new CollectionNameTakenException(NAME_TAKEN);
            }
        }
    }
}
