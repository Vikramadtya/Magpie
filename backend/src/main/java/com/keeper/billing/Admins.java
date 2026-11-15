package com.keeper.billing;

import com.keeper.auth.UserRepository;
import com.keeper.common.exception.ForbiddenException;
import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Who may manage codes and grant access: the emails in ADMIN_EMAILS (comma separated). */
@Singleton
public class Admins {
  private final UserRepository users;
  private final Set<String> emails;

  public Admins(UserRepository users, @Value("${keeper.admin.emails:}") String emails) {
    this.users = users;
    this.emails =
        Arrays.stream(emails.split(","))
            .map(e -> e.trim().toLowerCase())
            .filter(e -> !e.isEmpty())
            .collect(Collectors.toSet());
  }

  public boolean isAdmin(UUID userId) {
    return users.findById(userId).map(u -> emails.contains(u.email().toLowerCase())).orElse(false);
  }

  public void require(UUID userId) {
    if (!isAdmin(userId)) throw new ForbiddenException("Only an administrator can do this");
  }
}
