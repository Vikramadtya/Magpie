package com.keeper.audit;

import com.keeper.common.db.Db;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.serde.annotation.Serdeable;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/activity")
public class ActivityController {

  @Serdeable
  public record Entry(
      long id,
      String userName,
      String entity,
      UUID entityId,
      String action,
      String summary,
      Instant at) {}

  private final Db db;

  public ActivityController(Db db) {
    this.db = db;
  }

  @Get
  public List<Entry> recent(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "50") int limit) {
    return db.list(
        "SELECT a.id, u.name, a.entity, a.entity_id, a.action, a.summary, a.at FROM audit_log a "
            + "LEFT JOIN users u ON u.id = a.user_id WHERE a.workspace_id = ? ORDER BY a.id DESC LIMIT ?",
        rs ->
            new Entry(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("entity"),
                rs.getObject("entity_id", UUID.class),
                rs.getString("action"),
                rs.getString("summary"),
                rs.getObject("at", OffsetDateTime.class).toInstant()),
        workspaceId,
        Math.min(Math.max(limit, 1), 200));
  }
}
