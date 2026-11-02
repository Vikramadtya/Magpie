package com.keeper.split;

import com.keeper.common.db.Db;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The table that says which Keeper name belongs to which split-app person. */
@Singleton
public class SplitPeopleRepository {

  @Serdeable
  public record Person(
      UUID id, String externalId, String name, String email, String label, boolean labelEdited) {}

  private static final String COLS = "id, external_id, name, email, label, label_edited";

  private final Db db;

  public SplitPeopleRepository(Db db) {
    this.db = db;
  }

  public List<Person> list(UUID ws) {
    return db.list(
        "SELECT " + COLS + " FROM split_people WHERE workspace_id = ? ORDER BY lower(label)",
        rs ->
            new Person(
                rs.getObject(1, UUID.class),
                rs.getString(2),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5),
                rs.getBoolean(6)),
        ws);
  }

  /**
   * Records someone the split app mentioned. Their name and email follow the split app; the label
   * follows it too until the owner edits it.
   */
  public void upsert(UUID ws, String externalId, String name, String email) {
    db.update(
        "INSERT INTO split_people(workspace_id, external_id, name, email, label) VALUES (?,?,?,?,?) "
            + "ON CONFLICT (workspace_id, external_id) DO UPDATE SET name = EXCLUDED.name, "
            + "email = COALESCE(EXCLUDED.email, split_people.email), "
            + "label = CASE WHEN split_people.label_edited THEN split_people.label ELSE EXCLUDED.name END, "
            + "updated_at = NOW()",
        ws,
        externalId,
        name,
        email,
        name);
  }

  public Optional<String> labelFor(UUID ws, String externalId) {
    if (externalId == null) return Optional.empty();
    return db.one(
        "SELECT label FROM split_people WHERE workspace_id = ? AND external_id = ?",
        rs -> rs.getString(1),
        ws,
        externalId);
  }

  public int setLabel(UUID ws, UUID id, String label) {
    return db.update(
        "UPDATE split_people SET label = ?, label_edited = TRUE, updated_at = NOW() WHERE workspace_id = ? AND id = ?",
        label,
        ws,
        id);
  }

  /** Back to following the split app's name. */
  public int resetLabel(UUID ws, UUID id) {
    return db.update(
        "UPDATE split_people SET label = name, label_edited = FALSE, updated_at = NOW() WHERE workspace_id = ? AND id = ?",
        ws,
        id);
  }
}
