package com.keeper;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.billing.Entitlements;
import com.keeper.common.db.Db;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.multipart.MultipartBody;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ReceiptTest extends ApiTestBase {
  @Inject Db db;
  @Inject Entitlements entitlements;

  private static final byte[] PNG = {
    (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4, 5, 6, 7, 8
  };

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String transaction(Session s) {
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
                        0),
                    Map.class)
                .get("id");
    return (String)
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
                    LocalDate.now().toString()),
                Map.class)
            .get("id");
  }

  private HttpRequest<?> upload(Session s, String tx, String name, byte[] bytes) {
    var body =
        MultipartBody.builder()
            .addPart("file", name, MediaType.APPLICATION_OCTET_STREAM_TYPE, bytes)
            .build();
    return HttpRequest.POST(ws(s) + "/transactions/" + tx + "/receipts", body)
        .contentType(MediaType.MULTIPART_FORM_DATA_TYPE)
        .bearerAuth(s.token());
  }

  @Test
  void aReceiptIsStoredSealedAndComesBackUnchanged() {
    Session s = register("receipt");
    String tx = transaction(s);
    Map<?, ?> saved = http().retrieve(upload(s, tx, "bill.png", PNG), Map.class);
    assertEquals("image/png", saved.get("contentType"));

    var list = getList(s.token(), ws(s) + "/transactions/" + tx + "/receipts");
    assertEquals(1, list.size());
    var counts = getList(s.token(), ws(s) + "/receipts/counts");
    assertEquals(1, ((Number) counts.get(0).get("count")).intValue());

    var file =
        http()
            .exchange(
                HttpRequest.GET(ws(s) + "/receipts/" + saved.get("id")).bearerAuth(s.token()),
                byte[].class);
    assertArrayEquals(PNG, file.body());
    assertEquals("image/png", file.getContentType().orElseThrow().toString());

    String stored =
        db.one(
                "SELECT data_enc FROM receipts WHERE id = ?",
                rs -> rs.getString(1),
                UUID.fromString((String) saved.get("id")))
            .orElseThrow();
    assertTrue(stored.startsWith("enc1:")); // not readable in the database

    http()
        .exchange(HttpRequest.DELETE(ws(s) + "/receipts/" + saved.get("id")).bearerAuth(s.token()));
    assertEquals(0, getList(s.token(), ws(s) + "/transactions/" + tx + "/receipts").size());
  }

  @Test
  void onlyRealPhotosAndPdfsUnderTheSizeLimitAreAccepted() {
    Session s = register("receipt-rules");
    String tx = transaction(s);
    assertEquals(
        HttpStatus.BAD_REQUEST,
        statusOf(upload(s, tx, "notes.png", "just some text pretending".getBytes())));
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(upload(s, tx, "huge.png", new byte[1_600_000])));
    byte[] pdf = "%PDF-1.4 tiny".getBytes();
    assertEquals(HttpStatus.OK, statusOf(upload(s, tx, "invoice.pdf", pdf)));
    for (int i = 0; i < 4; i++)
      assertEquals(HttpStatus.OK, statusOf(upload(s, tx, "p" + i + ".png", PNG)));
    assertEquals(
        HttpStatus.UNPROCESSABLE_ENTITY, statusOf(upload(s, tx, "sixth.png", PNG))); // five at most
  }

  @Test
  void otherPeopleCannotSeeAReceiptAndFreeUsersCannotAddOne() {
    Session owner = register("receipt-owner");
    String tx = transaction(owner);
    Map<?, ?> saved = http().retrieve(upload(owner, tx, "mine.png", PNG), Map.class);
    Session other = register("receipt-other");
    var peek =
        HttpRequest.GET(ws(owner) + "/receipts/" + saved.get("id")).bearerAuth(other.token());
    assertTrue(statusOf(peek).getCode() >= 400);

    entitlements.setEnforced(true);
    try {
      Session free = register("receipt-free");
      String freeTx = transaction(free);
      assertEquals(HttpStatus.PAYMENT_REQUIRED, statusOf(upload(free, freeTx, "x.png", PNG)));
    } finally {
      entitlements.setEnforced(false);
    }
  }
}
