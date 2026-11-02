package com.keeper.crypto;

import com.keeper.common.db.Db;
import io.micronaut.context.event.StartupEvent;
import io.micronaut.runtime.event.annotation.EventListener;
import io.micronaut.scheduling.TaskExecutors;
import jakarta.inject.Named;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** After encryption is switched on, seals the text that was stored earlier in plain form. */
@Singleton
public class EncryptionBackfill {
  private static final Logger LOG = LoggerFactory.getLogger(EncryptionBackfill.class);
  private static final int BATCH = 500;

  private record Target(String table, String column) {}

  private record Row(UUID id, UUID workspaceId, String value) {}

  private static final List<Target> TARGETS =
      List.of(
          new Target("transactions", "note"),
          new Target("transaction_comments", "body"),
          new Target("loans", "note"),
          new Target("trips", "notes"));

  private final Db db;
  private final FieldCrypto crypto;
  private final ExecutorService executor;

  public EncryptionBackfill(
      Db db, FieldCrypto crypto, @Named(TaskExecutors.BLOCKING) ExecutorService executor) {
    this.db = db;
    this.crypto = crypto;
    this.executor = executor;
  }

  @EventListener
  void onStart(StartupEvent event) {
    if (!crypto.enabled()) return;
    executor.execute(this::run);
  }

  /** Seals everything still in plain form; returns how many values were converted. */
  public int run() {
    int total = 0;
    try {
      for (Target t : TARGETS) total += seal(t);
      total += sealRevisions();
      if (total > 0) LOG.info("Encrypted {} previously plain values", total);
    } catch (RuntimeException e) {
      LOG.warn("Encryption backfill stopped: {}", e.getMessage());
    }
    return total;
  }

  private int seal(Target t) {
    int done = 0;
    while (true) {
      List<Row> rows =
          db.list(
              "SELECT id, workspace_id, "
                  + t.column()
                  + " FROM "
                  + t.table()
                  + " WHERE "
                  + t.column()
                  + " IS NOT NULL AND "
                  + t.column()
                  + " <> '' AND "
                  + t.column()
                  + " NOT LIKE 'enc1:%' LIMIT "
                  + BATCH,
              rs ->
                  new Row(
                      rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3)));
      for (Row r : rows) {
        db.update(
            "UPDATE " + t.table() + " SET " + t.column() + " = ? WHERE id = ?",
            crypto.seal(r.workspaceId(), r.value()),
            r.id());
      }
      done += rows.size();
      if (rows.size() < BATCH) return done;
    }
  }

  private record Revision(long id, UUID workspaceId, String snapshot) {}

  private int sealRevisions() {
    int done = 0;
    while (true) {
      List<Revision> rows =
          db.list(
              "SELECT id, workspace_id, snapshot::text FROM transaction_revisions "
                  + "WHERE NOT (snapshot ? 'enc') LIMIT "
                  + BATCH,
              rs -> new Revision(rs.getLong(1), rs.getObject(2, UUID.class), rs.getString(3)));
      for (Revision r : rows) {
        String wrapped = "{\"enc\":\"" + crypto.seal(r.workspaceId(), r.snapshot()) + "\"}";
        db.update(
            "UPDATE transaction_revisions SET snapshot = ?::jsonb WHERE id = ?", wrapped, r.id());
      }
      done += rows.size();
      if (rows.size() < BATCH) return done;
    }
  }
}
