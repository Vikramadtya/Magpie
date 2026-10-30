package com.keeper.loan;

import com.keeper.common.Actor;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/loans")
@io.micronaut.validation.Validated
public class LoanController {
  private static final long MAX_MINOR = 1_000_000_000_000L;

  @Serdeable
  public record CreateRequest(
      @NotBlank @Size(max = 160) String person,
      @NotNull @Pattern(regexp = "^(BORROWED|LENT)$") String direction,
      @NotNull UUID accountId,
      @Positive @Max(MAX_MINOR) long amountMinor,
      @NotNull LocalDate occurredOn,
      LocalDate dueOn,
      @Size(max = 1000) String note) {}

  @Serdeable
  public record PaymentRequest(
      @NotNull UUID accountId,
      @Positive @Max(MAX_MINOR) long amountMinor,
      @NotNull LocalDate occurredOn,
      @Size(max = 1000) String note) {}

  private final LoanService service;

  public LoanController(LoanService service) {
    this.service = service;
  }

  @Get
  public LoanService.Overview overview(@PathVariable UUID workspaceId) {
    return service.overview(workspaceId);
  }

  @Get("/{id}")
  public LoanService.Detail detail(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.detail(workspaceId, id);
  }

  @Post
  public LoanService.Loan create(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body CreateRequest body) {
    return service.create(workspaceId, Actor.id(auth), body);
  }

  @Post("/{id}/payments")
  public LoanService.Loan repay(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body PaymentRequest body) {
    return service.repay(workspaceId, Actor.id(auth), id, body);
  }

  @Delete("/{id}")
  public void delete(Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.delete(workspaceId, Actor.id(auth), id);
  }
}
