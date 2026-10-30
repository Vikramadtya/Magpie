package com.keeper.fx;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

/** Lets the UI preview a conversion with the exact same rates the server will apply. */
@Controller("/api/v1/fx")
@io.micronaut.validation.Validated
public class FxController {

  @Serdeable
  public record Quote(boolean available, BigDecimal rate, Long convertedMinor) {}

  private final FxConverter fx;

  public FxController(FxConverter fx) {
    this.fx = fx;
  }

  @Get("/convert")
  public Quote convert(
      @QueryValue @Pattern(regexp = "^[A-Za-z]{3}$") String from,
      @QueryValue @Pattern(regexp = "^[A-Za-z]{3}$") String to,
      @QueryValue(defaultValue = "0") long amountMinor) {
    String f = from.toUpperCase();
    String t = to.toUpperCase();
    return fx.rate(f, t)
        .map(r -> new Quote(true, r, CurrencyUnits.convert(amountMinor, f, t, r)))
        .orElse(new Quote(false, null, null));
  }
}
