package com.keeper.transaction;

import com.keeper.common.db.SqlWhere;
import java.time.LocalDate;
import java.util.UUID;

/** Query parameters of the transaction list, turned into SQL conditions. */
public record TransactionFilter(
    LocalDate from,
    LocalDate to,
    UUID accountId,
    UUID categoryId,
    UUID payeeId,
    UUID tagId,
    String type,
    String q,
    UUID tripId,
    String spentBy) {

  SqlWhere toWhere(UUID workspaceId) {
    SqlWhere where =
        new SqlWhere().and("t.workspace_id = ?", workspaceId).and("t.deleted_at IS NULL");
    where
        .andIf(from, "t.occurred_on >= ?")
        .andIf(to, "t.occurred_on <= ?")
        .andIf(accountId, "t.account_id = ?")
        .andIf(categoryId, "t.category_id = ?")
        .andIf(payeeId, "t.payee_id = ?")
        .andIf(type, "t.type = ?")
        .andIf(tripId, "t.trip_id = ?");
    if ("me".equals(spentBy)) {
      where.and("t.spent_by IS NULL");
    } else if (spentBy != null && !spentBy.isBlank()) {
      where.and("t.spent_by = ?", UUID.fromString(spentBy));
    }
    if (tagId != null) {
      where.and(
          "EXISTS (SELECT 1 FROM transaction_tags x WHERE x.transaction_id = t.id AND x.tag_id = ?)",
          tagId);
    }
    if (q != null && !q.isBlank()) {
      String like =
          "%" + q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
      where.and("(t.note ILIKE ? OR p.name ILIKE ?)", like, like);
    }
    return where;
  }
}
