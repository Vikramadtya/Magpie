package com.keeper.payee;

import com.keeper.common.RefChecks;
import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Patch;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/payees")
@io.micronaut.validation.Validated
public class PayeeController {

  @Serdeable
  public record Request(@NotBlank @Size(max = 160) String name, UUID defaultCategoryId) {}

  private final PayeeRepository payees;
  private final RefChecks refs;

  public PayeeController(PayeeRepository payees, RefChecks refs) {
    this.payees = payees;
    this.refs = refs;
  }

  @Get
  public List<Payee> list(@PathVariable UUID workspaceId, @QueryValue(defaultValue = "") String q) {
    return payees.search(workspaceId, q);
  }

  @Post
  public Payee create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    refs.category(workspaceId, body.defaultCategoryId());
    return payees.upsert(workspaceId, body.name().trim(), body.defaultCategoryId());
  }

  @Patch("/{id}")
  public Payee update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    refs.category(workspaceId, body.defaultCategoryId());
    return payees
        .update(workspaceId, id, body.name().trim(), body.defaultCategoryId())
        .orElseThrow(() -> new ResourceNotFoundException("Payee", id.toString()));
  }

  @Delete("/{id}")
  public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    payees.delete(workspaceId, id);
  }
}
