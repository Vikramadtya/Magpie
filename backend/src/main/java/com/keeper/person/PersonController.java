package com.keeper.person;

import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Patch;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/people")
@io.micronaut.validation.Validated
public class PersonController {

  @Serdeable
  public record Request(@NotBlank @Size(max = 120) String name) {}

  private final PersonRepository people;

  public PersonController(PersonRepository people) {
    this.people = people;
  }

  @Get
  public List<Person> list(@PathVariable UUID workspaceId) {
    return people.list(workspaceId);
  }

  @Post
  public Person create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    return people.upsert(workspaceId, body.name().trim());
  }

  @Patch("/{id}")
  public Person rename(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    return people
        .rename(workspaceId, id, body.name().trim())
        .orElseThrow(() -> new ResourceNotFoundException("Person", id.toString()));
  }

  /** Their transactions stay, and simply become yours again. */
  @Delete("/{id}")
  public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    people.delete(workspaceId, id);
  }
}
