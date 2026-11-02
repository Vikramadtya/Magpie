package com.keeper.capture;

import com.keeper.common.Actor;
import com.keeper.common.RefChecks;
import com.keeper.common.db.Db;
import com.keeper.common.exception.ConflictException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.payee.PayeeRepository;
import com.keeper.transaction.TransactionController;
import com.keeper.transaction.TransactionService;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Transactions typed into the quick-add page, waiting to be checked and recorded. */
@Controller("/api/v1/workspaces/{workspaceId}/captures")
@io.micronaut.validation.Validated
public class CaptureController {

  /** What the owner confirms when recording one; everything but the account is optional. */
  @Serdeable
  public record AcceptRequest(
      @NotNull UUID accountId,
      UUID categoryId,
      @Size(max = 160) String payee,
      LocalDate occurredOn,
      @Positive @Max(1_000_000_000_000L) Long amountMinor,
      @Size(max = 1000) String note) {}

  private final CaptureRepository captures;
  private final TransactionService transactions;
  private final PayeeRepository payees;
  private final RefChecks refs;
  private final Db db;

  public CaptureController(
      CaptureRepository captures,
      TransactionService transactions,
      PayeeRepository payees,
      RefChecks refs,
      Db db) {
    this.captures = captures;
    this.transactions = transactions;
    this.payees = payees;
    this.refs = refs;
    this.db = db;
  }

  @Get
  public List<CaptureRepository.Capture> list(@PathVariable UUID workspaceId) {
    return captures.pending(workspaceId);
  }

  @Post("/{id}/accept")
  public CaptureRepository.Capture accept(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body AcceptRequest body) {
    refs.account(workspaceId, body.accountId());
    refs.category(workspaceId, body.categoryId());
    return db.tx(
        () -> {
          CaptureRepository.Capture c =
              captures
                  .find(workspaceId, id)
                  .orElseThrow(() -> new ResourceNotFoundException("Quick add", id.toString()));
          if (!"PENDING".equals(c.status())) throw new ConflictException("Already reviewed");
          String payeeName = body.payee() != null ? body.payee().trim() : c.payeeText();
          UUID payeeId =
              payeeName == null || payeeName.isBlank()
                  ? null
                  : payees.upsert(workspaceId, payeeName, null).id();
          // The amount was typed in the currency of the account chosen on the phone; if another
          // account is picked here the normal conversion applies.
          boolean edited = body.amountMinor() != null;
          var request =
              new TransactionController.Request(
                  body.accountId(),
                  c.type(),
                  edited ? body.amountMinor() : c.amountMinor(),
                  body.occurredOn() != null ? body.occurredOn() : c.occurredOn(),
                  body.categoryId() != null ? body.categoryId() : c.categoryId(),
                  payeeId,
                  body.note() != null ? body.note() : c.note(),
                  List.of(),
                  edited ? null : c.currency(),
                  null,
                  null);
          var tx = transactions.create(workspaceId, Actor.id(auth), "capture:" + c.id(), request);
          captures.markAccepted(workspaceId, id, tx.id());
          return captures.find(workspaceId, id).orElseThrow();
        });
  }

  @Post("/{id}/dismiss")
  public CaptureRepository.Capture dismiss(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    captures
        .find(workspaceId, id)
        .orElseThrow(() -> new ResourceNotFoundException("Quick add", id.toString()));
    captures.dismiss(workspaceId, id);
    return captures.find(workspaceId, id).orElseThrow();
  }
}
