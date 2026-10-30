package com.keeper.account;

import com.keeper.common.Actor;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Patch;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/accounts")
@io.micronaut.validation.Validated
public class AccountController {
  static final String TYPES = "^(CHECKING|SAVINGS|CREDIT_CARD|CASH|LOAN|INVESTMENT|OTHER)$";

  @Serdeable
  public record CreateRequest(
      @NotBlank @Size(max = 120) String name,
      @NotBlank @Pattern(regexp = TYPES) String type,
      @NotBlank @Pattern(regexp = "^[A-Za-z]{3}$") String currency,
      @Min(-1_000_000_000_000L) @Max(1_000_000_000_000L) long openingBalanceMinor) {}

  @Serdeable
  public record UpdateRequest(
      @Size(min = 1, max = 120) String name,
      @Pattern(regexp = TYPES) String type,
      Boolean archived,
      Integer sortOrder,
      @Min(-1_000_000_000_000L) @Max(1_000_000_000_000L) Long openingBalanceMinor) {}

  private final AccountService service;

  public AccountController(AccountService service) {
    this.service = service;
  }

  @Get
  public List<Account> list(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "false") boolean includeArchived) {
    return service.list(workspaceId, includeArchived);
  }

  @Post
  public Account create(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body CreateRequest body) {
    return service.create(workspaceId, Actor.id(auth), body);
  }

  @Get("/{id}")
  public Account get(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.get(workspaceId, id);
  }

  @Patch("/{id}")
  public Account update(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body UpdateRequest body) {
    return service.update(workspaceId, Actor.id(auth), id, body);
  }

  @Delete("/{id}")
  public void delete(Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.delete(workspaceId, Actor.id(auth), id);
  }

  @Post("/{id}/recalculate")
  public Account recalculate(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.recalculate(workspaceId, id);
  }
}
