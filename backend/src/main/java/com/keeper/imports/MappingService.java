package com.keeper.imports;

import com.keeper.common.db.Db;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.UUID;

/** Saved column mappings, one per bank layout, so a repeat import is a single click. */
@Singleton
public class MappingService {
  @Serdeable
  public record Saved(UUID id, String name, ColumnMapping mapping, String dateFormat) {}

  private static final String COLS =
      "id, name, date_col, amount_col, debit_col, credit_col, desc_col, date_format";
  private final Db db;

  public MappingService(Db db) {
    this.db = db;
  }

  public List<Saved> list(UUID ws) {
    return db.list(
        "SELECT " + COLS + " FROM import_mappings WHERE workspace_id = ? ORDER BY lower(name)",
        rs ->
            new Saved(
                rs.getObject(1, UUID.class),
                rs.getString(2),
                new ColumnMapping(
                    rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7)),
                rs.getString(8)),
        ws);
  }

  /** Saves under the name, replacing an earlier mapping with the same name. */
  public Saved save(UUID ws, String name, ColumnMapping m, String dateFormat) {
    String fmt = dateFormat == null ? "ISO" : dateFormat;
    String n = name.trim();
    db.update(
        "DELETE FROM import_mappings WHERE workspace_id = ? AND lower(name) = lower(?)", ws, n);
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO import_mappings(id, workspace_id, name, date_col, amount_col, debit_col, credit_col, desc_col, date_format) VALUES (?,?,?,?,?,?,?,?,?)",
        id,
        ws,
        n,
        m.dateCol(),
        m.amountCol(),
        m.debitCol(),
        m.creditCol(),
        m.descCol(),
        fmt);
    return new Saved(id, n, m, fmt);
  }

  public void delete(UUID ws, UUID id) {
    db.update("DELETE FROM import_mappings WHERE workspace_id = ? AND id = ?", ws, id);
  }
}
