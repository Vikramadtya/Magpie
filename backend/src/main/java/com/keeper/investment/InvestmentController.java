package com.keeper.investment;

import com.keeper.common.RefChecks;
import com.keeper.common.db.Db;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.fx.FxConverter;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Manual-price portfolio tracking: holdings, market value, gain/loss, allocation. */
@Controller("/api/v1/workspaces/{workspaceId}")
@io.micronaut.validation.Validated
public class InvestmentController {

  @Serdeable
  public record Holding(
      UUID id,
      UUID accountId,
      String symbol,
      String name,
      BigDecimal quantity,
      long costBasisMinor,
      long priceMinor,
      String currency,
      LocalDate priceAsOf,
      long marketValueMinor,
      long gainMinor) {}

  @Serdeable
  public record Request(
      UUID accountId,
      @NotBlank @Size(max = 20) String symbol,
      @NotBlank @Size(max = 160) String name,
      @DecimalMin("0") BigDecimal quantity,
      @Min(0) @Max(1_000_000_000_000L) long costBasisMinor,
      @Min(0) @Max(1_000_000_000_000L) long priceMinor,
      @Pattern(regexp = "^[A-Za-z]{3}$") String currency) {}

  @Serdeable
  public record PriceRequest(@Min(0) @Max(1_000_000_000_000L) long priceMinor) {}

  @Serdeable
  public record Slice(String symbol, long valueMinor, int percent) {}

  @Serdeable
  public record Summary(
      String currency,
      long valueMinor,
      long costMinor,
      long gainMinor,
      int gainPercent,
      List<Slice> allocation) {}

  private static final String SELECT =
      "SELECT id, account_id, symbol, name, quantity, cost_basis_minor, price_minor, currency, price_as_of, "
          + "ROUND(quantity * price_minor) AS value FROM holdings WHERE workspace_id = ? ";

  private final Db db;
  private final RefChecks refs;
  private final FxConverter fx;

  public InvestmentController(Db db, RefChecks refs, FxConverter fx) {
    this.db = db;
    this.refs = refs;
    this.fx = fx;
  }

  private static Holding map(java.sql.ResultSet rs) throws java.sql.SQLException {
    long value = rs.getBigDecimal("value").setScale(0, RoundingMode.HALF_UP).longValueExact();
    long cost = rs.getLong("cost_basis_minor");
    return new Holding(
        rs.getObject("id", UUID.class),
        rs.getObject("account_id", UUID.class),
        rs.getString("symbol"),
        rs.getString("name"),
        rs.getBigDecimal("quantity"),
        cost,
        rs.getLong("price_minor"),
        rs.getString("currency"),
        rs.getObject("price_as_of", LocalDate.class),
        value,
        value - cost);
  }

  @Get("/holdings")
  public List<Holding> list(@PathVariable UUID workspaceId) {
    return db.list(SELECT + "ORDER BY symbol", InvestmentController::map, workspaceId);
  }

  @Post("/holdings")
  public Holding create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    refs.account(workspaceId, body.accountId());
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO holdings(id, workspace_id, account_id, symbol, name, quantity, cost_basis_minor, price_minor, currency, price_as_of) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?)",
        id,
        workspaceId,
        body.accountId(),
        body.symbol().toUpperCase().trim(),
        body.name().trim(),
        body.quantity() == null ? BigDecimal.ZERO : body.quantity(),
        body.costBasisMinor(),
        body.priceMinor(),
        body.currency() == null ? "USD" : body.currency().toUpperCase(),
        LocalDate.now());
    return get(workspaceId, id);
  }

  @Put("/holdings/{id}")
  public Holding update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    refs.account(workspaceId, body.accountId());
    get(workspaceId, id);
    db.update(
        "UPDATE holdings SET account_id = ?, symbol = ?, name = ?, quantity = ?, cost_basis_minor = ?, price_minor = ? "
            + "WHERE workspace_id = ? AND id = ?",
        body.accountId(),
        body.symbol().toUpperCase().trim(),
        body.name().trim(),
        body.quantity() == null ? BigDecimal.ZERO : body.quantity(),
        body.costBasisMinor(),
        body.priceMinor(),
        workspaceId,
        id);
    return get(workspaceId, id);
  }

  @Put("/holdings/{id}/price")
  public Holding price(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body PriceRequest body) {
    get(workspaceId, id);
    db.update(
        "UPDATE holdings SET price_minor = ?, price_as_of = CURRENT_DATE WHERE workspace_id = ? AND id = ?",
        body.priceMinor(),
        workspaceId,
        id);
    return get(workspaceId, id);
  }

  @Delete("/holdings/{id}")
  public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    db.update("DELETE FROM holdings WHERE workspace_id = ? AND id = ?", workspaceId, id);
  }

  @Get("/investments/summary")
  public Summary summary(@PathVariable UUID workspaceId) {
    var converter = fx.forWorkspace(workspaceId);
    long value = 0;
    long cost = 0;
    List<Slice> slices = new ArrayList<>();
    for (Holding h : list(workspaceId)) {
      long v = converter.toBase(h.marketValueMinor(), h.currency());
      value += v;
      cost += converter.toBase(h.costBasisMinor(), h.currency());
      slices.add(new Slice(h.symbol(), v, 0));
    }
    final long total = value;
    List<Slice> allocation =
        slices.stream()
            .sorted(Comparator.comparingLong(Slice::valueMinor).reversed())
            .map(
                s ->
                    new Slice(
                        s.symbol(),
                        s.valueMinor(),
                        total > 0 ? (int) (s.valueMinor() * 100 / total) : 0))
            .toList();
    long gain = value - cost;
    return new Summary(
        converter.base(), value, cost, gain, cost > 0 ? (int) (gain * 100 / cost) : 0, allocation);
  }

  private Holding get(UUID ws, UUID id) {
    return db.one(SELECT + "AND id = ?", InvestmentController::map, ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Holding", id.toString()));
  }
}
