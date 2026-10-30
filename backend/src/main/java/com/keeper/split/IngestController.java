package com.keeper.split;

import com.keeper.common.exception.UnauthorizedException;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Header;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/**
 * Keeper's interface for the expense-split app (v1). Authenticated with a Keeper API token
 * ("Authorization: Bearer ksk_...") that is tied to one ledger. See docs/SPLIT_INTERFACE.md.
 */
@Controller("/api/v1/ingest")
@Secured(SecurityRule.IS_ANONYMOUS)
@io.micronaut.validation.Validated
public class IngestController {

  @Serdeable
  public record Share(@NotBlank @Size(max = 160) String name, @PositiveOrZero long shareMinor) {}

  /** An expense or a settlement. Fields that don't apply to the type are ignored. */
  @Serdeable
  public record Item(
      @NotNull @Pattern(regexp = "^(EXPENSE|SETTLEMENT)$") String type,
      @NotBlank @Size(max = 100) String externalId,
      @Size(max = 80) String version,
      @Size(max = 100) String groupId,
      @Size(max = 160) String groupName,
      @NotNull LocalDate occurredOn,
      @NotNull @Pattern(regexp = "^[A-Za-z]{3}$") String currency,
      Long totalMinor,
      @Size(max = 255) String title,
      Boolean paidByMe,
      @PositiveOrZero Long myShareMinor,
      @Size(max = 50) List<@Valid Share> shares,
      @Pattern(regexp = "^(RECEIVED|PAID)$") String direction,
      @Size(max = 160) String counterparty,
      Boolean deleted) {}

  @Serdeable
  public record Items(@NotEmpty @Size(max = 200) List<@Valid Item> items) {}

  @Serdeable
  public record Ping(boolean ok, String ledger, String currency, int interfaceVersion) {}

  @Serdeable
  public record Results(List<SplitIngestService.Result> results) {}

  private final ApiTokenService tokens;
  private final SplitIngestService ingest;
  private final com.keeper.common.db.Db db;

  public IngestController(
      ApiTokenService tokens, SplitIngestService ingest, com.keeper.common.db.Db db) {
    this.tokens = tokens;
    this.ingest = ingest;
    this.db = db;
  }

  /** Lets the split app check that its connection works and see which ledger it is feeding. */
  @Get("/ping")
  public Ping ping(@Nullable @Header("Authorization") String authorization) {
    var owner = authenticate(authorization);
    return db.one(
            "SELECT name, base_currency FROM workspaces WHERE id = ?",
            rs -> new Ping(true, rs.getString(1), rs.getString(2), 1),
            owner.workspaceId())
        .orElseThrow(() -> new UnauthorizedException("Unknown ledger"));
  }

  @Post("/split")
  public Results items(
      @Nullable @Header("Authorization") String authorization, @Valid @Body Items body) {
    var owner = authenticate(authorization);
    return new Results(ingest.ingest(owner.workspaceId(), body.items()));
  }

  private ApiTokenService.Owner authenticate(String header) {
    String secret =
        header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : null;
    return tokens
        .verify(secret)
        .orElseThrow(() -> new UnauthorizedException("Invalid or revoked token"));
  }
}
