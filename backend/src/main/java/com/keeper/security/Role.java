package com.keeper.security;

/** Ordered by privilege: a role grants everything the roles before it do. */
public enum Role {
  VIEWER,
  EDITOR,
  OWNER;

  public boolean atLeast(Role required) {
    return ordinal() >= required.ordinal();
  }
}
