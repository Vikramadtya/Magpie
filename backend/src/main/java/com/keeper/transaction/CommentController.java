package com.keeper.transaction;

import com.keeper.common.Actor;
import com.keeper.common.db.Db;
import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/transactions/{transactionId}/comments")
@io.micronaut.validation.Validated
public class CommentController {

  @Serdeable
  public record Comment(UUID id, UUID userId, String userName, String body, Instant createdAt) {}

  @Serdeable
  public record Request(@NotBlank @Size(max = 2000) String body) {}

  private static final String SELECT =
      "SELECT c.id, c.user_id, u.name, c.body, c.created_at FROM transaction_comments c JOIN users u ON u.id = c.user_id ";

  private final Db db;

  public CommentController(Db db) {
    this.db = db;
  }

  private static Comment map(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new Comment(
        rs.getObject("id", UUID.class),
        rs.getObject("user_id", UUID.class),
        rs.getString("name"),
        rs.getString("body"),
        rs.getObject("created_at", OffsetDateTime.class).toInstant());
  }

  @Get
  public List<Comment> list(@PathVariable UUID workspaceId, @PathVariable UUID transactionId) {
    return db.list(
        SELECT + "WHERE c.workspace_id = ? AND c.transaction_id = ? ORDER BY c.created_at",
        CommentController::map,
        workspaceId,
        transactionId);
  }

  @Post
  public Comment add(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID transactionId,
      @Valid @Body Request body) {
    long exists =
        db.count(
            "SELECT count(*) FROM transactions WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL",
            workspaceId,
            transactionId);
    if (exists == 0) throw new ResourceNotFoundException("Transaction", transactionId.toString());
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO transaction_comments(id, workspace_id, transaction_id, user_id, body) VALUES (?,?,?,?,?)",
        id,
        workspaceId,
        transactionId,
        Actor.id(auth),
        body.body().trim());
    return db.one(SELECT + "WHERE c.id = ?", CommentController::map, id).orElseThrow();
  }
}
