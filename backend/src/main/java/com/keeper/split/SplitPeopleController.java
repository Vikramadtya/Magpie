package com.keeper.split;

import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Put;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/**
 * Who the split app's people are in Keeper. Editing a label changes what future loans are called.
 */
@Controller("/api/v1/workspaces/{workspaceId}/split-people")
@io.micronaut.validation.Validated
public class SplitPeopleController {

  @Serdeable
  public record LabelRequest(@NotBlank @Size(max = 160) String label) {}

  private final SplitPeopleRepository people;

  public SplitPeopleController(SplitPeopleRepository people) {
    this.people = people;
  }

  @Get
  public List<SplitPeopleRepository.Person> list(@PathVariable UUID workspaceId) {
    return people.list(workspaceId);
  }

  @Put("/{id}")
  public void rename(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body LabelRequest body) {
    if (people.setLabel(workspaceId, id, body.label().trim()) == 0) {
      throw new ResourceNotFoundException("Person", id.toString());
    }
  }

  /** Follow the split app's name again. */
  @Delete("/{id}/label")
  public void reset(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    if (people.resetLabel(workspaceId, id) == 0) {
      throw new ResourceNotFoundException("Person", id.toString());
    }
  }
}
