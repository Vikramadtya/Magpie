package com.keeper.lending;

import com.keeper.account.Account;
import com.keeper.common.Actor;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import java.util.List;
import java.util.UUID;

/** The guest's side: accounts others have offered to lend them. */
@Controller("/api/v1/lending/invitations")
public class InvitationController {
  private final LendingService service;

  public InvitationController(LendingService service) {
    this.service = service;
  }

  @Get
  public List<Invitation> list(Authentication auth) {
    return service.invitations(Actor.id(auth));
  }

  @Post("/{id}/accept")
  public Account accept(Authentication auth, @PathVariable UUID id) {
    return service.accept(Actor.id(auth), id);
  }

  @Post("/{id}/decline")
  public void decline(Authentication auth, @PathVariable UUID id) {
    service.decline(Actor.id(auth), id);
  }
}
