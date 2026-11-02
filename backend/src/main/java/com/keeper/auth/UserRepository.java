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

  public boolean isEmailVerified(UUID id) {
    return db.count("SELECT count(*) FROM users WHERE id = ? AND email_verified", id) > 0;
  }

  /**
   * Takes over an account whose email was never proved: the old password (which someone else may
   * have chosen) stops working, every session is ended, and the email counts as verified.
   */
  public void claimUnverified(UUID id, String newPasswordHash) {
    db.tx(
        () -> {
          db.update(
              "UPDATE users SET password_hash = ?, email_verified = TRUE WHERE id = ?",
              newPasswordHash,
              id);
          db.update(
              "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL",
              id);
        });
  }

  public User insert(String email, String name, String passwordHash, boolean emailVerified) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO users(id, email, name, password_hash, email_verified) VALUES (?, ?, ?, ?, ?)",
        id,
        email,
        name,
        passwordHash,
        emailVerified);
    return new User(id, email, name, passwordHash);
  }
}
