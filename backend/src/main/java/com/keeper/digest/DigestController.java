package com.keeper.digest;

import com.keeper.common.exception.BusinessRuleException;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/digest")
@io.micronaut.validation.Validated
public class DigestController {

  @Serdeable
  public record Request(@Size(max = 300) String webhookUrl, boolean enabled) {}

  private final DigestService service;

  public DigestController(DigestService service) {
    this.service = service;
  }

  @Get
  public DigestService.Settings settings(@PathVariable UUID workspaceId) {
    return service.settings(workspaceId);
  }

  @Put
  public DigestService.Settings save(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    return service.save(workspaceId, body.webhookUrl(), body.enabled());
  }

  @Post("/test")
  public DigestService.Settings test(@PathVariable UUID workspaceId) {
    if (!service.send(workspaceId))
      throw new BusinessRuleException("Add a Discord webhook link first");
    return service.settings(workspaceId);
  }
}
