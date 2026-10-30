package com.keeper.split;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import io.micronaut.core.type.Argument;
import io.micronaut.json.JsonMapper;
import jakarta.inject.Singleton;
import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class SplitInboxRepository {
  static final String SOURCE = "expensesplit";

  /** Fields that decide whether a re-sent item has changed. */
  public record Incoming(
      String kind,
      String externalId,
      String version,
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
      List<InboxItem.Share> shares) {}

  /** What was recorded in Keeper when an item was accepted, so it can be reversed. */
  public record Created(UUID accountId, UUID tripId, List<UUID> txIds, List<UUID> loanIds) {}

  public record Existing(UUID id, String status, String appliedVersion, String version) {}

  private static final String COLS =
      "id, kind, external_id, group_ref, group_name, occurred_on, currency, total_minor, paid_by_me, my_share_minor, title, "
          + "counterparty, direction, shares::text, status, account_id, trip_id, received_at";

  private final Db db;
  private final JsonMapper json;
  private final RowMapper<InboxItem> mapper;

  public SplitInboxRepository(Db db, JsonMapper json) {
    this.db = db;
    this.json = json;
    this.mapper =
        rs ->
            new InboxItem(
                rs.getObject(1, UUID.class),
                rs.getString(2),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5),
                rs.getObject(6, LocalDate.class),
                rs.getString(7),
                rs.getLong(8),
                rs.getObject(9, Boolean.class),
                rs.getObject(10, Long.class),
                rs.getString(11),
                rs.getString(12),
                rs.getString(13),
                shares(rs.getString(14)),
                rs.getString(15),
                rs.getObject(16, UUID.class),
                rs.getObject(17, UUID.class),
                rs.getObject(18, OffsetDateTime.class).toInstant());
  }

  private List<InboxItem.Share> shares(String text) {
    try {
      return json.readValue(text, Argument.listOf(InboxItem.Share.class));
    } catch (IOException e) {
      return new ArrayList<>();
    }
  }

  private String write(List<InboxItem.Share> shares) {
    try {
      return json.writeValueAsString(shares);
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  public Optional<Existing> findExisting(UUID ws, String kind, String externalId) {
    return db.one(
        "SELECT id, status, applied_version, external_version FROM split_inbox WHERE workspace_id = ? AND source = ? AND kind = ? AND external_id = ?",
        rs ->
            new Existing(
                rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4)),
        ws,
        SOURCE,
        kind,
        externalId);
  }

  public void insert(UUID ws, Incoming i) {
    db.update(
        "INSERT INTO split_inbox(workspace_id, source, external_id, kind, group_ref, group_name, occurred_on, currency, total_minor, "
            + "paid_by_me, my_share_minor, title, counterparty, direction, shares, external_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?::jsonb,?)",
        ws,
        SOURCE,
        i.externalId(),
        i.kind(),
        i.groupId(),
        i.groupName(),
        i.occurredOn(),
        i.currency(),
        i.totalMinor(),
        i.paidByMe(),
        i.myShareMinor(),
        i.title(),
        i.counterparty(),
        i.direction(),
        write(i.shares()),
        i.version());
  }

  /** Overwrites the item's fields with the newest version and sets its status. */
  public void update(UUID id, Incoming i, String status) {
    db.update(
        "UPDATE split_inbox SET group_ref = ?, group_name = ?, occurred_on = ?, currency = ?, total_minor = ?, paid_by_me = ?, "
            + "my_share_minor = ?, title = ?, counterparty = ?, direction = ?, shares = ?::jsonb, external_version = ?, "
            + "status = ?, updated_at = NOW() WHERE id = ?",
        i.groupId(),
        i.groupName(),
        i.occurredOn(),
        i.currency(),
        i.totalMinor(),
        i.paidByMe(),
        i.myShareMinor(),
        i.title(),
        i.counterparty(),
        i.direction(),
        write(i.shares()),
        i.version(),
        status,
        id);
  }

  public void setStatus(UUID id, String status) {
    db.update("UPDATE split_inbox SET status = ?, updated_at = NOW() WHERE id = ?", status, id);
  }

  public void delete(UUID id) {
    db.update("DELETE FROM split_inbox WHERE id = ?", id);
  }

  public List<InboxItem> list(UUID ws, List<String> statuses) {
    return db.list(
        "SELECT "
            + COLS
            + " FROM split_inbox WHERE workspace_id = ? AND status = ANY(?) ORDER BY occurred_on DESC, received_at DESC",
        mapper,
        ws,
        statuses);
  }

  public Optional<InboxItem> find(UUID ws, UUID id) {
    return db.one(
        "SELECT " + COLS + " FROM split_inbox WHERE workspace_id = ? AND id = ?", mapper, ws, id);
  }

  public long countActionable(UUID ws) {
    return db.count(
        "SELECT count(*) FROM split_inbox WHERE workspace_id = ? AND status IN ('PENDING','CHANGED','REMOVED')",
        ws);
  }

  public void markAccepted(UUID id, Created c) {
    db.update(
        "UPDATE split_inbox SET status = 'ACCEPTED', applied_version = external_version, account_id = ?, trip_id = ?, "
            + "created_tx_ids = ?, created_loan_ids = ?, updated_at = NOW() WHERE id = ?",
        c.accountId(),
        c.tripId(),
        c.txIds(),
        c.loanIds(),
        id);
  }

  /** The records created when this item was last accepted. */
  public Created createdFor(UUID id) {
    return db.one(
            "SELECT account_id, trip_id, created_tx_ids, created_loan_ids FROM split_inbox WHERE id = ?",
            rs ->
                new Created(
                    rs.getObject(1, UUID.class),
                    rs.getObject(2, UUID.class),
                    uuids(rs, 3),
                    uuids(rs, 4)),
            id)
        .orElseThrow();
  }

  /** Accepts the new version as-is, leaving the already-created records alone. */
  public void keepAsIs(UUID id) {
    db.update(
        "UPDATE split_inbox SET status = 'ACCEPTED', applied_version = external_version, updated_at = NOW() WHERE id = ?",
        id);
  }

  private static List<UUID> uuids(java.sql.ResultSet rs, int col) throws java.sql.SQLException {
    Object[] arr = (Object[]) rs.getArray(col).getArray();
    List<UUID> out = new ArrayList<>(arr.length);
    for (Object o : arr) out.add((UUID) o);
    return out;
  }
}
