package com.keeper.transaction;

import com.keeper.common.Actor;
import com.keeper.common.CursorPage;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Header;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}")
@io.micronaut.validation.Validated
public class TransactionController {
  private static final long MAX_MINOR = 1_000_000_000_000L;

  /** Create/replace body for an income or expense. */
  @Serdeable
  public record Request(
      @NotNull UUID accountId,
      @NotNull @Pattern(regexp = "^(INCOME|EXPENSE)$") String type,
      @Positive @Max(MAX_MINOR) long amountMinor,
      @NotNull LocalDate occurredOn,
      UUID categoryId,
      UUID payeeId,
      @Size(max = 1000) String note,
      @Size(max = 20) List<UUID> tagIds,
      /** Currency the amount was entered in; defaults to the account's. */
      @Pattern(regexp = "^[A-Za-z]{3}$") String currency,
      /**
       * Exact amount in the account's currency when the entered currency differs (overrides the
       * rate).
       */
      @Positive @Max(MAX_MINOR) Long accountAmountMinor) {}

  /** Same fields as Request plus the version the client last saw (optimistic locking). */
  @Serdeable
  public record UpdateRequest(
      Integer expectedVersion,
      @NotNull UUID accountId,
      @NotNull @Pattern(regexp = "^(INCOME|EXPENSE|TRANSFER)$") String type,
      @Positive @Max(MAX_MINOR) long amountMinor,
      @NotNull LocalDate occurredOn,
      UUID categoryId,
      UUID payeeId,
      @Size(max = 1000) String note,
      @Size(max = 20) List<UUID> tagIds,
      @Pattern(regexp = "^[A-Za-z]{3}$") String currency,
      @Positive @Max(MAX_MINOR) Long accountAmountMinor) {

    Request toRequest() {
      return new Request(
          accountId,
          type,
          amountMinor,
          occurredOn,
          categoryId,
          payeeId,
          note,
          tagIds,
          currency,
          accountAmountMinor);
    }
  }

  @Serdeable
  public record TransferRequest(
      @NotNull UUID fromAccountId,
      @NotNull UUID toAccountId,
      @Positive @Max(MAX_MINOR) long amountMinor,
      @Positive @Max(MAX_MINOR) Long destAmountMinor,
      @NotNull LocalDate occurredOn,
      @Size(max = 1000) String note) {}

  @Serdeable
  public record BulkRequest(
      @NotNull @Pattern(regexp = "^(DELETE|RECATEGORIZE)$") String action,
      @NotNull @Size(min = 1, max = 500) List<UUID> ids,
      UUID categoryId) {}

  @Serdeable
  public record BulkResult(int affected) {}

  private final TransactionService service;

  public TransactionController(TransactionService service) {
    this.service = service;
  }

  @Get("/transactions")
  public CursorPage<TransactionView> list(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue String cursor,
      @QueryValue(defaultValue = "50") int limit,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to,
      @Nullable @QueryValue UUID accountId,
      @Nullable @QueryValue UUID categoryId,
      @Nullable @QueryValue UUID payeeId,
      @Nullable @QueryValue UUID tagId,
      @Nullable @QueryValue @Pattern(regexp = "^(INCOME|EXPENSE|TRANSFER)$") String type,
      @Nullable @QueryValue @Size(max = 100) String q) {
    return service.list(
        workspaceId,
        new TransactionFilter(from, to, accountId, categoryId, payeeId, tagId, type, q),
        cursor,
        limit);
  }

  @Get("/transactions/{id}")
  public TransactionView get(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.get(workspaceId, id);
  }

  @Post("/transactions")
  public TransactionView create(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @Nullable @Header("Idempotency-Key") @Size(max = 100) String idempotencyKey,
      @Valid @Body Request body) {
    return service.create(workspaceId, Actor.id(auth), idempotencyKey, body);
  }

  @Put("/transactions/{id}")
  public TransactionView update(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body UpdateRequest body) {
    return service.update(workspaceId, Actor.id(auth), id, body);
  }

  @Delete("/transactions/{id}")
  public void delete(Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.delete(workspaceId, Actor.id(auth), id);
  }

  @Post("/transfers")
  public List<TransactionView> transfer(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @Nullable @Header("Idempotency-Key") @Size(max = 100) String idempotencyKey,
      @Valid @Body TransferRequest body) {
    return service.transfer(workspaceId, Actor.id(auth), idempotencyKey, body);
  }

  @Post("/transactions/bulk")
  public BulkResult bulk(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body BulkRequest body) {
    UUID actor = Actor.id(auth);
    int n =
        "DELETE".equals(body.action())
            ? service.bulkDelete(workspaceId, actor, body.ids())
            : service.bulkRecategorize(workspaceId, actor, body.ids(), body.categoryId());
    return new BulkResult(n);
  }
}
