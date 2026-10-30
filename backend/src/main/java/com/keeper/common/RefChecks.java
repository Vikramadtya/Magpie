package com.keeper.common;

import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import jakarta.inject.Singleton;
import java.util.UUID;

/**
 * Guards against cross-tenant references: a client may only point at rows of its own workspace,
 * even if it knows another workspace's ids.
 */
@Singleton
public class RefChecks {
  private final Db db;

  public RefChecks(Db db) {
    this.db = db;
  }

  public void account(UUID ws, UUID id) {
    require("accounts", ws, id);
  }

  public void category(UUID ws, UUID id) {
    require("categories", ws, id);
  }

  public void payee(UUID ws, UUID id) {
    require("payees", ws, id);
  }

  public void person(UUID ws, UUID id) {
    require("people", ws, id);
  }

  public void tag(UUID ws, UUID id) {
    require("tags", ws, id);
  }

  private void require(String table, UUID ws, UUID id) {
    if (id == null) return;
    long n =
        db.count("SELECT count(*) FROM " + table + " WHERE workspace_id = ? AND id = ?", ws, id);
    if (n == 0) {
      throw new BadRequestException(
          "Unknown " + table.substring(0, table.length() - 1) + " reference");
    }
  }
}
