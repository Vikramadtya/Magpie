package com.keeper.receipt;

import com.keeper.billing.Entitlements;
import com.keeper.billing.Feature;
import com.keeper.common.Actor;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.multipart.CompletedFileUpload;
import io.micronaut.security.authentication.Authentication;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}")
public class ReceiptController {
  private final ReceiptService service;
  private final Entitlements entitlements;

  public ReceiptController(ReceiptService service, Entitlements entitlements) {
    this.service = service;
    this.entitlements = entitlements;
  }

  @Post(value = "/transactions/{id}/receipts", consumes = MediaType.MULTIPART_FORM_DATA)
  public ReceiptService.Receipt add(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      CompletedFileUpload file)
      throws IOException {
    entitlements.require(workspaceId, Feature.RECEIPTS);
    return service.add(workspaceId, Actor.id(auth), id, file.getFilename(), file.getBytes());
  }

  @Get("/transactions/{id}/receipts")
  public List<ReceiptService.Receipt> list(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.forTransaction(workspaceId, id);
  }

  @Get("/receipts/counts")
  public List<ReceiptService.Count> counts(@PathVariable UUID workspaceId) {
    return service.counts(workspaceId);
  }

  /** The file itself. It is never cached, and is served as the type its bytes prove it to be. */
  @Get("/receipts/{id}")
  public HttpResponse<byte[]> download(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    var f = service.download(workspaceId, id);
    return HttpResponse.ok(f.bytes())
        .contentType(f.contentType())
        .header("Content-Disposition", "inline; filename=\"" + f.filename() + "\"")
        .header("Cache-Control", "private, no-store");
  }

  @Delete("/receipts/{id}")
  public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.delete(workspaceId, id);
  }
}
