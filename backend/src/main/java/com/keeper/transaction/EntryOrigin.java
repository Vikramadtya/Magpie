package com.keeper.transaction;

import java.util.UUID;

/** Where an entry came from, when it was not typed in by hand. */
public record EntryOrigin(
    UUID recurringRuleId,
    String importHash,
    UUID importBatchId,
    UUID loanId,
    UUID sharedGroupId,
    boolean sharedCopy) {

  public static final EntryOrigin NONE = new EntryOrigin(null, null, null, null, null, false);

  public static EntryOrigin recurring(UUID ruleId) {
    return new EntryOrigin(ruleId, null, null, null, null, false);
  }

  public static EntryOrigin imported(String hash, UUID batchId) {
    return new EntryOrigin(null, hash, batchId, null, null, false);
  }

  public static EntryOrigin loan(UUID loanId) {
    return new EntryOrigin(null, null, null, loanId, null, false);
  }

  public static EntryOrigin sharedCopy(UUID groupId) {
    return new EntryOrigin(null, null, null, null, groupId, true);
  }
}
