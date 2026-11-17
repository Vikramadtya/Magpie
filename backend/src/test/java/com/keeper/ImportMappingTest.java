package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.multipart.MultipartBody;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ImportMappingTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private Map<?, ?> preview(Session s, String acc, String csv, Map<String, String> extra) {
    MultipartBody.Builder b =
        MultipartBody.builder()
            .addPart("file", "bank.csv", MediaType.TEXT_CSV_TYPE, csv.getBytes())
            .addPart("accountId", acc);
    extra.forEach(b::addPart);
    return http()
        .retrieve(
            HttpRequest.POST(ws(s) + "/imports/preview", b.build())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .bearerAuth(s.token()),
            Map.class);
  }

  @Test
  void unknownLayoutsCanBeMappedAndSaved() {
    Session s = register("mapimp");
    String acc =
        (String)
            post(
                    s.token(),
                    ws(s) + "/accounts",
                    Map.of(
                        "name",
                        "Bank",
                        "type",
                        "CHECKING",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        0),
                    Map.class)
                .get("id");
    String csv = "Posted,Narration,Out,In\n03/02/2026,Coffee,4.50,\n04/02/2026,Pay,,100.00\n";

    Map<?, ?> unknown = preview(s, acc, csv, Map.of());
    assertEquals(0, ((List<?>) unknown.get("rows")).size());
    assertEquals(List.of("Posted", "Narration", "Out", "In"), unknown.get("headers"));

    Map<?, ?> mapped =
        preview(
            s,
            acc,
            csv,
            Map.of(
                "dateCol", "Posted",
                "debitCol", "Out",
                "creditCol", "In",
                "descCol", "Narration",
                "dateFormat", "DMY"));
    List<?> rows = (List<?>) mapped.get("rows");
    assertEquals(2, rows.size());
    assertEquals(-450, ((Number) ((Map<?, ?>) rows.get(0)).get("amountMinor")).intValue());
    assertEquals(10_000, ((Number) ((Map<?, ?>) rows.get(1)).get("amountMinor")).intValue());

    post(
        s.token(),
        ws(s) + "/import-mappings",
        Map.of(
            "name",
            "My bank",
            "dateFormat",
            "DMY",
            "mapping",
            Map.of("dateCol", "Posted", "debitCol", "Out", "creditCol", "In", "descCol", "Narration")),
        Map.class);
    List<Map<String, Object>> saved = getList(s.token(), ws(s) + "/import-mappings");
    assertEquals(1, saved.size());
    assertEquals("My bank", saved.get(0).get("name"));
  }
}
