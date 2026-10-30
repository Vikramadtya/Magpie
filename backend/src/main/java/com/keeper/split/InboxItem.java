package com.keeper.split;

import io.micronaut.serde.annotation.Serdeable;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** One thing the split app sent, waiting for (or already past) review. */
@Serdeable
public record InboxItem(
    UUID id,
    String kind,
    String externalId,
    String groupId,
    String groupName,
    LocalDate occurredOn,
    String currency,
    long totalMinor,
    Boolean paidByMe,
    Long myShareMinor,
    String title,
    String counterparty,
    String direction,
    List<Share> shares,
    String status,
    UUID accountId,
    UUID tripId,
    Instant receivedAt) {

  /** What one friend owes for an expense. */
  @Serdeable
  public record Share(String name, long shareMinor) {}
}
