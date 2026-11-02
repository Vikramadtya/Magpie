package com.keeper.crypto;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class JdbcWrappedKeys implements WrappedKeys {

  private final Db db;

  public JdbcWrappedKeys(Db db) {
    this.db = db;
  }

  @Override
  public Optional<byte[]> find(UUID workspaceId) {
    return db.one(
        "SELECT wrapped_key FROM workspace_keys WHERE workspace_id = ?",
        rs -> rs.getBytes(1),
        workspaceId);
  }

  @Override
  public void saveIfAbsent(UUID workspaceId, byte[] wrapped) {
    // Committed on its own: a rollback of the caller must not lose a key that is already in use.
    db.independently(
        () ->
            db.update(
                "INSERT INTO workspace_keys(workspace_id, wrapped_key) VALUES (?, ?) ON CONFLICT DO NOTHING",
                workspaceId,
                wrapped));
  }
}
