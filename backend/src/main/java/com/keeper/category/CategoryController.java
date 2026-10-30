package com.keeper.category;

import com.keeper.common.RefChecks;
import com.keeper.common.exception.BadRequestException;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Two-level category tree (group -> child). */
@Controller("/api/v1/workspaces/{workspaceId}/categories")
@io.micronaut.validation.Validated
public class CategoryController {

  @Serdeable
  public record Node(
      UUID id, String name, String kind, String icon, String color, List<Node> children) {}

  @Serdeable
  public record Request(
      @NotBlank @Size(max = 120) String name,
      @Pattern(regexp = "^(INCOME|EXPENSE)$") String kind,
      @Size(max = 16) String icon,
      @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String color,
      UUID parentId) {}

  private final CategoryRepository categories;
  private final RefChecks refs;

  public CategoryController(CategoryRepository categories, RefChecks refs) {
    this.categories = categories;
    this.refs = refs;
  }

  @Get
  public List<Category> list(@PathVariable UUID workspaceId) {
    return categories.findAll(workspaceId);
  }

  @Get("/tree")
  public List<Node> tree(@PathVariable UUID workspaceId) {
    Map<UUID, Node> roots = new LinkedHashMap<>();
    List<Category> all = categories.findAll(workspaceId);
    all.stream()
        .filter(c -> c.parentId() == null)
        .forEach(
            c ->
                roots.put(
                    c.id(),
                    new Node(c.id(), c.name(), c.kind(), c.icon(), c.color(), new ArrayList<>())));
    all.stream()
        .filter(c -> c.parentId() != null && roots.containsKey(c.parentId()))
        .forEach(
            c ->
                roots
                    .get(c.parentId())
                    .children()
                    .add(new Node(c.id(), c.name(), c.kind(), c.icon(), c.color(), List.of())));
    return List.copyOf(roots.values());
  }

  @Post
  public Category create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    String kind = body.kind();
    if (body.parentId() != null) {
      Category parent =
          categories
              .find(workspaceId, body.parentId())
              .orElseThrow(() -> new BadRequestException("Unknown parent"));
      if (parent.parentId() != null)
        throw new BadRequestException("Categories nest only two levels");
      kind = parent.kind();
    }
    if (kind == null) throw new BadRequestException("kind is required");
    UUID id =
        categories.insert(
            workspaceId, body.parentId(), body.name().trim(), kind, body.icon(), body.color());
    return categories.find(workspaceId, id).orElseThrow();
  }

  @Patch("/{id}")
  public Category update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    Category current =
        categories
            .find(workspaceId, id)
            .orElseThrow(() -> new ResourceNotFoundException("Category", id.toString()));
    if (body.parentId() != null) {
      if (body.parentId().equals(id))
        throw new BadRequestException("A category cannot be its own parent");
      refs.category(workspaceId, body.parentId());
    }
    categories.update(
        workspaceId,
        id,
        body.name().trim(),
        body.icon() == null ? current.icon() : body.icon(),
        body.color() == null ? current.color() : body.color(),
        body.parentId() == null ? current.parentId() : body.parentId());
    return categories.find(workspaceId, id).orElseThrow();
  }

  @Delete("/{id}")
  public void archive(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    categories.archive(workspaceId, id);
  }
}
