package com.keeper.common.exception;

import io.micronaut.http.HttpStatus;

public class ForbiddenException extends KeeperException {
  public ForbiddenException(String detail) {
    super(HttpStatus.FORBIDDEN, detail);
  }
}
