package com.keeper.market;

import com.keeper.fx.CurrencyUnits;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.RoundingMode;
import java.util.List;

@Controller("/api/v1/market")
@io.micronaut.validation.Validated
public class MarketController {

  @Serdeable
  public record Priced(
      boolean available,
      String symbol,
      String name,
      String currency,
      String exchange,
      Long priceMinor,
      String source) {}

  private final MarketDataService market;

  public MarketController(MarketDataService market) {
    this.market = market;
  }

  /** Look a security up by name or ticker so the exact instrument is chosen, not typed. */
  @Get("/search")
  public List<SecurityHit> search(@QueryValue @NotBlank @Size(min = 2, max = 60) String q) {
    return market.search(q);
  }

  @Get("/quote")
  public Priced quote(@QueryValue @NotBlank @Size(max = 40) String symbol) {
    return market
        .quote(symbol)
        .map(
            q -> {
              String cur = q.currency() == null ? "USD" : q.currency();
              long minor =
                  q.price()
                      .movePointRight(CurrencyUnits.exponent(cur))
                      .setScale(0, RoundingMode.HALF_UP)
                      .longValueExact();
              return new Priced(true, q.symbol(), q.name(), cur, q.exchange(), minor, q.source());
            })
        .orElse(new Priced(false, symbol, null, null, null, null, null));
  }
}
