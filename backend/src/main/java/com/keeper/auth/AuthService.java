package com.keeper.auth;

import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.ConflictException;
import com.keeper.common.exception.UnauthorizedException;
import com.keeper.workspace.WorkspaceService;
import jakarta.inject.Singleton;
import java.util.Locale;
import java.util.UUID;
import org.mindrot.jbcrypt.BCrypt;

@Singleton
public class AuthService {
  // Compared against when the email is unknown so response time doesn't reveal which emails exist.
  private static final String DUMMY_HASH = BCrypt.hashpw("not-a-real-password", BCrypt.gensalt(12));

  private final UserRepository users;
  private final WorkspaceService workspaces;
  private final TokenService tokens;
  private final Db db;

  public AuthService(
      UserRepository users, WorkspaceService workspaces, TokenService tokens, Db db) {
    this.users = users;
    this.workspaces = workspaces;
    this.tokens = tokens;
    this.db = db;
  }

  public User register(String email, String password, String name, String currency) {
    String normalized = email.trim().toLowerCase(Locale.ROOT);
    if (password.length() < 8 || password.length() > 72) {
      throw new BadRequestException("Password must be 8-72 characters");
    }
    if (users.findByEmail(normalized).isPresent()) {
      throw new ConflictException("Email already registered");
    }
    return db.tx(
        () -> {
          User user = users.insert(normalized, name, BCrypt.hashpw(password, BCrypt.gensalt(12)));
          workspaces.create(user.id(), "Personal", currency == null ? "USD" : currency);
          return user;
        });
  }

  public User authenticate(String email, String password) {
    User user = users.findByEmail(email.trim()).orElse(null);
    String hash = user == null || user.passwordHash() == null ? DUMMY_HASH : user.passwordHash();
    boolean ok = BCrypt.checkpw(password, hash);
    if (user == null || !ok) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return user;
  }

  /** Called after Google sign-in; links by verified email, creating the account on first use. */
  public User findOrCreateOauthUser(String email, String name) {
    String normalized = email.trim().toLowerCase(Locale.ROOT);
    return users
        .findByEmail(normalized)
        .orElseGet(
            () ->
                db.tx(
                    () -> {
                      // random password hash: Google-only accounts cannot sign in with a password
                      User user =
                          users.insert(
                              normalized,
                              name,
                              BCrypt.hashpw(UUID.randomUUID().toString(), BCrypt.gensalt(12)));
                      workspaces.create(user.id(), "Personal", "USD");
                      return user;
                    }));
  }

  public TokenService.Pair startSession(User user) {
    return tokens.issue(user);
  }
}
