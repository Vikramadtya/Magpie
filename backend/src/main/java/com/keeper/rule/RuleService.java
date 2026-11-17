package com.keeper.rule;

import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.crypto.FieldCrypto;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Rules that file a transaction under a category by what it looks like: its payee or note, and its
 * amount. Notes are encrypted, so matching on past entries happens here, after reading them.
 */
@Singleton
public class RuleService {
  private static final int CANDIDATES = 5000;

  /** What a rule says, with no database around it. */
  public record Def(
      String text,
      String textOp,
      String amountOp,
      Long amountMin,
      Long amountMax,
      String type,
      UUID categoryId) {}

  @Serdeable
  public record Rule(
      UUID id,
      String name,
      String text,
      String textOp,
      String amountOp,
      Long amountMin,
      Long amountMax,
      String type,
      UUID categoryId,
      String categoryName,
      boolean active,
      int position) {}

  @Serdeable
  public record Sample(String title, long amountMinor, String type) {}

  @Serdeable
  public record Test(int matches, List<Sample> samples) {}

  @Serdeable
  public record Applied(int updated) {}

  private record Candidate(UUID id, String type, long amount, String payee, String note) {}

  private final Db db;
  private final FieldCrypto crypto;

  public RuleService(Db db, FieldCrypto crypto) {
    this.db = db;
    this.crypto = crypto;
  }

  // ---------- the matching itself ----------

  /** The comma-separated alternatives of a text match, lower-cased and trimmed. */
  static List<String> words(String text) {
    if (text == null) return List.of();
    return Arrays.stream(text.split(","))
        .map(w -> w.trim().toLowerCase(Locale.ROOT))
        .filter(w -> !w.isEmpty())
        .toList();
  }

  /** True when the transaction satisfies every condition the rule has. */
  public static boolean matches(Def r, String payee, String note, long amountMinor, String type) {
    if (r.type() != null && !r.type().equals(type)) return false;
    List<String> words = words(r.text());
    if (!words.isEmpty()) {
      String p = payee == null ? "" : payee.toLowerCase(Locale.ROOT);
      String n = note == null ? "" : note.toLowerCase(Locale.ROOT);
      boolean any =
          words.stream()
              .anyMatch(
                  w ->
                      switch (r.textOp()) {
                        case "EQUALS" -> p.equals(w) || n.equals(w);
                        case "STARTS_WITH" -> p.startsWith(w) || n.startsWith(w);
                        default -> p.contains(w) || n.contains(w);
                      });
      if (!any) return false;
    }
    if (r.amountOp() != null) {
      Long lo = r.amountMin();
      Long hi = r.amountMax();
      boolean ok =
          switch (r.amountOp()) {
            case "GT" -> lo != null && amountMinor > lo;
            case "LT" -> lo != null && amountMinor < lo;
            case "EQ" -> lo != null && amountMinor == lo;
            case "BETWEEN" -> lo != null && hi != null && amountMinor >= lo && amountMinor <= hi;
            default -> false;
          };
      if (!ok) return false;
    }
    return true;
  }

  // ---------- storing rules ----------

  private static final String SELECT =
      "SELECT r.id, r.name, r.text_match, r.text_op, r.amount_op, r.amount_min, r.amount_max, r.tx_type, "
          + "r.category_id, c.name, r.active, r.position FROM rules r JOIN categories c ON c.id = r.category_id "
          + "WHERE r.workspace_id = ?";

  private static Rule map(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new Rule(
        rs.getObject(1, UUID.class),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getString(5),
        (Long) rs.getObject(6),
        (Long) rs.getObject(7),
        rs.getString(8),
        rs.getObject(9, UUID.class),
        rs.getString(10),
        rs.getBoolean(11),
        rs.getInt(12));
  }

  public List<Rule> list(UUID ws) {
    return db.list(SELECT + " ORDER BY r.position, r.created_at", RuleService::map, ws);
  }

  private Rule get(UUID ws, UUID id) {
    return db.one(SELECT + " AND r.id = ?", RuleService::map, ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Rule", id.toString()));
  }

  private Def validate(UUID ws, RuleController.Request r) {
    String text = r.text() == null || r.text().isBlank() ? null : r.text().trim();
    if (text == null && r.amountOp() == null)
      throw new BadRequestException("A rule needs words to look for, an amount condition, or both");
    if (r.amountOp() != null) {
      if (r.amountMin() == null) throw new BadRequestException("Give the amount to compare with");
      if ("BETWEEN".equals(r.amountOp())
          && (r.amountMax() == null || r.amountMax() < r.amountMin()))
        throw new BadRequestException("The upper amount must be at least the lower one");
    }
    var kind =
        db.one(
                "SELECT kind FROM categories WHERE id = ? AND workspace_id = ?",
                rs -> rs.getString(1),
                r.categoryId(),
                ws)
            .orElseThrow(() -> new BadRequestException("Unknown category"));
    if (r.type() != null && !r.type().equals(kind))
      throw new BadRequestException(
          "That category is for " + kind.toLowerCase() + ", not " + r.type().toLowerCase());
    return new Def(
        text,
        r.textOp() == null ? "CONTAINS" : r.textOp(),
        r.amountOp(),
        r.amountMin(),
        r.amountMax(),
        r.type(),
        r.categoryId());
  }

  public Rule create(UUID ws, RuleController.Request r) {
    Def d = validate(ws, r);
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO rules(id, workspace_id, name, text_match, text_op, amount_op, amount_min, amount_max, tx_type, category_id, position) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?, COALESCE((SELECT MAX(position) + 1 FROM rules WHERE workspace_id = ?), 0))",
        id,
        ws,
        r.name().trim(),
        d.text(),
        d.textOp(),
        d.amountOp(),
        d.amountMin(),
        d.amountMax(),
        d.type(),
        d.categoryId(),
        ws);
    return get(ws, id);
  }

  public Rule update(UUID ws, UUID id, RuleController.Request r) {
    get(ws, id);
    Def d = validate(ws, r);
    db.update(
        "UPDATE rules SET name = ?, text_match = ?, text_op = ?, amount_op = ?, amount_min = ?, amount_max = ?, tx_type = ?, "
            + "category_id = ?, active = COALESCE(?, active) WHERE id = ? AND workspace_id = ?",
        r.name().trim(),
        d.text(),
        d.textOp(),
        d.amountOp(),
        d.amountMin(),
        d.amountMax(),
        d.type(),
        d.categoryId(),
        r.active(),
        id,
        ws);
    return get(ws, id);
  }

  public void delete(UUID ws, UUID id) {
    db.update("DELETE FROM rules WHERE id = ? AND workspace_id = ?", id, ws);
  }

  public void reorder(UUID ws, List<UUID> ids) {
    for (int i = 0; i < ids.size(); i++)
      db.update(
          "UPDATE rules SET position = ? WHERE id = ? AND workspace_id = ?", i, ids.get(i), ws);
  }

  // ---------- using rules ----------

  private static Def def(Rule r) {
    return new Def(
        r.text(), r.textOp(), r.amountOp(), r.amountMin(), r.amountMax(), r.type(), r.categoryId());
  }

  /** The category the first matching active rule gives a new entry, if any. */
  public Optional<UUID> firstMatch(
      UUID ws, String type, long amountMinor, String payee, String note) {
    return db
        .list(SELECT + " AND r.active ORDER BY r.position, r.created_at", RuleService::map, ws)
        .stream()
        .filter(r -> matches(def(r), payee, note, amountMinor, type))
        .map(Rule::categoryId)
        .filter(c -> categoryKindIs(ws, c, type))
        .findFirst();
  }

  private boolean categoryKindIs(UUID ws, UUID categoryId, String type) {
    return db.one(
            "SELECT kind FROM categories WHERE id = ? AND workspace_id = ?",
            rs -> rs.getString(1),
            categoryId,
            ws)
        .map(type::equals)
        .orElse(false);
  }

  private List<Candidate> uncategorised(UUID ws) {
    return db.list(
        "SELECT t.id, t.type, t.amount_minor, p.name, t.note FROM transactions t LEFT JOIN payees p ON p.id = t.payee_id "
            + "WHERE t.workspace_id = ? AND t.category_id IS NULL AND t.deleted_at IS NULL AND t.loan_id IS NULL "
            + "AND t.type IN ('INCOME','EXPENSE') ORDER BY t.occurred_on DESC LIMIT "
            + CANDIDATES,
        rs ->
            new Candidate(
                rs.getObject(1, UUID.class),
                rs.getString(2),
                rs.getLong(3),
                rs.getString(4),
                rs.getString(5) == null ? null : crypto.open(rs.getString(5))),
        ws);
  }

  /** How many uncategorised entries a rule (saved or not) would catch, with a few examples. */
  public Test test(UUID ws, RuleController.Request r) {
    Def d = validate(ws, r);
    List<Sample> samples = new ArrayList<>();
    int n = 0;
    for (Candidate c : uncategorised(ws)) {
      if (!matches(d, c.payee(), c.note(), c.amount(), c.type())) continue;
      if (!categoryKindIs(ws, d.categoryId(), c.type())) continue;
      n++;
      if (samples.size() < 5)
        samples.add(
            new Sample(
                c.payee() != null ? c.payee() : c.note() != null ? c.note() : "Entry",
                c.amount(),
                c.type()));
    }
    return new Test(n, samples);
  }

  private int apply(UUID ws, List<Rule> rules) {
    int updated = 0;
    for (Candidate c : uncategorised(ws)) {
      for (Rule r : rules) {
        if (!matches(def(r), c.payee(), c.note(), c.amount(), c.type())
            || !categoryKindIs(ws, r.categoryId(), c.type())) continue;
        updated +=
            db.update(
                "UPDATE transactions SET category_id = ?, version = version + 1, updated_at = NOW() WHERE id = ? AND category_id IS NULL",
                r.categoryId(),
                c.id());
        break;
      }
    }
    return updated;
  }

  /**
   * Files past uncategorised entries using one rule. Entries that already have a category are left
   * alone.
   */
  public Applied applyOne(UUID ws, UUID id) {
    return new Applied(apply(ws, List.of(get(ws, id))));
  }

  /** Files past uncategorised entries using every active rule, first match wins. */
  public Applied applyAll(UUID ws) {
    return new Applied(apply(ws, list(ws).stream().filter(Rule::active).toList()));
  }
}
