package com.keeper.tag;

import com.keeper.common.db.Db;
import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Patch;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/tags")
@io.micronaut.validation.Validated
public class TagController {

  @Serdeable
  public record Tag(UUID id, String name, String color) {}

  @Serdeable
  public record Request(
      @NotBlank @Size(max = 60) String name, @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String color) {}

  private final Db db;

  public TagController(Db db) {
    this.db = db;
  }

  private static Tag map(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new Tag(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("color"));
  }

  @Get
  public List<Tag> list(@PathVariable UUID workspaceId) {
    return db.list(
        "SELECT id, name, color FROM tags WHERE workspace_id = ? ORDER BY name",
        TagController::map,
        workspaceId);
  }

  @Post
  public Tag create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    return db.returning(
            "INSERT INTO tags(workspace_id, name, color) VALUES (?,?,?) "
                + "ON CONFLICT (workspace_id, lower(name)) DO UPDATE SET color = COALESCE(EXCLUDED.color, tags.color) "
                + "RETURNING id, name, color",
            TagController::map,
            workspaceId,
            body.name().trim(),
            body.color())
        .orElseThrow();
  }

  @Patch("/{id}")
  public Tag update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    return db.returning(
            "UPDATE tags SET name = ?, color = ? WHERE workspace_id = ? AND id = ? RETURNING id, name, color",
            TagController::map,
            body.name().trim(),
            body.color(),
            workspaceId,
            id)
        .orElseThrow(() -> new ResourceNotFoundException("Tag", id.toString()));
  }

  @Delete("/{id}")
  public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    db.update("DELETE FROM tags WHERE workspace_id = ? AND id = ?", workspaceId, id);
  }
}
