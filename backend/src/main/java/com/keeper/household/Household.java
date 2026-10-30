package com.keeper.household;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;
import java.util.UUID;

/** A household as one member sees it. */
@Serdeable
public record Household(
    UUID id,
    String name,
    String currency,
    /** ACTIVE, or PENDING while you have not yet accepted the invitation. */
    String myStatus,
    boolean createdByMe,
    List<Member> members) {

  @Serdeable
  public record Member(
      UUID id,
      String name,
      String email,
      String status,
      boolean me,
      boolean shareSpending,
      boolean shareNetWorth,
      boolean shareInvestments) {}
}
