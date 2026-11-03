package com.keeper.transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TransactionSearchTest {

  private static TransactionView row(
      String payee, String note, long amountMinor, List<UUID> tags, String category) {
    return new TransactionView(
        UUID.randomUUID(),
        UUID.randomUUID(),
        "HDFC Card",
        "EXPENSE",
        -1,
        amountMinor,
        "INR",
        LocalDate.of(2026, 11, 1),
        null,
        category,
        UUID.randomUUID(),
        payee,
        note,
        tags,
        null,
        0,
        UUID.randomUUID(),
        Instant.now(),
        null,
        null,
        null,
        null,
        null,
        null,
        BigDecimal.ONE,
        false,
        null,
        null,
        null,
        null);
  }

  private static boolean found(TransactionView v, String q, List<Set<UUID>> tags) {
    return TransactionSearch.matches(
        TransactionSearch.haystack(v), TransactionSearch.terms(q), tags, v.tagIds());
  }

  private static List<Set<UUID>> noTags(String q) {
    return TransactionSearch.terms(q).stream().map(t -> Set.<UUID>of()).toList();
  }

  @Test
  void everyWordMustBeFoundSomewhere() {
    var v = row("Swiggy", "team lunch", 45050, List.of(), "Food");
    assertTrue(found(v, "swiggy lunch", noTags("swiggy lunch")));
    assertTrue(found(v, "SWIGGY", noTags("SWIGGY")));
    assertFalse(found(v, "swiggy dinner", noTags("swiggy dinner")));
  }

  @Test
  void findsByNoteCategoryAccountAndAmount() {
    var v = row("Swiggy", "team lunch", 45050, List.of(), "Food");
    assertTrue(found(v, "lunch", noTags("lunch")));
    assertTrue(found(v, "food", noTags("food")));
    assertTrue(found(v, "hdfc", noTags("hdfc")));
    assertTrue(found(v, "450.5", noTags("450.5")));
    assertTrue(found(v, "450.50", noTags("450.50")));
    assertFalse(found(v, "999", noTags("999")));
  }

  @Test
  void findsByTagName() {
    UUID tag = UUID.randomUUID();
    var v = row(null, null, 100, List.of(tag), null);
    assertTrue(found(v, "holiday", List.of(Set.of(tag))));
    assertFalse(found(v, "holiday", List.of(Set.of(UUID.randomUUID()))));
  }

  @Test
  void splitsWordsAndCapsHowManyAreUsed() {
    assertEquals(List.of("a", "b"), TransactionSearch.terms("  a   B "));
    assertEquals(6, TransactionSearch.terms("1 2 3 4 5 6 7 8").size());
  }
}
