package com.keeper.split;

import com.keeper.common.exception.BadRequestException;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Receives items from the expense-split app. Idempotent: sending the same item again changes
 * nothing, a changed item updates the inbox (and flags already-accepted items for review), a
 * deleted item is removed.
 */
@Singleton
public class SplitIngestService {

  @Serdeable
  public record Result(String externalId, String type, String outcome, String message) {}

  private final SplitInboxRepository inbox;

  public SplitIngestService(SplitInboxRepository inbox) {
    this.inbox = inbox;
  }

  public List<Result> ingest(UUID ws, List<IngestController.Item> items) {
    List<Result> results = new ArrayList<>();
    for (var item : items) {
      try {
        results.add(ingestOne(ws, item));
      } catch (BadRequestException e) {
        results.add(new Result(item.externalId(), item.type(), "REJECTED", e.getDetail()));
      }
    }
    return results;
  }

  private Result ingestOne(UUID ws, IngestController.Item item) {
    String kind = item.type();
    var existing = inbox.findExisting(ws, kind, item.externalId());

    if (Boolean.TRUE.equals(item.deleted())) {
      if (existing.isEmpty()) return result(item, "UNCHANGED", "Unknown item; nothing to remove");
      var e = existing.get();
      switch (e.status()) {
        case "PENDING", "DISMISSED" -> inbox.delete(e.id());
        case "ACCEPTED", "CHANGED" -> inbox.setStatus(e.id(), "REMOVED");
        default -> {
          return result(item, "UNCHANGED", "Already removed");
        }
      }
      return result(item, "REMOVED", null);
    }

    SplitInboxRepository.Incoming in = validate(item);
    if (existing.isEmpty()) {
      inbox.insert(ws, in);
      return result(item, "RECEIVED", null);
    }
    var e = existing.get();
    if (in.version().equals(e.version())) return result(item, "UNCHANGED", null);
    switch (e.status()) {
      case "PENDING", "DISMISSED" -> inbox.update(e.id(), in, e.status());
      case "ACCEPTED", "CHANGED" -> inbox.update(
          e.id(), in, "CHANGED"); // already in the ledger: needs a look
      default -> {
        return result(item, "UNCHANGED", "Removed in Keeper");
      }
    }
    return result(item, "UPDATED", null);
  }

  private static SplitInboxRepository.Incoming validate(IngestController.Item item) {
    boolean expense = "EXPENSE".equals(item.type());
    if (item.totalMinor() == null || item.totalMinor() <= 0)
      throw new BadRequestException("totalMinor must be positive");
    List<InboxItem.Share> shares = new ArrayList<>();
    if (item.shares() != null)
      item.shares().forEach(s -> shares.add(new InboxItem.Share(s.name().trim(), s.shareMinor())));

    if (expense) {
      if (item.paidByMe() == null)
        throw new BadRequestException("paidByMe is required for an expense");
      if (item.myShareMinor() == null)
        throw new BadRequestException("myShareMinor is required for an expense");
      long sum = item.myShareMinor() + shares.stream().mapToLong(InboxItem.Share::shareMinor).sum();
      if (sum != item.totalMinor()) {
        throw new BadRequestException(
            "myShareMinor plus the other shares ("
                + sum
                + ") must equal totalMinor ("
                + item.totalMinor()
                + ")");
      }
    } else {
      if (item.direction() == null)
        throw new BadRequestException("direction (RECEIVED or PAID) is required for a settlement");
      if (item.counterparty() == null || item.counterparty().isBlank())
        throw new BadRequestException("counterparty is required for a settlement");
    }
    String version =
        item.version() == null || item.version().isBlank()
            ? fingerprint(item, shares)
            : item.version().trim();
    return new SplitInboxRepository.Incoming(
        item.type(),
        item.externalId(),
        version,
        item.groupId(),
        item.groupName(),
        item.occurredOn(),
        item.currency().toUpperCase(),
        item.totalMinor(),
        expense ? item.paidByMe() : null,
        expense ? item.myShareMinor() : null,
        item.title(),
        expense ? null : item.counterparty().trim(),
        expense ? null : item.direction(),
        shares);
  }

  /**
   * Stands in for a version when the sender doesn't supply one: any change to the data changes it.
   */
  private static String fingerprint(IngestController.Item i, List<InboxItem.Share> shares) {
    try {
      String s =
          i.type()
              + i.occurredOn()
              + i.currency()
              + i.totalMinor()
              + i.paidByMe()
              + i.myShareMinor()
              + i.title()
              + i.direction()
              + i.counterparty()
              + i.groupId()
              + i.groupName()
              + shares;
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)))
          .substring(0, 24);
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private static Result result(IngestController.Item item, String outcome, String message) {
    return new Result(item.externalId(), item.type(), outcome, message);
  }
}
