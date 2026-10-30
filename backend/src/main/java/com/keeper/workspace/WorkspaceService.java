package com.keeper.workspace;

import com.keeper.auth.TokenService;
import com.keeper.category.DefaultCategories;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.common.exception.ForbiddenException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.security.MembershipCache;
import com.keeper.security.Role;
import jakarta.inject.Singleton;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Singleton
public class WorkspaceService {
  private final WorkspaceRepository workspaces;
  private final DefaultCategories defaults;
  private final MembershipCache cache;
  private final Db db;
  private final SecureRandom random = new SecureRandom();

  public WorkspaceService(
      WorkspaceRepository workspaces, DefaultCategories defaults, MembershipCache cache, Db db) {
    this.workspaces = workspaces;
    this.defaults = defaults;
    this.cache = cache;
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
    workspaces.rename(ws, name, currency.toUpperCase());
    return workspaces.find(ws, userId).orElseThrow();
  }

  public void delete(UUID ws) {
    workspaces.delete(ws);
    cache.evictWorkspace(ws);
  }

  // ---- members ----

  public List<WorkspaceRepository.Member> members(UUID ws) {
    return workspaces.members(ws);
  }

  public void changeRole(UUID ws, UUID target, Role role) {
    guardLastOwner(ws, target, role);
    if (workspaces.setRole(ws, target, role) == 0) {
      throw new ResourceNotFoundException("Member", target.toString());
    }
    cache.evict(target, ws);
  }

  /** Owners can remove anyone; any member may remove themselves (leave). */
  public void removeMember(UUID ws, UUID target) {
    guardLastOwner(ws, target, null);
    if (workspaces.removeMember(ws, target) == 0) {
      throw new ResourceNotFoundException("Member", target.toString());
    }
    cache.evict(target, ws);
  }

  public void leave(UUID ws, UUID userId) {
    if (workspaces.roleOf(ws, userId).isEmpty()) {
      throw new ResourceNotFoundException("Workspace", ws.toString());
    }
    removeMember(ws, userId);
  }

  private void guardLastOwner(UUID ws, UUID target, Role newRole) {
    boolean demoting = newRole != Role.OWNER;
    boolean isOwner = workspaces.roleOf(ws, target).filter(r -> r == Role.OWNER).isPresent();
    if (isOwner && demoting && workspaces.ownerCount(ws) <= 1) {
      throw new BusinessRuleException("A workspace needs at least one owner");
    }
  }

  // ---- invites ----

  /** Returns the raw invite token; only its hash is stored. */
  public String invite(UUID ws, UUID by, Role role) {
    if (role == Role.OWNER) {
      throw new BadRequestException("Invite as EDITOR or VIEWER");
    }
    byte[] raw = new byte[24];
    random.nextBytes(raw);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    workspaces.insertInvite(
        ws, role, TokenService.hash(token), Instant.now().plus(Duration.ofDays(7)), by);
    return token;
  }

  public Workspace accept(String token, UUID userId) {
    var invite =
        workspaces
            .claimInvite(TokenService.hash(token))
            .orElseThrow(() -> new ForbiddenException("Invite is invalid or expired"));
    workspaces.addMember(invite.workspaceId(), userId, invite.role());
    cache.evict(userId, invite.workspaceId());
    return workspaces.find(invite.workspaceId(), userId).orElseThrow();
  }
}
