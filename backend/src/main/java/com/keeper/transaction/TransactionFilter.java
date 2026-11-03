package com.keeper.transaction;

import com.keeper.common.db.SqlWhere;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Query parameters of the transaction list, turned into SQL conditions. Accounts, categories,
 * payees and tags take several values; a parent category includes its sub-categories. Amounts are
 * in the ledger's main currency. {@code q} is not part of the SQL: free text is matched in the app,
 * because notes are encrypted (see {@link TransactionSearch}).
 */
public record TransactionFilter(
    LocalDate from,
    LocalDate to,
    List<UUID> accountIds,
    List<UUID> categoryIds,
    List<UUID> payeeIds,
    List<UUID> tagIds,
    boolean uncategorised,
    Long minBaseMinor,
    Long maxBaseMinor,
    String type,
    String q,
    UUID tripId,
    String spentBy,
    String sort) {

  public static final String DEFAULT_SORT = "date_desc";

  /** Everything between two dates (or without limits when null). */
  public static TransactionFilter between(LocalDate from, LocalDate to) {
    return new TransactionFilter(
        from, to, null, null, null, null, false, null, null, null, null, null, null, null);
  }

  public static TransactionFilter none() {
    return between(null, null);
  }

  public boolean hasQuery() {
    return q != null && !q.isBlank();
  }

  public TransactionFilter withoutQuery() {
    return new TransactionFilter(
        from,
        to,
        accountIds,
        categoryIds,
        payeeIds,
        tagIds,
        uncategorised,
        minBaseMinor,
        maxBaseMinor,
        type,
        null,
        tripId,
        spentBy,
        sort);
  }

  public boolean defaultOrder() {
    return sort == null || sort.isBlank() || DEFAULT_SORT.equals(sort);
  }

  private static final String AMOUNT = "COALESCE(t.base_amount_minor, t.amount_minor)";

  /** The ORDER BY for the chosen sort; ties break on id so paging is stable. */
  String orderBy() {
    return switch (sort == null ? DEFAULT_SORT : sort) {
      case "date_asc" -> "t.occurred_on ASC, t.id ASC";
      case "amount_desc" -> AMOUNT + " DESC, t.id DESC";
      case "amount_asc" -> AMOUNT + " ASC, t.id ASC";
      default -> "t.occurred_on DESC, t.id DESC";
    };
  }

  private static boolean has(List<?> list) {
    return list != null && !list.isEmpty();
  }

  SqlWhere toWhere(UUID workspaceId) {
    SqlWhere where =
        new SqlWhere().and("t.workspace_id = ?", workspaceId).and("t.deleted_at IS NULL");
    where
        .andIf(from, "t.occurred_on >= ?")
        .andIf(to, "t.occurred_on <= ?")
        .andIf(type, "t.type = ?")
        .andIf(tripId, "t.trip_id = ?")
        .andIf(minBaseMinor, AMOUNT + " >= ?")
        .andIf(maxBaseMinor, AMOUNT + " <= ?");
    if (has(accountIds)) where.and("t.account_id = ANY(?)", accountIds);
    if (has(payeeIds)) where.and("t.payee_id = ANY(?)", payeeIds);
    if (has(categoryIds) && uncategorised) {
      where.and(
          "(t.category_id = ANY(?) OR c.parent_id = ANY(?) OR (t.category_id IS NULL AND t.type <> 'TRANSFER'))",
          categoryIds,
          categoryIds);
    } else if (has(categoryIds)) {
      where.and("(t.category_id = ANY(?) OR c.parent_id = ANY(?))", categoryIds, categoryIds);
    } else if (uncategorised) {
      where.and("t.category_id IS NULL AND t.type <> 'TRANSFER'");
    }
    if ("me".equals(spentBy)) {
      where.and("t.spent_by IS NULL");
    } else if (spentBy != null && !spentBy.isBlank()) {
      where.and("t.spent_by = ?", UUID.fromString(spentBy));
    }
    if (has(tagIds)) {
      where.and(
          "EXISTS (SELECT 1 FROM transaction_tags x WHERE x.transaction_id = t.id AND x.tag_id = ANY(?))",
          tagIds);
    }
    return where;
  }
}
