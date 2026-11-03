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
import jakarta.validation.constraints.Min;
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
      @Positive @Max(MAX_MINOR) Long accountAmountMinor,
      /** Who spent it when it is not the ledger owner; null means the owner. */
      UUID spentById) {}

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
      @Positive @Max(MAX_MINOR) Long accountAmountMinor,
      UUID spentById) {

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
          accountAmountMinor,
          spentById);
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
      @NotNull @Pattern(regexp = "^(DELETE|RECATEGORIZE|SPENT_BY)$") String action,
      @NotNull @Size(min = 1, max = 500) List<UUID> ids,
      UUID categoryId,
      UUID personId) {}

  @Serdeable
  public record BulkResult(int affected) {}

  @Serdeable
  public record NormalisedRequest(@Positive @Max(MAX_MINOR) long baseAmountMinor) {}

  private final TransactionService service;

  public TransactionController(TransactionService service) {
    this.service = service;
  }

  /** Every filter the list and the summary share. Several ids are comma-separated. */
  private static TransactionFilter filter(
      LocalDate from,
      LocalDate to,
      String accountIds,
      String categoryIds,
      String payeeIds,
      String tagIds,
      boolean uncategorised,
      Long minAmount,
      Long maxAmount,
      String type,
      String q,
      UUID tripId,
      String spentBy,
      String sort,
      UUID accountId,
      UUID categoryId,
      UUID payeeId,
      UUID tagId) {
    return new TransactionFilter(
        from,
        to,
        ids(accountIds, accountId),
        ids(categoryIds, categoryId),
        ids(payeeIds, payeeId),
        ids(tagIds, tagId),
        uncategorised,
        minAmount,
        maxAmount,
        type,
        q == null ? null : q.trim(),
        tripId,
        spentBy,
        sort);
  }

  private static List<UUID> ids(String commaSeparated, UUID single) {
    java.util.List<UUID> out = new java.util.ArrayList<>();
    if (single != null) out.add(single);
    if (commaSeparated != null && !commaSeparated.isBlank()) {
      for (String part : commaSeparated.split(",")) {
        if (part.isBlank()) continue;
        try {
          out.add(UUID.fromString(part.trim()));
        } catch (IllegalArgumentException e) {
          throw new com.keeper.common.exception.BadRequestException("Invalid id in filter");
        }
        if (out.size() > 50)
          throw new com.keeper.common.exception.BadRequestException("Too many values in a filter");
      }
    }
    return out;
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
      @Nullable @QueryValue @Size(max = 2000) String accountIds,
      @Nullable @QueryValue @Size(max = 2000) String categoryIds,
      @Nullable @QueryValue @Size(max = 2000) String payeeIds,
      @Nullable @QueryValue @Size(max = 2000) String tagIds,
      @QueryValue(defaultValue = "false") boolean uncategorised,
      @Nullable @QueryValue @Min(0) @Max(MAX_MINOR) Long minAmount,
      @Nullable @QueryValue @Min(0) @Max(MAX_MINOR) Long maxAmount,
      @Nullable @QueryValue @Pattern(regexp = "^(INCOME|EXPENSE|TRANSFER)$") String type,
      @Nullable @QueryValue @Size(max = 100) String q,
      @Nullable @QueryValue UUID tripId,
      @Nullable @QueryValue @Pattern(regexp = "^(me|[0-9a-fA-F-]{36})$") String spentBy,
      @Nullable @QueryValue @Pattern(regexp = "^(date_desc|date_asc|amount_desc|amount_asc)$")
          String sort) {
    return service.list(
        workspaceId,
        filter(
            from,
            to,
            accountIds,
            categoryIds,
            payeeIds,
            tagIds,
            uncategorised,
            minAmount,
            maxAmount,
            type,
            q,
            tripId,
            spentBy,
            sort,
            accountId,
            categoryId,
            payeeId,
            tagId),
        cursor,
        limit);
  }

  /** How many transactions match the filters, and what they add up to. */
  @Get("/transactions/summary")
  public TransactionSearch.Summary summary(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to,
      @Nullable @QueryValue @Size(max = 2000) String accountIds,
      @Nullable @QueryValue @Size(max = 2000) String categoryIds,
      @Nullable @QueryValue @Size(max = 2000) String payeeIds,
      @Nullable @QueryValue @Size(max = 2000) String tagIds,
      @QueryValue(defaultValue = "false") boolean uncategorised,
      @Nullable @QueryValue @Min(0) @Max(MAX_MINOR) Long minAmount,
      @Nullable @QueryValue @Min(0) @Max(MAX_MINOR) Long maxAmount,
      @Nullable @QueryValue @Pattern(regexp = "^(INCOME|EXPENSE|TRANSFER)$") String type,
      @Nullable @QueryValue @Size(max = 100) String q,
      @Nullable @QueryValue UUID tripId,
      @Nullable @QueryValue @Pattern(regexp = "^(me|[0-9a-fA-F-]{36})$") String spentBy) {
    return service.summary(
        workspaceId,
        filter(
            from,
            to,
            accountIds,
            categoryIds,
            payeeIds,
            tagIds,
            uncategorised,
            minAmount,
            maxAmount,
            type,
            q,
            tripId,
            spentBy,
            null,
            null,
            null,
            null,
            null));
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

  @Get("/transactions/deleted")
  public List<TransactionView> deleted(@PathVariable UUID workspaceId) {
    return service.deleted(workspaceId);
  }

  @Post("/transactions/{id}/undo")
  public TransactionService.UndoResult undo(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.undo(workspaceId, Actor.id(auth), id);
  }

  @Post("/transactions/{id}/restore")
  public TransactionView restore(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.restore(workspaceId, Actor.id(auth), id);
  }

  /** Overrides the base-currency value that reports use for this transaction. */
  @Put("/transactions/{id}/normalized")
  public TransactionView setNormalised(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body NormalisedRequest body) {
    return service.setNormalised(workspaceId, Actor.id(auth), id, body.baseAmountMinor());
  }

  /** Goes back to the exchange rate of the transaction's day. */
  @Delete("/transactions/{id}/normalized")
  public TransactionView resetNormalised(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.resetNormalised(workspaceId, Actor.id(auth), id);
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
        switch (body.action()) {
          case "DELETE" -> service.bulkDelete(workspaceId, actor, body.ids());
          case "SPENT_BY" -> service.bulkSpentBy(workspaceId, actor, body.ids(), body.personId());
          default -> service.bulkRecategorize(workspaceId, actor, body.ids(), body.categoryId());
        };
    return new BulkResult(n);
  }
}
