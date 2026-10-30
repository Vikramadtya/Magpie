package com.keeper.category;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class CategoryRepository {
  private static final RowMapper<Category> MAPPER =
      rs ->
          new Category(
              rs.getObject("id", UUID.class),
              rs.getObject("parent_id", UUID.class),
              rs.getString("name"),
              rs.getString("kind"),
              rs.getString("icon"),
              rs.getString("color"),
              rs.getBoolean("is_archived"));
  private static final String COLS = "id, parent_id, name, kind, icon, color, is_archived";

  private final Db db;

  public CategoryRepository(Db db) {
    this.db = db;
  }

  public List<Category> findAll(UUID ws) {
    return db.list(
        "SELECT "
            + COLS
            + " FROM categories WHERE workspace_id = ? AND NOT is_archived ORDER BY name",
        MAPPER,
        ws);
  }

  public Optional<Category> find(UUID ws, UUID id) {
    return db.one(
        "SELECT " + COLS + " FROM categories WHERE workspace_id = ? AND id = ?", MAPPER, ws, id);
  }

  public boolean exists(UUID ws, UUID id) {
    return db.count("SELECT count(*) FROM categories WHERE workspace_id = ? AND id = ?", ws, id)
        > 0;
  }

  public UUID insert(UUID ws, UUID parentId, String name, String kind, String icon, String color) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO categories(id, workspace_id, parent_id, name, kind, icon, color) VALUES (?,?,?,?,?,?,?)",
        id,
        ws,
        parentId,
        name,
        kind,
        icon,
        color);
    return id;
  }

  public int update(UUID ws, UUID id, String name, String icon, String color, UUID parentId) {
    return db.update(
        "UPDATE categories SET name = ?, icon = ?, color = ?, parent_id = ? WHERE workspace_id = ? AND id = ?",
        name,
        icon,
        color,
        parentId,
        ws,
        id);
  }

  /** Archive instead of delete so historical transactions keep their category name. */
  public int archive(UUID ws, UUID id) {
    return db.update(
        "UPDATE categories SET is_archived = TRUE WHERE workspace_id = ? AND (id = ? OR parent_id = ?)",
        ws,
        id,
        id);
  }
}
