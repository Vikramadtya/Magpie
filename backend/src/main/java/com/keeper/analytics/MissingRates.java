package com.keeper.analytics;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Currencies of transactions in a period that still have no base-currency amount (no rate yet). */
@Singleton
public class MissingRates {
  private final Db db;

  public MissingRates(Db db) {
    this.db = db;
  }

  public List<String> currencies(UUID ws, LocalDate from, LocalDate to) {
    return db.list(
        "SELECT DISTINCT currency FROM transactions WHERE workspace_id = ? AND base_amount_minor IS NULL "
            + "AND deleted_at IS NULL AND type <> 'TRANSFER' AND loan_id IS NULL AND occurred_on BETWEEN ? AND ? ORDER BY 1",
        rs -> rs.getString(1),
        ws,
        from,
        to);
  }
}
