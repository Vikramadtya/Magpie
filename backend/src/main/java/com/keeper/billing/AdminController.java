package com.keeper.billing;

import com.keeper.auth.UserRepository;
import com.keeper.common.Actor;
import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Managing codes and granting access. Only the emails in ADMIN_EMAILS may use these. */
@Controller("/api/v1/admin")
@io.micronaut.validation.Validated
public class AdminController {

  @Serdeable
  public record CodeRequest(
      @Size(max = 40) String code,
      @NotNull String kind,
      @Size(max = 200) String description,
      Instant startsAt,
      Instant expiresAt,
      @Min(1) @Max(1_000_000) Integer maxRedemptions,
      @Min(1) @Max(1_000) Integer perUserLimit,
      @Min(1) @Max(3650) Integer accessDays,
      @Min(1) @Max(100) Integer discountPercent,
      @Min(1) @Max(100_000_000) Long discountMinor,
      @Min(1) @Max(120) Integer discountCycles) {}

  /**
   * What can change after a code exists. Flags say whether a null date or limit means "remove it".
   */
  @Serdeable
  public record CodeUpdate(
      Boolean active,
      @Size(max = 200) String description,
      boolean setExpiry,
      Instant expiresAt,
      boolean setMax,
      @Min(1) Integer maxRedemptions) {}

  @Serdeable
  public record GrantRequest(
      @NotBlank String email, @Min(1) @Max(3650) int days, @Size(max = 200) String note) {}

  @Serdeable
  public record Granted(String email, Instant accessUntil) {}

  private final Admins admins;
  private final CodeService codes;
  private final UserRepository users;

  public AdminController(Admins admins, CodeService codes, UserRepository users) {
    this.admins = admins;
    this.codes = codes;
    this.users = users;
  }

  @Get("/codes")
  public List<CodeService.Code> list(Authentication auth) {
    admins.require(Actor.id(auth));
    return codes.list();
  }

  @Post("/codes")
  public CodeService.Code create(Authentication auth, @Valid @Body CodeRequest body) {
    UUID me = Actor.id(auth);
    admins.require(me);
    return codes.create(me, body);
  }

  @io.micronaut.http.annotation.Patch("/codes/{id}")
  public CodeService.Code update(
      Authentication auth, @PathVariable UUID id, @Valid @Body CodeUpdate body) {
    admins.require(Actor.id(auth));
    return codes.update(id, body);
  }

  @Get("/codes/{id}/redemptions")
  public List<CodeService.Redemption> redemptions(Authentication auth, @PathVariable UUID id) {
    admins.require(Actor.id(auth));
    return codes.redemptions(id);
  }

  /** Gives a person Pro for some days, for example after a payment received outside the app. */
  @Put("/grants")
  public Granted grant(Authentication auth, @Valid @Body GrantRequest body) {
    UUID me = Actor.id(auth);
    admins.require(me);
    var user =
        users
            .findByEmail(body.email().trim())
            .orElseThrow(() -> new ResourceNotFoundException("User", body.email()));
    Instant until = codes.grant(user.id(), body.days(), "ADMIN", null, body.note(), me);
    return new Granted(user.email(), until);
  }
}
