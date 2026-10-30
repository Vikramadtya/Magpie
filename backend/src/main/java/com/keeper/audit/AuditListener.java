package com.keeper.audit;

import com.keeper.common.db.Db;
import io.micronaut.runtime.event.annotation.EventListener;
import jakarta.inject.Singleton;

@Singleton
public class AuditListener {
  private final Db db;

  public AuditListener(Db db) {
    this.db = db;
  }

  @EventListener
  public void on(AuditEvent e) {
    db.update(
        "INSERT INTO audit_log(workspace_id, user_id, entity, entity_id, action, summary) VALUES (?,?,?,?,?,?)",
        e.workspaceId(),
        e.userId(),
        e.entity(),
        e.entityId(),
        e.action(),
        e.summary());
  }
}
