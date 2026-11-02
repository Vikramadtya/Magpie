package com.keeper.auth;

import com.keeper.common.exception.TooManyRequestsException;
import jakarta.inject.Singleton;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down password guessing against one account, whichever address the guesses come from (the
 * per-address limit alone can be sidestepped). Five wrong passwords lock the email for 15 minutes.
 */
@Singleton
public class LoginThrottle {
  static final int MAX_FAILURES = 5;
  static final long WINDOW_MS = 15 * 60_000L;

  private record Failures(long since, int count) {}

  private final ConcurrentHashMap<String, Failures> byEmail = new ConcurrentHashMap<>();

  /** Throws when this email is currently locked. */
  public void check(String email, long now) {
    Failures f = byEmail.get(key(email));
    if (f != null && now - f.since() <= WINDOW_MS && f.count() >= MAX_FAILURES) {
      throw new TooManyRequestsException("Too many attempts. Try again in a few minutes.");
    }
  }

  public void failed(String email, long now) {
    byEmail.merge(
        key(email),
        new Failures(now, 1),
        (old, fresh) ->
            now - old.since() > WINDOW_MS ? fresh : new Failures(old.since(), old.count() + 1));
    if (byEmail.size() > 10_000)
      byEmail.entrySet().removeIf(e -> now - e.getValue().since() > WINDOW_MS);
  }

  public void succeeded(String email) {
    byEmail.remove(key(email));
  }

  private static String key(String email) {
    return email.trim().toLowerCase(java.util.Locale.ROOT);
  }
}
