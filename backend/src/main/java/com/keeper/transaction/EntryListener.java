package com.keeper.transaction;

import java.util.UUID;

/** Told after a ledger entry changes, inside the same database transaction. */
public interface EntryListener {
  void created(UUID ws, UUID actor, TransactionView entry);

  void updated(UUID ws, UUID actor, TransactionView entry);

  void deleted(UUID ws, UUID entryId);

  void restored(UUID ws, UUID entryId);
}
