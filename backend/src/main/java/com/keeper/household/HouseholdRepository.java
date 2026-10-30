package com.keeper.household;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class HouseholdRepository {

  /** One row of household_members joined to the person's name. */
  public record MemberRow(
      UUID id,
      UUID householdId,
      UUID userId,
      String name,
      String email,
      String status,
      boolean shareSpending,
      boolean shareNetWorth,
      boolean shareInvestments) {}

  public record HouseholdRow(UUID id, String name, String currency, UUID createdBy) {}

  private static final String MEMBER_COLS =
      "m.id, m.household_id, m.user_id, COALESCE(u.name, m.email), m.email, m.status, "
          + "m.share_spending, m.share_net_worth, m.share_investments";
  private static final String MEMBER_FROM =
      " FROM household_members m LEFT JOIN users u ON u.id = m.user_id ";

  private final Db db;

  public HouseholdRepository(Db db) {
    this.db = db;
  }

  private static MemberRow member(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new MemberRow(
        rs.getObject(1, UUID.class),
        rs.getObject(2, UUID.class),
        rs.getObject(3, UUID.class),
        rs.getString(4),
        rs.getString(5),
        rs.getString(6),
        rs.getBoolean(7),
        rs.getBoolean(8),
        rs.getBoolean(9));
  }

  public UUID insert(String name, String currency, UUID createdBy) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO households(id, name, currency, created_by) VALUES (?,?,?,?)",
        id,
        name,
        currency,
        createdBy);
    return id;
  }

  public Optional<HouseholdRow> find(UUID id) {
    return db.one(
        "SELECT id, name, currency, created_by FROM households WHERE id = ?",
        rs ->
            new HouseholdRow(
                rs.getObject(1, UUID.class),
                rs.getString(2),
                rs.getString(3),
                rs.getObject(4, UUID.class)),
        id);
  }

  /** Households the user belongs to or has been invited to. */
  public List<HouseholdRow> forUser(UUID userId, String email) {
    return db.list(
        "SELECT h.id, h.name, h.currency, h.created_by FROM households h WHERE EXISTS "
            + "(SELECT 1 FROM household_members m WHERE m.household_id = h.id "
            + "AND (m.user_id = ? OR lower(m.email) = lower(?))) ORDER BY h.created_at",
        rs ->
            new HouseholdRow(
                rs.getObject(1, UUID.class),
                rs.getString(2),
                rs.getString(3),
                rs.getObject(4, UUID.class)),
        userId,
        email);
  }

  public void delete(UUID id) {
    db.update("DELETE FROM households WHERE id = ?", id);
  }

  public void rename(UUID id, String name) {
    db.update("UPDATE households SET name = ? WHERE id = ?", name, id);
  }

  // ---------- members ----------

  public List<MemberRow> members(UUID householdId) {
    return db.list(
        "SELECT " + MEMBER_COLS + MEMBER_FROM + "WHERE m.household_id = ? ORDER BY m.created_at",
        HouseholdRepository::member,
        householdId);
  }

  public Optional<MemberRow> memberFor(UUID householdId, UUID userId, String email) {
    return db.one(
        "SELECT "
            + MEMBER_COLS
            + MEMBER_FROM
            + "WHERE m.household_id = ? AND (m.user_id = ? OR lower(m.email) = lower(?))",
        HouseholdRepository::member,
        householdId,
        userId,
        email);
  }

  public void addMember(UUID householdId, String email, UUID userId, String status) {
    db.update(
        "INSERT INTO household_members(household_id, email, user_id, status) VALUES (?,?,?,?)",
        householdId,
        email,
        userId,
        status);
  }

  public void activate(UUID memberId, UUID userId) {
    db.update(
        "UPDATE household_members SET status = 'ACTIVE', user_id = ? WHERE id = ?",
        userId,
        memberId);
  }

  public void setSharing(UUID memberId, boolean spending, boolean netWorth, boolean investments) {
    db.update(
        "UPDATE household_members SET share_spending = ?, share_net_worth = ?, share_investments = ? WHERE id = ?",
        spending,
        netWorth,
        investments,
        memberId);
  }

  public void removeMember(UUID householdId, UUID memberId) {
    db.update(
        "DELETE FROM household_members WHERE household_id = ? AND id = ?", householdId, memberId);
  }

  // ---------- budgets ----------

  public record BudgetRow(String categoryName, long amountMinor) {}

  public List<BudgetRow> budgets(UUID householdId) {
    return db.list(
        "SELECT category_name, amount_minor FROM household_budgets WHERE household_id = ? ORDER BY lower(category_name)",
        rs -> new BudgetRow(rs.getString(1), rs.getLong(2)),
        householdId);
  }

  public void setBudget(UUID householdId, String categoryName, long amountMinor) {
    db.update(
        "INSERT INTO household_budgets(household_id, category_name, amount_minor) VALUES (?,?,?) "
            + "ON CONFLICT (household_id, lower(category_name)) DO UPDATE SET amount_minor = EXCLUDED.amount_minor",
        householdId,
        categoryName,
        amountMinor);
  }

  public void removeBudget(UUID householdId, String categoryName) {
    db.update(
        "DELETE FROM household_budgets WHERE household_id = ? AND lower(category_name) = lower(?)",
        householdId,
        categoryName);
  }
}
