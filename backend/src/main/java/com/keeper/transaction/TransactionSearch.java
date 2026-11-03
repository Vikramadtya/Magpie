package com.keeper.transaction;

import com.keeper.common.CursorPage;
import com.keeper.common.exception.BadRequestException;
import com.keeper.fx.FxConverter;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Free-text search over transactions. Notes are stored encrypted, so the database cannot search
 * them; the filtered rows (up to {@link #CAP}) are read, decrypted and matched here. Every word
 * must be found somewhere: payee, category, account, note, tag, trip, person, loan or the amount.
 */
@Singleton
public class TransactionSearch {
  /** The most rows looked through for one search. */
  static final int CAP = 3000;

  @Serdeable
  public record Summary(
      long count, long incomeMinor, long expenseMinor, String currency, boolean capped) {}

  private final TransactionRepository transactions;
  private final FxConverter fx;

  public TransactionSearch(TransactionRepository transactions, FxConverter fx) {
    this.transactions = transactions;
    this.fx = fx;
  }

  static List<String> terms(String q) {
    List<String> out = new ArrayList<>();
    for (String t : q.trim().toLowerCase(Locale.ROOT).split("\\s+")) {
      if (!t.isBlank() && out.size() < 6) out.add(t);
    }
    return out;
  }

  /** The text a row can be found by (lowercase), apart from its tags. */
  static String haystack(TransactionView v) {
    StringBuilder sb = new StringBuilder();
    for (String s :
        new String[] {
          v.payeeName(),
          v.categoryName(),
          v.accountName(),
          v.note(),
          v.loanPerson(),
          v.tripName(),
          v.spentByName(),
          v.type()
        }) {
      if (s != null) sb.append(s.toLowerCase(Locale.ROOT)).append('\n');
    }
    BigDecimal major = BigDecimal.valueOf(v.amountMinor()).movePointLeft(minorDigits(v.currency()));
    sb.append(major.toPlainString())
        .append('\n')
        .append(major.stripTrailingZeros().toPlainString());
    return sb.toString();
  }

  private static int minorDigits(String currency) {
    return currency == null ? 2 : com.keeper.fx.CurrencyUnits.exponent(currency);
  }

  /** True when every term is in the row's text or in one of its tag names. */
  static boolean matches(
      String haystack, List<String> terms, List<Set<UUID>> tagIdsPerTerm, List<UUID> rowTags) {
    for (int i = 0; i < terms.size(); i++) {
      if (haystack.contains(terms.get(i))) continue;
      boolean tagHit = false;
      for (UUID tag : rowTags) {
        if (tagIdsPerTerm.get(i).contains(tag)) {
          tagHit = true;
          break;
        }
      }
      if (!tagHit) return false;
    }
    return true;
  }

  private List<TransactionView> found(UUID ws, TransactionFilter filter) {
    List<String> terms = terms(filter.q());
    List<Set<UUID>> tagIds = terms.stream().map(t -> transactions.tagIdsMatching(ws, t)).toList();
    List<TransactionView> out = new ArrayList<>();
    for (TransactionView v : transactions.candidates(ws, filter.withoutQuery(), CAP)) {
      if (matches(haystack(v), terms, tagIds, v.tagIds())) out.add(v);
    }
    return out;
  }

  private static int offset(String cursor) {
    if (cursor == null || cursor.isBlank()) return 0;
    try {
      String[] parts =
          new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|");
      if (!"o".equals(parts[0])) throw new IllegalArgumentException();
      return Math.max(0, Integer.parseInt(parts[1]));
    } catch (RuntimeException e) {
      throw new BadRequestException("Invalid cursor");
    }
  }

  static String offsetCursor(int offset) {
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(("o|" + offset).getBytes(StandardCharsets.UTF_8));
  }

  public CursorPage<TransactionView> page(
      UUID ws, TransactionFilter filter, String cursor, int size) {
    List<TransactionView> all = found(ws, filter);
    int from = Math.min(offset(cursor), all.size());
    int to = Math.min(from + size, all.size());
    return new CursorPage<>(all.subList(from, to), to < all.size() ? offsetCursor(to) : null);
  }

  public Summary summary(UUID ws, TransactionFilter filter) {
    String currency = fx.forWorkspace(ws).base();
    if (!filter.hasQuery()) {
      var t = transactions.totals(ws, filter);
      return new Summary(t.count(), t.incomeMinor(), t.expenseMinor(), currency, false);
    }
    List<TransactionView> all = found(ws, filter);
    long income = 0;
    long expense = 0;
    for (TransactionView v : all) {
      long amount = v.baseAmountMinor() != null ? v.baseAmountMinor() : v.amountMinor();
      if ("INCOME".equals(v.type())) income += amount;
      else if ("EXPENSE".equals(v.type())) expense += amount;
    }
    return new Summary(all.size(), income, expense, currency, all.size() >= CAP);
  }
}
