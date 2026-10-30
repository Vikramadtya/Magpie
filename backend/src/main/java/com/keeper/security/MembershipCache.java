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

  /** A user's role in a workspace, and whether it is a personal or household (view-only) ledger. */
  public record Membership(Role role, String kind) {}

  private record Entry(Optional<Membership> membership, long expiresAt) {}

  private final ConcurrentHashMap<Key, Entry> cache = new ConcurrentHashMap<>();
  private final Db db;

  public MembershipCache(Db db) {
    this.db = db;
  }

  public Optional<Role> roleOf(UUID userId, UUID workspaceId) {
    return membership(userId, workspaceId).map(Membership::role);
  }

  public Optional<Membership> membership(UUID userId, UUID workspaceId) {
    Key key = new Key(userId, workspaceId);
    long now = System.nanoTime();
    Entry hit = cache.get(key);
    if (hit != null && hit.expiresAt > now) {
      return hit.membership;
    }
    Optional<Membership> membership =
        db.one(
            "SELECT m.role, w.kind FROM workspace_members m JOIN workspaces w ON w.id = m.workspace_id "
                + "WHERE m.workspace_id = ? AND m.user_id = ?",
            rs -> new Membership(Role.valueOf(rs.getString(1)), rs.getString(2)),
            workspaceId,
            userId);
    cache.put(key, new Entry(membership, now + TTL_NANOS));
    return membership;
  }

  public void evict(UUID userId, UUID workspaceId) {
    cache.remove(new Key(userId, workspaceId));
  }

  public void evictWorkspace(UUID workspaceId) {
    cache.keySet().removeIf(k -> k.workspaceId.equals(workspaceId));
  }
}
