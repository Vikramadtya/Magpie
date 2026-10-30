package com.keeper.account;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class AccountRepository {
  private static final String COLS =
      "id, name, type, currency, opening_balance_minor, balance_minor, is_archived, sort_order, version, memo, "
          + "(SELECT s.status FROM account_shares s WHERE s.id = accounts.share_id) AS share_status";
  private static final RowMapper<Account> MAPPER =
      rs ->
          new Account(
              rs.getObject("id", UUID.class),
              rs.getString("name"),
              rs.getString("type"),
              rs.getString("currency"),
              rs.getLong("opening_balance_minor"),
              rs.getLong("balance_minor"),
              rs.getBoolean("is_archived"),
              rs.getInt("sort_order"),
              rs.getInt("version"),
              rs.getBoolean("memo"),
              rs.getString("share_status"));

  private final Db db;

  public AccountRepository(Db db) {
    this.db = db;
  }

  public List<Account> findAll(UUID ws, boolean includeArchived) {
    return db.list(
        "SELECT "
            + COLS
            + " FROM accounts WHERE workspace_id = ?"
            + (includeArchived ? "" : " AND NOT is_archived")
            + " ORDER BY sort_order, created_at",
        MAPPER,
        ws);
  }

  public Optional<Account> find(UUID ws, UUID id) {
    return db.one(
        "SELECT " + COLS + " FROM accounts WHERE workspace_id = ? AND id = ?", MAPPER, ws, id);
  }

  public UUID insert(UUID ws, String name, String type, String currency, long opening) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO accounts(id, workspace_id, name, type, currency, opening_balance_minor, balance_minor) "
            + "VALUES (?,?,?,?,?,?,?)",
        id,
        ws,
        name,
        type,
        currency,
        opening,
        opening);
    return id;
  }

  /** The guest's copy of a lent account. */
  public UUID insertMemo(UUID ws, String name, String currency, UUID shareId) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO accounts(id, workspace_id, name, type, currency, opening_balance_minor, balance_minor, memo, share_id) "
            + "VALUES (?,?,?,'OTHER',?,0,0,TRUE,?)",
        id,
        ws,
        name,
        currency,
        shareId);
    return id;
  }

  public int update(
      UUID ws,
      UUID id,
      String name,
      String type,
      boolean archived,
      int sortOrder,
      long openingDelta,
      long opening) {
    return db.update(
        "UPDATE accounts SET name = ?, type = ?, is_archived = ?, sort_order = ?, opening_balance_minor = ?, "
            + "balance_minor = balance_minor + ?, version = version + 1 WHERE workspace_id = ? AND id = ?",
        name,
        type,
        archived,
        sortOrder,
        opening,
        openingDelta,
        ws,
        id);
  }

  /** Atomic delta so concurrent writers never lose an update. */
  public void adjustBalance(UUID ws, UUID id, long delta) {
    db.update(
        "UPDATE accounts SET balance_minor = balance_minor + ?, version = version + 1 "
            + "WHERE workspace_id = ? AND id = ?",
        delta,
        ws,
        id);
  }

  public long transactionCount(UUID ws, UUID id) {
    return db.count(
        "SELECT count(*) FROM transactions WHERE workspace_id = ? AND account_id = ?", ws, id);
  }

  public int delete(UUID ws, UUID id) {
    return db.update("DELETE FROM accounts WHERE workspace_id = ? AND id = ?", ws, id);
  }

  /** Rebuilds the cached balance from the ledger rows (repair tool). */
  public long recalculate(UUID ws, UUID id) {
    return db.returning(
            "UPDATE accounts a SET balance_minor = a.opening_balance_minor + COALESCE((SELECT SUM(direction * amount_minor) "
                + "FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL), 0), version = version + 1 "
                + "WHERE a.workspace_id = ? AND a.id = ? RETURNING balance_minor",
            rs -> rs.getLong(1),
            ws,
            id)
        .orElse(0L);
  }
}
