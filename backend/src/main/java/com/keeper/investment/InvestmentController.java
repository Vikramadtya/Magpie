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
      java.time.Instant priceUpdatedAt,
      LocalDate purchasedOn,
      int lotCount) {}

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
      @Size(max = 20) String assetType,
      /** When the first purchase was made; optional. */
      LocalDate purchasedOn,
      /** Price paid per unit; when set it decides the first purchase's cost. */
      @Min(0) @Max(1_000_000_000_000L) Long unitPriceMinor) {}

  @Serdeable
  public record PurchaseRequest(
      @jakarta.validation.constraints.NotNull LocalDate boughtOn,
      @jakarta.validation.constraints.NotNull @DecimalMin(value = "0", inclusive = false)
          BigDecimal quantity,
      @Min(0) @Max(1_000_000_000_000L) long unitPriceMinor) {}

  @Get("/holdings/{id}/lots")
  public List<HoldingLots.Lot> purchases(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    get(workspaceId, id);
    return lots.list(workspaceId, id);
  }

  @Post("/holdings/{id}/lots")
  public Holding addPurchase(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body PurchaseRequest body) {
    get(workspaceId, id);
    lots.add(
        workspaceId,
        id,
        body.boughtOn(),
        body.quantity(),
        HoldingLots.costOf(body.quantity(), body.unitPriceMinor()));
    return get(workspaceId, id);
  }

  @Put("/holdings/{id}/lots/{lotId}")
  public Holding editPurchase(
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @PathVariable UUID lotId,
      @Valid @Body PurchaseRequest body) {
    get(workspaceId, id);
    lots.update(
        workspaceId,
        id,
        lotId,
        body.boughtOn(),
        body.quantity(),
        HoldingLots.costOf(body.quantity(), body.unitPriceMinor()));
    return get(workspaceId, id);
  }

  @Delete("/holdings/{id}/lots/{lotId}")
  public Holding removePurchase(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @PathVariable UUID lotId) {
    get(workspaceId, id);
    lots.remove(workspaceId, id, lotId);
    return get(workspaceId, id);
  }

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
          + "ROUND(quantity * price_minor) AS value, provider_symbol, exchange, asset_type, price_source, price_updated_at, purchased_on, "
          + "(SELECT count(*) FROM holding_lots x WHERE x.holding_id = holdings.id) AS lots "
          + "FROM holdings WHERE workspace_id = ? ";

  private final Db db;
  private final RefChecks refs;
  private final FxConverter fx;
  private final com.keeper.market.MarketDataService market;
  private final HoldingRefresher refresher;
  private final HoldingLots lots;

  public InvestmentController(
      Db db,
      RefChecks refs,
      FxConverter fx,
      com.keeper.market.MarketDataService market,
      HoldingRefresher refresher,
      HoldingLots lots) {
    this.lots = lots;
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
            : rs.getObject("price_updated_at", java.time.OffsetDateTime.class).toInstant(),
        rs.getObject("purchased_on", LocalDate.class),
        rs.getInt("lots"));
  }

  @Get("/holdings")
  public List<Holding> list(@PathVariable UUID workspaceId) {
    refresher.refreshInBackgroundIfStale(workspaceId);
    return db.list(SELECT + "ORDER BY symbol", InvestmentController::map, workspaceId);
  }

  /** The price and currency a holding should start with: live if an exact instrument was chosen. */
  private record Resolved(
      long priceMinor, String currency, boolean live, boolean fetched, String providerSymbol) {}

  private Resolved resolve(Request body) {
    String currency = body.currency() == null ? "USD" : body.currency().toUpperCase();
    if (body.providerSymbol() == null || body.providerSymbol().isBlank()) {
      // Typed by hand: still look for a live price under the same symbol, so nobody has to know
      // that picking from search is what makes a holding live.
      var found = refresher.findLive(body.symbol(), currency);
      if (found.isEmpty()) return new Resolved(body.priceMinor(), currency, false, false, null);
      return new Resolved(found.get().minor(), currency, true, true, found.get().providerSymbol());
    }
    var quote = market.quote(body.providerSymbol());
    if (quote.isEmpty()) {
      return new Resolved(body.priceMinor(), currency, true, false, body.providerSymbol().trim());
    }
    String quoteCurrency = quote.get().currency() == null ? currency : quote.get().currency();
    long minor = refresher.priceIn(quote.get(), quoteCurrency).orElse(body.priceMinor());
    return new Resolved(minor, quoteCurrency, true, true, body.providerSymbol().trim());
  }

  @Post("/holdings")
  public Holding create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    refs.account(workspaceId, body.accountId());
    Resolved r = resolve(body);
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO holdings(id, workspace_id, account_id, symbol, name, quantity, cost_basis_minor, price_minor, currency, price_as_of, "
            + "provider_symbol, exchange, asset_type, price_source, price_updated_at, purchased_on) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        workspaceId,
        body.accountId(),
        body.symbol().toUpperCase().trim(),
        body.name().trim(),
        BigDecimal.ZERO,
        0L,
        r.priceMinor(),
        r.currency(),
        LocalDate.now(),
        r.providerSymbol(),
        blank(body.exchange()),
        blank(body.assetType()),
        r.live() ? "LIVE" : "MANUAL",
        r.fetched() ? java.time.Instant.now() : null,
        null);
    firstPurchase(workspaceId, id, body);
    return get(workspaceId, id);
  }

  /** The opening purchase entered with a new holding; later ones are added as purchases. */
  private void firstPurchase(UUID ws, UUID holdingId, Request body) {
    if (body.quantity() == null || body.quantity().signum() <= 0) return;
    long cost =
        body.unitPriceMinor() != null
            ? HoldingLots.costOf(body.quantity(), body.unitPriceMinor())
            : body.costBasisMinor();
    lots.add(
        ws,
        holdingId,
        body.purchasedOn() == null ? LocalDate.now() : body.purchasedOn(),
        body.quantity(),
        cost);
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
            body.assetType(),
            body.purchasedOn(),
            body.unitPriceMinor());
    Resolved r = resolve(keep);
    long price = r.fetched() ? r.priceMinor() : body.priceMinor();
    db.update(
        "UPDATE holdings SET account_id = ?, symbol = ?, name = ?, price_minor = ?, "
            + "provider_symbol = ?, exchange = ?, asset_type = ?, price_source = ?, "
            + "price_updated_at = CASE WHEN ? THEN NOW() ELSE price_updated_at END WHERE workspace_id = ? AND id = ?",
        body.accountId(),
        body.symbol().toUpperCase().trim(),
        body.name().trim(),
        price,
        r.providerSymbol(),
        blank(body.exchange()),
        blank(body.assetType()),
        r.live() ? "LIVE" : "MANUAL",
        r.fetched(),
        workspaceId,
        id);
    if (current.lotCount() == 0) firstPurchase(workspaceId, id, body);
    return get(workspaceId, id);
  }

  /** Re-fetches live prices for every linked holding right now. */
  @Post("/holdings/refresh")
  public List<Holding> refresh(@PathVariable UUID workspaceId) {
    refresher.refreshNow(workspaceId, null);
    return list(workspaceId);
  }

  @Serdeable
  public record UploadedPrice(
      @NotBlank @Size(max = 40) String symbol,
      @DecimalMin(value = "0", inclusive = false)
          @jakarta.validation.constraints.DecimalMax("1000000000")
          BigDecimal price,
      @Pattern(regexp = "^[A-Za-z]{3}$") String currency) {}

  @Serdeable
  public record UploadRequest(@Size(min = 1, max = 500) List<@Valid UploadedPrice> prices) {}

  /** Applies prices gathered by the downloadable script (see the Investments page). */
  @Post("/holdings/prices")
  public HoldingRefresher.UploadResult uploadPrices(
      @PathVariable UUID workspaceId, @Valid @Body UploadRequest body) {
    return refresher.applyUploaded(
        workspaceId,
        body.prices().stream()
            .map(p -> new HoldingRefresher.Uploaded(p.symbol(), p.price(), p.currency()))
            .toList());
  }

  /** Re-fetches the live price of a single holding right now. */
  @Post("/holdings/{id}/refresh")
  public Holding refreshOne(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    get(workspaceId, id);
    refresher.refreshNow(workspaceId, id);
    return get(workspaceId, id);
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
