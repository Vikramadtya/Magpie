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
      long gainMinor,
      String providerSymbol,
      String exchange,
      String assetType,
      String priceSource,
      java.time.Instant priceUpdatedAt) {}

  @Serdeable
  public record Request(
      UUID accountId,
      @NotBlank @Size(max = 20) String symbol,
      @NotBlank @Size(max = 160) String name,
      @DecimalMin("0") BigDecimal quantity,
      @Min(0) @Max(1_000_000_000_000L) long costBasisMinor,
      @Min(0) @Max(1_000_000_000_000L) long priceMinor,
      @Pattern(regexp = "^[A-Za-z]{3}$") String currency,
      /** Exact instrument chosen from market search; makes the price live. */
      @Size(max = 40) String providerSymbol,
      @Size(max = 40) String exchange,
      @Size(max = 20) String assetType) {}

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
          + "ROUND(quantity * price_minor) AS value, provider_symbol, exchange, asset_type, price_source, price_updated_at "
          + "FROM holdings WHERE workspace_id = ? ";

  private final Db db;
  private final RefChecks refs;
  private final FxConverter fx;
  private final com.keeper.market.MarketDataService market;
  private final HoldingRefresher refresher;

  public InvestmentController(
      Db db,
      RefChecks refs,
      FxConverter fx,
      com.keeper.market.MarketDataService market,
      HoldingRefresher refresher) {
    this.db = db;
    this.refs = refs;
    this.fx = fx;
    this.market = market;
    this.refresher = refresher;
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
        value - cost,
        rs.getString("provider_symbol"),
        rs.getString("exchange"),
        rs.getString("asset_type"),
        rs.getString("price_source"),
        rs.getObject("price_updated_at", java.time.OffsetDateTime.class) == null
            ? null
            : rs.getObject("price_updated_at", java.time.OffsetDateTime.class).toInstant());
  }

  @Get("/holdings")
  public List<Holding> list(@PathVariable UUID workspaceId) {
    refresher.refreshInBackgroundIfStale(workspaceId);
    return db.list(SELECT + "ORDER BY symbol", InvestmentController::map, workspaceId);
  }

  /** The price and currency a holding should start with: live if an exact instrument was chosen. */
  private record Resolved(long priceMinor, String currency, boolean live, boolean fetched) {}

  private Resolved resolve(Request body) {
    String currency = body.currency() == null ? "USD" : body.currency().toUpperCase();
    if (body.providerSymbol() == null || body.providerSymbol().isBlank()) {
      return new Resolved(body.priceMinor(), currency, false, false);
    }
    var quote = market.quote(body.providerSymbol());
    if (quote.isEmpty()) return new Resolved(body.priceMinor(), currency, true, false);
    String quoteCurrency = quote.get().currency() == null ? currency : quote.get().currency();
    long minor = refresher.priceIn(quote.get(), quoteCurrency).orElse(body.priceMinor());
    return new Resolved(minor, quoteCurrency, true, true);
  }

  @Post("/holdings")
  public Holding create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    refs.account(workspaceId, body.accountId());
    Resolved r = resolve(body);
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO holdings(id, workspace_id, account_id, symbol, name, quantity, cost_basis_minor, price_minor, currency, price_as_of, "
            + "provider_symbol, exchange, asset_type, price_source, price_updated_at) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        workspaceId,
        body.accountId(),
        body.symbol().toUpperCase().trim(),
        body.name().trim(),
        body.quantity() == null ? BigDecimal.ZERO : body.quantity(),
        body.costBasisMinor(),
        r.priceMinor(),
        r.currency(),
        LocalDate.now(),
        blank(body.providerSymbol()),
        blank(body.exchange()),
        blank(body.assetType()),
        r.live() ? "LIVE" : "MANUAL",
        r.fetched() ? java.time.Instant.now() : null);
    return get(workspaceId, id);
  }

  @Put("/holdings/{id}")
  public Holding update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    refs.account(workspaceId, body.accountId());
    Holding current = get(workspaceId, id);
    // keep the holding's currency: its cost basis is expressed in it
    Request keep =
        new Request(
            body.accountId(),
            body.symbol(),
            body.name(),
            body.quantity(),
            body.costBasisMinor(),
            body.priceMinor(),
            current.currency(),
            body.providerSymbol(),
            body.exchange(),
            body.assetType());
    Resolved r = resolve(keep);
    long price = r.fetched() ? r.priceMinor() : body.priceMinor();
    db.update(
        "UPDATE holdings SET account_id = ?, symbol = ?, name = ?, quantity = ?, cost_basis_minor = ?, price_minor = ?, "
            + "provider_symbol = ?, exchange = ?, asset_type = ?, price_source = ?, "
            + "price_updated_at = CASE WHEN ? THEN NOW() ELSE price_updated_at END WHERE workspace_id = ? AND id = ?",
        body.accountId(),
        body.symbol().toUpperCase().trim(),
        body.name().trim(),
        body.quantity() == null ? BigDecimal.ZERO : body.quantity(),
        body.costBasisMinor(),
        price,
        blank(body.providerSymbol()),
        blank(body.exchange()),
        blank(body.assetType()),
        r.live() ? "LIVE" : "MANUAL",
        r.fetched(),
        workspaceId,
        id);
    return get(workspaceId, id);
  }

  /** Re-fetches live prices for every linked holding right now. */
  @Post("/holdings/refresh")
  public List<Holding> refresh(@PathVariable UUID workspaceId) {
    refresher.refreshWorkspace(workspaceId);
    return list(workspaceId);
  }

  private static String blank(String s) {
    return s == null || s.isBlank() ? null : s.trim();
  }

  @Put("/holdings/{id}/price")
  public Holding price(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body PriceRequest body) {
    get(workspaceId, id);
    db.update(
        "UPDATE holdings SET price_minor = ?, price_as_of = CURRENT_DATE, price_source = 'MANUAL', price_updated_at = NOW() "
            + "WHERE workspace_id = ? AND id = ?",
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
