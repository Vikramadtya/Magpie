package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.common.db.Db;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EncryptionTest extends ApiTestBase {

  @Inject Db db;

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String rawNote(String txId) {
    return db.one(
            "SELECT note FROM transactions WHERE id = ?",
            rs -> rs.getString(1),
            UUID.fromString(txId))
        .orElseThrow();
  }

  @Test
  void notesAndCommentsAreStoredEncryptedAndReadBackPlain() {
    Session s = register("crypt");
    String acc =
        (String)
            post(
                    s.token(),
                    ws(s) + "/accounts",
                    Map.of(
                        "name",
                        "Card",
                        "type",
                        "CHECKING",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        100_000),
                    Map.class)
                .get("id");
    Map<?, ?> tx =
        post(
            s.token(),
            ws(s) + "/transactions",
            Map.of(
                "accountId",
                acc,
                "type",
                "EXPENSE",
                "amountMinor",
                2_500,
                "occurredOn",
                LocalDate.now().toString(),
                "note",
                "Dinner with Priya"),
            Map.class);
    String id = (String) tx.get("id");

    assertEquals("Dinner with Priya", tx.get("note"));
    assertTrue(rawNote(id).startsWith("enc1:"));
    assertTrue(!rawNote(id).contains("Priya"));

    post(
        s.token(),
        ws(s) + "/transactions/" + id + "/comments",
        Map.of("body", "Split later"),
        Map.class);
    String rawComment =
        db.one(
                "SELECT body FROM transaction_comments WHERE transaction_id = ?",
                rs -> rs.getString(1),
                UUID.fromString(id))
            .orElseThrow();
    assertTrue(rawComment.startsWith("enc1:"));
    assertEquals(
        "Split later",
        getList(s.token(), ws(s) + "/transactions/" + id + "/comments").get(0).get("body"));

    // Editing then undoing restores the note through the (encrypted) revision.
    put(
        s.token(),
        ws(s) + "/transactions/" + id,
        Map.of(
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            2_500,
            "occurredOn",
            LocalDate.now().toString(),
            "note",
            "Changed"),
        Map.class);
    post(s.token(), ws(s) + "/transactions/" + id + "/undo", Map.of(), Map.class);
    assertEquals(
        "Dinner with Priya", get(s.token(), ws(s) + "/transactions/" + id, Map.class).get("note"));
    String snapshot =
        db.one(
                "SELECT snapshot::text FROM transaction_revisions WHERE transaction_id = ? LIMIT 1",
                rs -> rs.getString(1),
                UUID.fromString(id))
            .orElseThrow();
    assertTrue(snapshot.contains("\"enc\"") && !snapshot.contains("Priya"));
  }
}
