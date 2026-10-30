package com.keeper.auth;

import com.keeper.common.exception.UnauthorizedException;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.token.generator.TokenGenerator;
import jakarta.inject.Singleton;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Issues short-lived access JWTs and rotating, single-use refresh tokens (stored hashed). */
@Singleton
public class TokenService {
  public static final Duration ACCESS_TTL = Duration.ofMinutes(15);
  public static final Duration REFRESH_TTL = Duration.ofDays(30);

  public record Pair(String accessToken, String refreshToken, int expiresIn) {}

  public record Rotated(User user, Pair pair) {}

  private final TokenGenerator generator;
  private final RefreshTokenRepository refreshTokens;
  private final UserRepository users;
  private final SecureRandom random = new SecureRandom();

  public TokenService(
      TokenGenerator generator, RefreshTokenRepository refreshTokens, UserRepository users) {
    this.generator = generator;
    this.refreshTokens = refreshTokens;
    this.users = users;
  }

  /** Starts a new session (new token family). */
  public Pair issue(User user) {
    return issue(user, UUID.randomUUID());
  }

  /** Exchanges a refresh token for a new pair. A replayed token revokes its whole family. */
  public Rotated rotate(String refreshToken) {
    var stored = refreshTokens.findByHash(hash(refreshToken)).orElseThrow(TokenService::invalid);
    if (stored.revoked()) {
      refreshTokens.revokeFamily(stored.familyId());
      throw invalid();
    }
    if (stored.expiresAt().isBefore(Instant.now()) || !refreshTokens.revoke(stored.id())) {
      throw invalid();
    }
    User user = users.findById(stored.userId()).orElseThrow(TokenService::invalid);
    return new Rotated(user, issue(user, stored.familyId()));
  }

  public void revoke(String refreshToken) {
    refreshTokens
        .findByHash(hash(refreshToken))
        .ifPresent(t -> refreshTokens.revokeFamily(t.familyId()));
  }

  private Pair issue(User user, UUID family) {
    Authentication auth =
        Authentication.build(
            user.id().toString(), List.of("ROLE_USER"), Map.of("email", user.email()));
    String access =
        generator
            .generateToken(auth, (int) ACCESS_TTL.toSeconds())
            .orElseThrow(() -> new IllegalStateException("Could not sign access token"));
    byte[] raw = new byte[32];
    random.nextBytes(raw);
    String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    refreshTokens.insert(user.id(), family, hash(refresh), Instant.now().plus(REFRESH_TTL));
    return new Pair(access, refresh, (int) ACCESS_TTL.toSeconds());
  }

  public static String hash(String token) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private static UnauthorizedException invalid() {
    return new UnauthorizedException("Invalid or expired session");
  }
}
