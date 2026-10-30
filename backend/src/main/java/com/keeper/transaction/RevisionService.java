package com.keeper.transaction;

import com.keeper.common.db.Db;
import io.micronaut.json.JsonMapper;
import jakarta.inject.Singleton;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Keeps the previous state of every edited or deleted transaction so it can be undone. */
@Singleton
public class RevisionService {

  public record Revision(long id, String action, TransactionView snapshot) {}

  private final Db db;
  private final JsonMapper json;

  public RevisionService(Db db, JsonMapper json) {
    this.db = db;
    this.json = json;
  }

  public void record(UUID ws, UUID actor, String action, TransactionView before) {
    try {
      db.update(
          "INSERT INTO transaction_revisions(workspace_id, transaction_id, action, snapshot, actor) VALUES (?,?,?,?::jsonb,?)",
          ws,
          before.id(),
          action,
          json.writeValueAsString(before),
          actor);
    } catch (IOException e) {
      throw new IllegalStateException("Could not store revision", e);
    }
  }

  /** The most recent change to this transaction that has not been undone yet. */
  public Optional<Revision> latestOpen(UUID ws, UUID transactionId) {
    return db.one(
        "SELECT id, action, snapshot::text FROM transaction_revisions "
            + "WHERE workspace_id = ? AND transaction_id = ? AND NOT undone ORDER BY id DESC LIMIT 1",
        rs -> {
          try {
            return new Revision(
                rs.getLong(1),
                rs.getString(2),
                json.readValue(rs.getString(3), TransactionView.class));
          } catch (IOException e) {
            throw new IllegalStateException("Corrupt revision", e);
          }
        },
        ws,
        transactionId);
  }

  public void markUndone(long revisionId) {
    db.update("UPDATE transaction_revisions SET undone = TRUE WHERE id = ?", revisionId);
  }

  /** After a restore, the DELETE revisions of the restored rows are spent. */
  public void markDeletesUndone(List<UUID> transactionIds) {
    db.update(
        "UPDATE transaction_revisions SET undone = TRUE WHERE transaction_id = ANY(?) AND action = 'DELETE' AND NOT undone",
        transactionIds);
  }
}
