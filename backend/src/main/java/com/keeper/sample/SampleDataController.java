package com.keeper.sample;

import com.keeper.common.Actor;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/sample-data")
public class SampleDataController {
  private final SampleDataService service;

  public SampleDataController(SampleDataService service) {
    this.service = service;
  }

  @Post
  public SampleDataService.Result load(Authentication auth, @PathVariable UUID workspaceId) {
    return service.load(workspaceId, Actor.id(auth));
  }

  @Delete
  public SampleDataService.Result clear(@PathVariable UUID workspaceId) {
    return service.clear(workspaceId);
  }
}
