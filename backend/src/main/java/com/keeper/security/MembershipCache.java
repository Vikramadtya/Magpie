package com.keeper.security;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Short-lived cache of (user, workspace) -> role so the access filter avoids a query per call. */
@Singleton
public class MembershipCache {
  private static final long TTL_NANOS = Duration.ofSeconds(30).toNanos();

  private record Key(UUID userId, UUID workspaceId) {}

  private record Entry(Optional<Role> role, long expiresAt) {}

  private final ConcurrentHashMap<Key, Entry> cache = new ConcurrentHashMap<>();
  private final Db db;

  public MembershipCache(Db db) {
    this.db = db;
  }

  public Optional<Role> roleOf(UUID userId, UUID workspaceId) {
    Key key = new Key(userId, workspaceId);
    long now = System.nanoTime();
    Entry hit = cache.get(key);
    if (hit != null && hit.expiresAt > now) {
      return hit.role;
    }
    Optional<Role> role =
        db.one(
            "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            rs -> Role.valueOf(rs.getString(1)),
            workspaceId,
            userId);
    cache.put(key, new Entry(role, now + TTL_NANOS));
    return role;
  }

  public void evictWorkspace(UUID workspaceId) {
    cache.keySet().removeIf(k -> k.workspaceId.equals(workspaceId));
  }
}
