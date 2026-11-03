package com.keeper.search;

import com.keeper.common.CursorPage;
import com.keeper.common.db.Db;
import com.keeper.transaction.TransactionFilter;
import com.keeper.transaction.TransactionService;
import com.keeper.transaction.TransactionView;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** One search box for the whole ledger: accounts, payees, categories, trips, loans and more. */
@Controller("/api/v1/workspaces/{workspaceId}/search")
@io.micronaut.validation.Validated
public class SearchController {
  private static final int PER_KIND = 5;

  /**
   * One thing found. {@code kind} tells the screen where to go; {@code id} is its id when it has
   * one.
   */
  @Serdeable
  public record Hit(String kind, String id, String title, String subtitle) {}

  private final Db db;
  private final TransactionService transactions;

  public SearchController(Db db, TransactionService transactions) {
    this.db = db;
    this.transactions = transactions;
  }

  private static String like(String q) {
    return "%" + q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
  }

  private List<Hit> names(String kind, String sql, UUID ws, String pattern) {
    return db.list(
        sql,
        rs ->
            new Hit(
                kind,
                rs.getString(1),
                rs.getString(2),
                rs.getMetaData().getColumnCount() > 2 ? rs.getString(3) : null),
        ws,
        pattern,
        PER_KIND);
  }

  @Get
  public List<Hit> search(
      @PathVariable UUID workspaceId, @QueryValue @NotBlank @Size(min = 2, max = 60) String q) {
    String p = like(q);
    List<Hit> out = new ArrayList<>();
    CursorPage<TransactionView> found =
        transactions.list(
            workspaceId,
            new TransactionFilter(
                null, null, null, null, null, null, false, null, null, null, q.trim(), null, null,
                null),
            null,
            PER_KIND);
    for (TransactionView t : found.items()) {
      out.add(
          new Hit(
              "transaction",
              t.id().toString(),
              t.payeeName() != null ? t.payeeName() : t.note() != null ? t.note() : t.type(),
              t.occurredOn() + " · " + t.accountName()));
    }
    out.addAll(
        names(
            "account",
            "SELECT id::text, name, type FROM accounts WHERE workspace_id = ? AND name ILIKE ? AND NOT is_archived ORDER BY name LIMIT ?",
            workspaceId,
            p));
    out.addAll(
        names(
            "payee",
            "SELECT id::text, name FROM payees WHERE workspace_id = ? AND name ILIKE ? ORDER BY name LIMIT ?",
            workspaceId,
            p));
    out.addAll(
        names(
            "category",
            "SELECT id::text, name, kind FROM categories WHERE workspace_id = ? AND name ILIKE ? AND NOT is_archived ORDER BY name LIMIT ?",
            workspaceId,
            p));
    out.addAll(
        names(
            "tag",
            "SELECT id::text, name FROM tags WHERE workspace_id = ? AND name ILIKE ? ORDER BY name LIMIT ?",
            workspaceId,
            p));
    out.addAll(
        names(
            "trip",
            "SELECT id::text, name FROM trips WHERE workspace_id = ? AND name ILIKE ? ORDER BY start_date DESC LIMIT ?",
            workspaceId,
            p));
    out.addAll(
        names(
            "loan",
            "SELECT id::text, person, direction FROM loans WHERE workspace_id = ? AND person ILIKE ? AND deleted_at IS NULL ORDER BY occurred_on DESC LIMIT ?",
            workspaceId,
            p));
    out.addAll(
        names(
            "goal",
            "SELECT id::text, name FROM goals WHERE workspace_id = ? AND name ILIKE ? ORDER BY name LIMIT ?",
            workspaceId,
            p));
    out.addAll(
        db.list(
            "SELECT id::text, name, symbol FROM holdings WHERE workspace_id = ? AND (name ILIKE ? OR symbol ILIKE ?) ORDER BY name LIMIT ?",
            rs -> new Hit("holding", rs.getString(1), rs.getString(2), rs.getString(3)),
            workspaceId,
            p,
            p,
            PER_KIND));
    return out;
  }
}
