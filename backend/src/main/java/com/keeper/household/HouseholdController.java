package com.keeper.household;

import com.keeper.common.Actor;
import com.keeper.common.exception.BadRequestException;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/** A household is a read-only view over its members' own ledgers. */
@Controller("/api/v1/households")
@io.micronaut.validation.Validated
public class HouseholdController {

  @Serdeable
  public record NameRequest(@NotBlank @Size(max = 120) String name) {}

  @Serdeable
  public record InviteRequest(@NotBlank @Email @Size(max = 255) String email) {}

  @Serdeable
  public record SharingRequest(boolean spending, boolean netWorth, boolean investments) {}

  @Serdeable
  public record BudgetRequest(
      @NotBlank @Size(max = 120) String categoryName,
      @Min(0) @Max(1_000_000_000_000L) long amountMinor) {}

  private final HouseholdService service;
  private final HouseholdReport report;

  public HouseholdController(HouseholdService service, HouseholdReport report) {
    this.service = service;
    this.report = report;
  }

  @Get
  public List<Household> list(Authentication auth) {
    return service.list(Actor.id(auth));
  }

  @Post
  public Household create(Authentication auth, @Valid @Body NameRequest body) {
    return service.create(Actor.id(auth), body.name());
  }

  @Put("/{id}")
  public void rename(Authentication auth, @PathVariable UUID id, @Valid @Body NameRequest body) {
    service.rename(Actor.id(auth), id, body.name());
  }

  @Post("/{id}/members")
  public void invite(Authentication auth, @PathVariable UUID id, @Valid @Body InviteRequest body) {
    service.invite(Actor.id(auth), id, body.email());
  }

  @Post("/{id}/accept")
  public void accept(Authentication auth, @PathVariable UUID id) {
    service.accept(Actor.id(auth), id);
  }

  @Post("/{id}/leave")
  public void leave(Authentication auth, @PathVariable UUID id) {
    service.leave(Actor.id(auth), id);
  }

  @Delete("/{id}/members/{memberId}")
  public void remove(Authentication auth, @PathVariable UUID id, @PathVariable UUID memberId) {
    service.remove(Actor.id(auth), id, memberId);
  }

  @Put("/{id}/sharing")
  public void sharing(Authentication auth, @PathVariable UUID id, @Body SharingRequest body) {
    service.setSharing(Actor.id(auth), id, body.spending(), body.netWorth(), body.investments());
  }

  @Put("/{id}/budgets")
  public void setBudget(
      Authentication auth, @PathVariable UUID id, @Valid @Body BudgetRequest body) {
    service.setBudget(Actor.id(auth), id, body.categoryName(), body.amountMinor());
  }

  @Delete("/{id}/budgets")
  public void removeBudget(
      Authentication auth, @PathVariable UUID id, @QueryValue String categoryName) {
    service.removeBudget(Actor.id(auth), id, categoryName);
  }

  @Get("/{id}/summary")
  public HouseholdReport.Summary summary(
      Authentication auth, @PathVariable UUID id, @QueryValue(defaultValue = "") String month) {
    service.requireActive(Actor.id(auth), id);
    return report.summary(service.household(id), parse(month));
  }

  @Get("/{id}/trips")
  public List<HouseholdReport.TripLine> trips(Authentication auth, @PathVariable UUID id) {
    service.requireActive(Actor.id(auth), id);
    return report.trips(service.household(id));
  }

  @Get("/{id}/wealth")
  public HouseholdReport.Wealth wealth(Authentication auth, @PathVariable UUID id) {
    service.requireActive(Actor.id(auth), id);
    return report.wealth(service.household(id));
  }

  private static YearMonth parse(String month) {
    if (month == null || month.isBlank()) return YearMonth.now();
    try {
      return YearMonth.parse(month);
    } catch (RuntimeException e) {
      throw new BadRequestException("month must be YYYY-MM");
    }
  }
}
