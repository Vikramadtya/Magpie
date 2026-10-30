package com.keeper.transaction;

import com.keeper.account.Account;
import com.keeper.transaction.TransactionRepository.Insert;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Builds the two legs of a transfer so they always share an id, date and note. */
@Singleton
public class TransferFactory {

  public record Legs(UUID transferId, Insert out, Insert in) {
    public List<Insert> both() {
      return List.of(out, in);
    }
  }

  public Legs create(
      UUID ws,
      Account from,
      Account to,
      long amountOut,
      long amountIn,
      LocalDate date,
      String note,
      String idempotencyKey,
      UUID actor) {
    UUID transferId = UUID.randomUUID();
    Insert out =
        new Insert(
            ws,
            from.id(),
            "TRANSFER",
            -1,
            amountOut,
            from.currency(),
            date,
            null,
            null,
            note,
            transferId,
            null,
            null,
            null,
            idempotencyKey,
            actor,
            null,
            null);
    Insert in =
        new Insert(
            ws,
            to.id(),
            "TRANSFER",
            1,
            amountIn,
            to.currency(),
            date,
            null,
            null,
            note,
            transferId,
            null,
            null,
            null,
            null,
            actor,
            null,
            null);
    return new Legs(transferId, out, in);
  }
}
