package com.keeper.imports;

import com.keeper.common.Actor;
import com.keeper.common.CursorPage;
import com.keeper.transaction.TransactionFilter;
import com.keeper.transaction.TransactionService;
import com.keeper.transaction.TransactionView;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.http.multipart.CompletedFileUpload;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}")
@io.micronaut.validation.Validated
public class ImportController {
  private static final int EXPORT_CAP = 100_000;

  @Serdeable
  public record CommitRequest(
      @NotNull UUID accountId,
      @NotBlank @Size(max = 255) String fileName,
      @NotNull @Size(max = 10_000) List<@Valid ParsedRow> rows) {}

  @Serdeable
  public record Undone(int removed) {}

  private final ImportService imports;
  private final TransactionService transactions;

  public ImportController(ImportService imports, TransactionService transactions) {
    this.imports = imports;
    this.transactions = transactions;
  }

  @Post(value = "/imports/preview", consumes = MediaType.MULTIPART_FORM_DATA)
  public ImportService.Preview preview(
      @PathVariable UUID workspaceId,
      CompletedFileUpload file,
      UUID accountId,
      @Nullable String dateFormat)
      throws IOException {
    String csv = new String(file.getBytes(), StandardCharsets.UTF_8);
    return imports.preview(workspaceId, accountId, csv, dateFormat);
  }

  @Post("/imports/commit")
  public ImportService.Result commit(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body CommitRequest body) {
    return imports.commit(
        workspaceId, Actor.id(auth), body.accountId(), body.fileName(), body.rows());
  }

  @Delete("/imports/{batchId}")
  public Undone undo(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID batchId) {
    return new Undone(imports.undo(workspaceId, Actor.id(auth), batchId));
  }

  @Get("/export/transactions.csv")
  public HttpResponse<byte[]> export(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to) {
    StringBuilder out =
        new StringBuilder("date,type,account,category,payee,amount,currency,note\n");
    String cursor = null;
    int rows = 0;
    do {
      CursorPage<TransactionView> page =
          transactions.list(
              workspaceId,
              new TransactionFilter(from, to, null, null, null, null, null, null, null, null),
              cursor,
              200);
      for (TransactionView t : page.items()) {
        long signed = t.direction() * t.amountMinor();
        out.append(t.occurredOn())
            .append(',')
            .append(t.type())
            .append(',')
            .append(cell(t.accountName()))
            .append(',')
            .append(cell(t.categoryName()))
            .append(',')
            .append(cell(t.payeeName()))
            .append(',')
            .append(signed)
            .append(',')
            .append(t.currency())
            .append(',')
            .append(cell(t.note()))
            .append('\n');
        rows++;
      }
      cursor = page.nextCursor();
    } while (cursor != null && rows < EXPORT_CAP);
    return HttpResponse.ok(out.toString().getBytes(StandardCharsets.UTF_8))
        .contentType("text/csv")
        .header("Content-Disposition", "attachment; filename=\"keeper-transactions.csv\"");
  }

  /** Quotes the value and neutralizes spreadsheet formulas (CSV injection). */
  private static String cell(String value) {
    if (value == null) return "";
    String v = value;
    if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) v = "'" + v;
    return "\"" + v.replace("\"", "\"\"") + "\"";
  }
}
