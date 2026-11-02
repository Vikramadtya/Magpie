package com.keeper.investment;

import com.keeper.common.db.Db;
import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * The purchases a holding is made of. The holding's quantity, cost and first buy date are always
 * the sum of its lots, so everything that reads holdings keeps working.
 */
@Singleton
public class HoldingLots {

  @Serdeable
  public record Lot(
      UUID id, LocalDate boughtOn, BigDecimal quantity, long costMinor, long unitPriceMinor) {}

  private final Db db;

  public HoldingLots(Db db) {
    this.db = db;
  }

  public List<Lot> list(UUID ws, UUID holdingId) {
    return db.list(
        "SELECT id, bought_on, quantity, cost_minor FROM holding_lots "
            + "WHERE workspace_id = ? AND holding_id = ? ORDER BY bought_on, created_at",
        rs -> {
          BigDecimal quantity = rs.getBigDecimal("quantity");
          long cost = rs.getLong("cost_minor");
          return new Lot(
              rs.getObject("id", UUID.class),
              rs.getObject("bought_on", LocalDate.class),
              quantity,
              cost,
              unitPrice(cost, quantity));
        },
        ws,
        holdingId);
  }

  public long count(UUID holdingId) {
    return db.count("SELECT count(*) FROM holding_lots WHERE holding_id = ?", holdingId);
  }

  /** The cost of buying {@code quantity} at a price per unit, rounded to the minor unit. */
  public static long costOf(BigDecimal quantity, long unitPriceMinor) {
    return quantity
        .multiply(BigDecimal.valueOf(unitPriceMinor))
        .setScale(0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  private static long unitPrice(long cost, BigDecimal quantity) {
    return quantity.signum() == 0
        ? 0
        : BigDecimal.valueOf(cost).divide(quantity, 0, RoundingMode.HALF_UP).longValueExact();
  }

  public UUID add(UUID ws, UUID holdingId, LocalDate boughtOn, BigDecimal quantity, long cost) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO holding_lots(id, workspace_id, holding_id, bought_on, quantity, cost_minor) VALUES (?,?,?,?,?,?)",
        id,
        ws,
        holdingId,
        boughtOn,
        quantity,
        cost);
    recompute(ws, holdingId);
    return id;
  }

  public void update(
      UUID ws, UUID holdingId, UUID lotId, LocalDate boughtOn, BigDecimal quantity, long cost) {
    int n =
        db.update(
            "UPDATE holding_lots SET bought_on = ?, quantity = ?, cost_minor = ? "
                + "WHERE workspace_id = ? AND holding_id = ? AND id = ?",
            boughtOn,
            quantity,
            cost,
            ws,
            holdingId,
            lotId);
    if (n == 0) throw new ResourceNotFoundException("Purchase", lotId.toString());
    recompute(ws, holdingId);
  }

  public void remove(UUID ws, UUID holdingId, UUID lotId) {
    db.update(
        "DELETE FROM holding_lots WHERE workspace_id = ? AND holding_id = ? AND id = ?",
        ws,
        holdingId,
        lotId);
    recompute(ws, holdingId);
  }

  private void recompute(UUID ws, UUID holdingId) {
    db.update(
        "UPDATE holdings h SET quantity = COALESCE(s.q, 0), cost_basis_minor = COALESCE(s.c, 0), purchased_on = s.first "
            + "FROM (SELECT SUM(quantity) q, SUM(cost_minor) c, MIN(bought_on) first FROM holding_lots "
            + "WHERE holding_id = ?) s WHERE h.workspace_id = ? AND h.id = ?",
        holdingId,
        ws,
        holdingId);
  }
}
