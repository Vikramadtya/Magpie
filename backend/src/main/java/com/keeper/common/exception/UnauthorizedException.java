package com.keeper.common.exception;

import io.micronaut.http.HttpStatus;

public class UnauthorizedException extends KeeperException {
  public UnauthorizedException(String detail) {
    super(HttpStatus.UNAUTHORIZED, detail);
  }
}
