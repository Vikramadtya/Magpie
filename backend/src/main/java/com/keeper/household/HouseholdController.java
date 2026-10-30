package com.keeper.household;

import com.keeper.common.Actor;
import com.keeper.transaction.TransactionView;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}")
@io.micronaut.validation.Validated
public class HouseholdController {

  @Serdeable
  public record ShareRequest(@NotNull UUID householdId) {}

  @Serdeable
  public record SettleRequest(
      @NotNull UUID toUserId,
      @Positive @Max(1_000_000_000_000L) long amountMinor,
      @NotNull LocalDate occurredOn,
      @Size(max = 500) String note) {}

  private final HouseholdService household;
  private final HouseholdSummaryService summaries;

  public HouseholdController(HouseholdService household, HouseholdSummaryService summaries) {
    this.household = household;
    this.summaries = summaries;
  }

  /** Records a linked copy of one of your personal expenses in a household you belong to. */
  @Post("/transactions/{id}/share")
  public TransactionView share(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body ShareRequest body) {
    return household.share(workspaceId, Actor.id(auth), id, body.householdId());
  }

  @Delete("/transactions/{id}/share")
  public TransactionView unshare(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    return household.unshare(workspaceId, Actor.id(auth), id);
  }

  @Get("/household/summary")
  public HouseholdSummaryService.Summary summary(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "") String month) {
    YearMonth m;
    try {
      m = month.isBlank() ? YearMonth.now() : YearMonth.parse(month);
    } catch (java.time.format.DateTimeParseException e) {
      throw new com.keeper.common.exception.BadRequestException("month must be YYYY-MM");
    }
    return summaries.summary(workspaceId, m);
  }

  @Post("/household/settlements")
  public HouseholdSummaryService.SettlementView settle(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body SettleRequest body) {
    return summaries.settle(
        workspaceId,
        Actor.id(auth),
        body.toUserId(),
        body.amountMinor(),
        body.occurredOn(),
        body.note());
  }

  @Delete("/household/settlements/{id}")
  public void removeSettlement(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    summaries.removeSettlement(workspaceId, Actor.id(auth), id);
  }
}
