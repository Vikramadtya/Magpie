package com.keeper.billing;

import com.keeper.common.Actor;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/billing")
@io.micronaut.validation.Validated
public class BillingController {

  @Serdeable
  public record Prices(String currency, long monthlyMinor, long yearlyMinor) {}

  @Serdeable
  public record Summary(
      String plan,
      String source,
      Instant proUntil,
      boolean enforced,
      boolean paymentsOpen,
      Entitlements.Limits limits,
      Entitlements.Usage usage,
      Prices prices) {}

  @Serdeable
  public record RedeemRequest(@NotBlank @Size(max = 60) String code) {}

  @Serdeable
  public record QuoteRequest(
      @Pattern(regexp = "^(MONTHLY|YEARLY)$") String interval, @Size(max = 60) String code) {}

  private final Entitlements entitlements;
  private final CodeService codes;
  private final CheckoutProvider checkout;

  public BillingController(
      Entitlements entitlements, CodeService codes, CheckoutProvider checkout) {
    this.entitlements = entitlements;
    this.codes = codes;
    this.checkout = checkout;
  }

  private Summary summary(UUID ws) {
    var plan = entitlements.planOfWorkspace(ws);
    return new Summary(
        plan.plan(),
        plan.source(),
        plan.proUntil(),
        entitlements.enforced(),
        checkout.connected(),
        Entitlements.FREE,
        entitlements.usage(ws),
        new Prices(codes.currency(), codes.priceMinor("MONTHLY"), codes.priceMinor("YEARLY")));
  }

  @Get
  public Summary get(@PathVariable UUID workspaceId) {
    return summary(workspaceId);
  }

  @Serdeable
  public record RedeemResponse(CodeService.Redeemed redeemed, Summary summary) {}

  /** Uses an access code: Pro for the number of days it gives. */
  @Post("/redeem")
  public RedeemResponse redeem(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body RedeemRequest body) {
    var redeemed = codes.redeemAccess(Actor.id(auth), body.code());
    return new RedeemResponse(redeemed, summary(workspaceId));
  }

  /** The price with a discount code applied; asking does not use the code up. */
  @Post("/quote")
  public CodeService.Quote quote(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body QuoteRequest body) {
    return codes.quote(Actor.id(auth), body.interval(), body.code());
  }

  /** Sends the user to the provider's payment page. */
  @Post("/checkout")
  public CheckoutProvider.Session start(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body QuoteRequest body) {
    UUID user = Actor.id(auth);
    var quote = codes.quote(user, body.interval(), body.code());
    return checkout.start(user, quote.interval(), quote.firstPaymentMinor(), quote.code());
  }
}
