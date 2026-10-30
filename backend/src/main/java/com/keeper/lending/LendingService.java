package com.keeper.lending;

import com.keeper.account.Account;
import com.keeper.account.AccountRepository;
import com.keeper.audit.Audit;
import com.keeper.auth.User;
import com.keeper.auth.UserRepository;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.ConflictException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.person.PersonRepository;
import com.keeper.workspace.WorkspaceRepository;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.UUID;

/** Lending an account to someone: the owner invites, the guest accepts, the owner can end it. */
@Singleton
public class LendingService {
  private final ShareRepository shares;
  private final AccountRepository accounts;
  private final PersonRepository people;
  private final UserRepository users;
  private final WorkspaceRepository workspaces;
  private final Audit audit;
  private final Db db;

  public LendingService(
      ShareRepository shares,
      AccountRepository accounts,
      PersonRepository people,
      UserRepository users,
      WorkspaceRepository workspaces,
      Audit audit,
      Db db) {
    this.shares = shares;
    this.accounts = accounts;
    this.people = people;
    this.users = users;
    this.workspaces = workspaces;
    this.audit = audit;
    this.db = db;
  }

  public List<Share> sharesOf(UUID ws, UUID accountId) {
    return shares.forAccount(ws, accountId);
  }

  public Share lend(UUID ws, UUID actor, UUID accountId, String email) {
    Account account =
        accounts
            .find(ws, accountId)
            .orElseThrow(() -> new ResourceNotFoundException("Account", accountId.toString()));
    if (account.memo()) throw new BadRequestException("You can only lend your own accounts");
    String guest = email.trim().toLowerCase();
    if (guest.equalsIgnoreCase(userOf(actor).email())) {
      throw new BadRequestException("That is your own email");
    }
    if (shares.forAccount(ws, accountId).stream()
        .anyMatch(s -> s.guestEmail().equalsIgnoreCase(guest))) {
      throw new ConflictException("Already shared with " + guest);
    }
    UUID id = shares.insert(ws, accountId, guest);
    audit.record(ws, actor, "account", accountId, "LEND", guest);
    return shares.forAccount(ws, accountId).stream()
        .filter(s -> s.id().equals(id))
        .findFirst()
        .orElseThrow();
  }

  public void revoke(UUID ws, UUID actor, UUID shareId) {
    if (shares.revoke(ws, shareId) == 0) {
      throw new ResourceNotFoundException("Share", shareId.toString());
    }
    audit.record(ws, actor, "account_share", shareId, "REVOKE", "");
  }

  public List<Invitation> invitations(UUID userId) {
    return shares.invitationsFor(userOf(userId).email());
  }

  /** Puts a memo copy of the lent account into the guest's own ledger. */
  public Account accept(UUID userId, UUID shareId) {
    User user = userOf(userId);
    UUID accountId =
        db.tx(
                () -> {
                  var offer =
                      shares
                          .pendingOffer(shareId, user.email())
                          .orElseThrow(
                              () ->
                                  new ResourceNotFoundException("Invitation", shareId.toString()));
                  UUID guestWs =
                      workspaces.findForUser(userId).stream()
                          .findFirst()
                          .orElseThrow(() -> new BadRequestException("You have no ledger yet"))
                          .id();
                  String owner = offer.ownerName() == null ? "Someone" : offer.ownerName();
                  UUID memo =
                      accounts.insertMemo(
                          guestWs,
                          shortName(owner + "'s " + offer.accountName()),
                          offer.currency(),
                          shareId);
                  var person = people.upsert(offer.ownerWorkspaceId(), displayName(user));
                  shares.activate(shareId, userId, person.id());
                  audit.record(guestWs, userId, "account", memo, "ACCEPT_LENT", owner);
                  return new UUID[] {guestWs, memo};
                })[1];
    return workspaces.findForUser(userId).stream()
        .map(w -> accounts.find(w.id(), accountId))
        .flatMap(java.util.Optional::stream)
        .findFirst()
        .orElseThrow();
  }

  public void decline(UUID userId, UUID shareId) {
    var offer =
        shares
            .pendingOffer(shareId, userOf(userId).email())
            .orElseThrow(() -> new ResourceNotFoundException("Invitation", shareId.toString()));
    shares.decline(offer.id());
  }

  static String displayName(User user) {
    if (user.name() != null && !user.name().isBlank()) return user.name().trim();
    return user.email().substring(0, user.email().indexOf('@'));
  }

  private static String shortName(String s) {
    return s.length() <= 120 ? s : s.substring(0, 120);
  }

  private User userOf(UUID id) {
    return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", "me"));
  }
}
