package com.keeper.auth;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import jakarta.inject.Singleton;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class UserRepository {
  private static final RowMapper<User> MAPPER =
      rs ->
          new User(
              rs.getObject("id", UUID.class),
              rs.getString("email"),
              rs.getString("name"),
              rs.getString("password_hash"));

  private final Db db;

  public UserRepository(Db db) {
    this.db = db;
  }

  public Optional<User> findByEmail(String email) {
    return db.one(
        "SELECT id, email, name, password_hash FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL",
        MAPPER,
        email);
  }

  public Optional<User> findById(UUID id) {
    return db.one(
        "SELECT id, email, name, password_hash FROM users WHERE id = ? AND deleted_at IS NULL",
        MAPPER,
        id);
  }

  public User insert(String email, String name, String passwordHash) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO users(id, email, name, password_hash) VALUES (?, ?, ?, ?)",
        id,
        email,
        name,
        passwordHash);
    return new User(id, email, name, passwordHash);
  }
}
