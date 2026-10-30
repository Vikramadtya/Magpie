package com.keeper.workspace;

import com.keeper.category.DefaultCategories;
import com.keeper.common.db.Db;
import com.keeper.security.MembershipCache;
import com.keeper.transaction.NormalisationService;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.UUID;

/** Each user has one personal ledger, created at sign-up. It is only theirs. */
@Singleton
public class WorkspaceService {
  private final WorkspaceRepository workspaces;
  private final DefaultCategories defaults;
  private final MembershipCache cache;
  private final NormalisationService normalisation;
  private final Db db;

  public WorkspaceService(
      WorkspaceRepository workspaces,
      DefaultCategories defaults,
      MembershipCache cache,
      NormalisationService normalisation,
      Db db) {
    this.workspaces = workspaces;
    this.defaults = defaults;
    this.cache = cache;
    this.normalisation = normalisation;
    this.db = db;
  }

  public List<Workspace> list(UUID userId) {
    return workspaces.findForUser(userId);
  }

  public Workspace create(UUID userId, String name, String currency) {
    UUID id =
        db.tx(
            () -> {
              UUID created = workspaces.insert(name, currency.toUpperCase(), userId);
              defaults.seed(created);
              return created;
            });
    return workspaces.find(id, userId).orElseThrow();
  }

  public Workspace rename(UUID ws, UUID userId, String name, String currency) {
    String before = workspaces.find(ws, userId).map(Workspace::baseCurrency).orElse(null);
    workspaces.rename(ws, name, currency.toUpperCase());
    if (before != null && !before.equalsIgnoreCase(currency)) {
      normalisation.recompute(ws);
    }
    return workspaces.find(ws, userId).orElseThrow();
  }

  public void delete(UUID ws) {
    workspaces.delete(ws);
    cache.evictWorkspace(ws);
  }
}
