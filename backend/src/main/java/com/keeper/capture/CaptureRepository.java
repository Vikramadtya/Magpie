package com.keeper.capture;

import com.keeper.common.db.Db;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class CaptureRepository {

  /** One transaction typed into the quick-add page, waiting for review. */
  @Serdeable
  public record Capture(
      UUID id,
      String type,
      long amountMinor,
      String currency,
      LocalDate occurredOn,
      UUID accountId,
      String accountName,
      UUID categoryId,
      String categoryName,
      String payeeText,
      String note,
      String status,
      Instant createdAt) {}

  private static final String SELECT =
      "SELECT q.id, q.type, q.amount_minor, q.currency, q.occurred_on, q.account_id, a.name AS account_name, "
          + "q.category_id, c.name AS category_name, q.payee_text, q.note, q.status, q.created_at "
          + "FROM quick_captures q LEFT JOIN accounts a ON a.id = q.account_id "
          + "LEFT JOIN categories c ON c.id = q.category_id WHERE q.workspace_id = ? ";

  private final Db db;

  public CaptureRepository(Db db) {
    this.db = db;
  }

  private static Capture map(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new Capture(
        rs.getObject("id", UUID.class),
        rs.getString("type"),
        rs.getLong("amount_minor"),
        rs.getString("currency"),
        rs.getObject("occurred_on", LocalDate.class),
        rs.getObject("account_id", UUID.class),
        rs.getString("account_name"),
        rs.getObject("category_id", UUID.class),
        rs.getString("category_name"),
        rs.getString("payee_text"),
        rs.getString("note"),
        rs.getString("status"),
        rs.getObject("created_at", OffsetDateTime.class).toInstant());
  }

  public List<Capture> pending(UUID ws) {
    return db.list(
        SELECT + "AND q.status = 'PENDING' ORDER BY q.occurred_on DESC, q.created_at DESC",
        CaptureRepository::map,
        ws);
  }

  public long pendingCount(UUID ws) {
    return db.count(
        "SELECT count(*) FROM quick_captures WHERE workspace_id = ? AND status = 'PENDING'", ws);
  }

  public Optional<Capture> find(UUID ws, UUID id) {
    return db.one(SELECT + "AND q.id = ?", CaptureRepository::map, ws, id);
  }

  public int markAccepted(UUID ws, UUID id, UUID transactionId) {
    return db.update(
        "UPDATE quick_captures SET status = 'ACCEPTED', transaction_id = ? "
            + "WHERE workspace_id = ? AND id = ? AND status = 'PENDING'",
        transactionId,
        ws,
        id);
  }

  public int dismiss(UUID ws, UUID id) {
    return db.update(
        "UPDATE quick_captures SET status = 'DISMISSED' WHERE workspace_id = ? AND id = ? AND status = 'PENDING'",
        ws,
        id);
  }
}
