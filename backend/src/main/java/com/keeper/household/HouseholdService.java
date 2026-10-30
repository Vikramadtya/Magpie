package com.keeper.household;

import com.keeper.auth.User;
import com.keeper.auth.UserRepository;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.ConflictException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.household.HouseholdRepository.HouseholdRow;
import com.keeper.household.HouseholdRepository.MemberRow;
import com.keeper.workspace.WorkspaceRepository;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.UUID;

/** Who is in a household and what they agree to share. Never touches anyone's ledger. */
@Singleton
public class HouseholdService {
  private final HouseholdRepository households;
  private final UserRepository users;
  private final WorkspaceRepository workspaces;
  private final Db db;

  public HouseholdService(
      HouseholdRepository households, UserRepository users, WorkspaceRepository workspaces, Db db) {
    this.households = households;
    this.users = users;
    this.workspaces = workspaces;
    this.db = db;
  }

  public List<Household> list(UUID userId) {
    User me = user(userId);
    return households.forUser(userId, me.email()).stream().map(h -> view(h, me)).toList();
  }

  public Household create(UUID userId, String name) {
    User me = user(userId);
    String currency =
        workspaces.findForUser(userId).stream()
            .findFirst()
            .map(w -> w.baseCurrency())
            .orElse("USD");
    UUID id =
        db.tx(
            () -> {
              UUID created = households.insert(name.trim(), currency, userId);
              households.addMember(created, me.email().toLowerCase(), userId, "ACTIVE");
              return created;
            });
    return view(households.find(id).orElseThrow(), me);
  }

  public void invite(UUID userId, UUID householdId, String email) {
    HouseholdRow h = creatorOf(userId, householdId);
    String guest = email.trim().toLowerCase();
    if (households.members(h.id()).stream().anyMatch(m -> m.email().equalsIgnoreCase(guest))) {
      throw new ConflictException("Already in this household");
    }
    UUID guestId = users.findByEmail(guest).map(User::id).orElse(null);
    households.addMember(h.id(), guest, guestId, "PENDING");
  }

  public void accept(UUID userId, UUID householdId) {
    User me = user(userId);
    MemberRow m = memberOrNotFound(userId, me, householdId);
    if (!"PENDING".equals(m.status())) throw new ConflictException("Already a member");
    households.activate(m.id(), userId);
  }

  /** Leaving (or declining) removes you; the last member leaving removes the household. */
  public void leave(UUID userId, UUID householdId) {
    User me = user(userId);
    MemberRow m = memberOrNotFound(userId, me, householdId);
    households.removeMember(householdId, m.id());
    boolean anyoneActive =
        households.members(householdId).stream().anyMatch(x -> "ACTIVE".equals(x.status()));
    if (!anyoneActive) households.delete(householdId);
  }

  public void remove(UUID userId, UUID householdId, UUID memberId) {
    HouseholdRow h = creatorOf(userId, householdId);
    MemberRow target =
        households.members(h.id()).stream()
            .filter(m -> m.id().equals(memberId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Member", memberId.toString()));
    if (userId.equals(target.userId())) throw new BadRequestException("Use leave instead");
    households.removeMember(h.id(), memberId);
  }

  public void rename(UUID userId, UUID householdId, String name) {
    households.rename(creatorOf(userId, householdId).id(), name.trim());
  }

  public void setSharing(
      UUID userId, UUID householdId, boolean spending, boolean netWorth, boolean investments) {
    MemberRow m = requireActive(userId, householdId);
    households.setSharing(m.id(), spending, netWorth, investments);
  }

  public void setBudget(UUID userId, UUID householdId, String categoryName, long amountMinor) {
    requireActive(userId, householdId);
    households.setBudget(householdId, categoryName.trim(), amountMinor);
  }

  public void removeBudget(UUID userId, UUID householdId, String categoryName) {
    requireActive(userId, householdId);
    households.removeBudget(householdId, categoryName);
  }

  /** Passes only for active members; everyone else sees a 404 so households cannot be probed. */
  public MemberRow requireActive(UUID userId, UUID householdId) {
    MemberRow m = memberOrNotFound(userId, user(userId), householdId);
    if (!"ACTIVE".equals(m.status())) {
      throw new ResourceNotFoundException("Household", householdId.toString());
    }
    return m;
  }

  public HouseholdRow household(UUID householdId) {
    return households
        .find(householdId)
        .orElseThrow(() -> new ResourceNotFoundException("Household", householdId.toString()));
  }

  private Household view(HouseholdRow h, User me) {
    List<MemberRow> rows = households.members(h.id());
    MemberRow mine =
        rows.stream()
            .filter(m -> me.id().equals(m.userId()) || m.email().equalsIgnoreCase(me.email()))
            .findFirst()
            .orElseThrow();
    boolean active = "ACTIVE".equals(mine.status());
    // An invitee sees only the household's name until they accept.
    List<Household.Member> members =
        active
            ? rows.stream()
                .map(
                    m ->
                        new Household.Member(
                            m.id(),
                            m.name(),
                            m.email(),
                            m.status(),
                            m.id().equals(mine.id()),
                            m.shareSpending(),
                            m.shareNetWorth(),
                            m.shareInvestments()))
                .toList()
            : List.of();
    return new Household(
        h.id(), h.name(), h.currency(), mine.status(), me.id().equals(h.createdBy()), members);
  }

  private HouseholdRow creatorOf(UUID userId, UUID householdId) {
    requireActive(userId, householdId);
    HouseholdRow h = household(householdId);
    if (!h.createdBy().equals(userId)) {
      throw new ResourceNotFoundException("Household", householdId.toString());
    }
    return h;
  }

  private MemberRow memberOrNotFound(UUID userId, User me, UUID householdId) {
    return households
        .memberFor(householdId, userId, me.email())
        .orElseThrow(() -> new ResourceNotFoundException("Household", householdId.toString()));
  }

  private User user(UUID id) {
    return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", "me"));
  }
}
