package com.keeper.common.exception;

import io.micronaut.http.HttpStatus;

public class ConflictException extends KeeperException {
  public ConflictException(String detail) {
    super(HttpStatus.CONFLICT, detail);
  }
}
