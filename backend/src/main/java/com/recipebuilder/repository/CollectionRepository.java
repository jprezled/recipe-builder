package com.recipebuilder.repository;

import com.recipebuilder.dto.CollectionDto;
import com.recipebuilder.exception.DatabaseUnavailableException;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * All the SQL for collections.
 *
 * Every statement is scoped to one user. The collection id arrives from the
 * browser and ids are sequential, so "the collection exists" is never enough:
 * it has to be this cook's.
 */
@Repository
public class CollectionRepository {

    private final JdbcTemplate db;

    public CollectionRepository(JdbcTemplate db) {
        this.db = db;
    }

    /** @return one cook's collections, newest created first */
    public List<CollectionDto> findForUser(long userId) {
        String sql = "SELECT collection_id, name FROM collections "
                + "WHERE user_id = ? "
                + "ORDER BY created_at DESC, collection_id DESC";

        try {
            return db.query(sql, new CollectionRowMapper(), userId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /** @return the created collection, with the id the database gave it */
    public CollectionDto create(long userId, String name) {
        String sql = "INSERT INTO collections (user_id, name) VALUES (?, ?) "
                + "RETURNING collection_id";

        try {
            Long id = db.queryForObject(sql, Long.class, userId, name);
            return new CollectionDto(id, name);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * Renames one collection.
     *
     * The user_id clause is the whole of the security: without it any cook
     * could rename any other cook's collection by sending a different number.
     *
     * @return rows changed - 0 when it does not exist or is not theirs
     */
    public int rename(long userId, long collectionId, String name) {
        String sql = "UPDATE collections SET name = ? "
                + "WHERE collection_id = ? AND user_id = ?";

        try {
            return db.update(sql, name, collectionId, userId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * Deletes one collection. Its recipes stay saved and become loose, because
     * the column is ON DELETE SET NULL.
     *
     * @return rows changed - 0 when it does not exist or is not theirs
     */
    public int delete(long userId, long collectionId) {
        String sql = "DELETE FROM collections WHERE collection_id = ? AND user_id = ?";

        try {
            return db.update(sql, collectionId, userId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /** @return whether this collection exists and belongs to this cook */
    public boolean isOwnedBy(long userId, long collectionId) {
        String sql = "SELECT count(*) FROM collections WHERE collection_id = ? AND user_id = ?";

        try {
            Integer found = db.queryForObject(sql, Integer.class, collectionId, userId);
            return found != null && found > 0;
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    private RuntimeException asOurs(DataAccessException failure) {
        return new DatabaseUnavailableException("Could not reach the database.", failure);
    }
}
