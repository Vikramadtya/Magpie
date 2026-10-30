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
    return new Legs(
        transferId,
        leg(ws, from, -1, amountOut, date, note, transferId, idempotencyKey, actor),
        leg(ws, to, 1, amountIn, date, note, transferId, null, actor));
  }

  private static Insert leg(
      UUID ws,
      Account account,
      int direction,
      long amount,
      LocalDate date,
      String note,
      UUID transferId,
      String idempotencyKey,
      UUID actor) {
    return new Insert(
        ws,
        account.id(),
        "TRANSFER",
        direction,
        amount,
        account.currency(),
        date,
        null,
        null,
        note,
        transferId,
        EntryOrigin.NONE,
        idempotencyKey,
        actor,
        null,
        null,
        Normalised.NONE);
  }
}
