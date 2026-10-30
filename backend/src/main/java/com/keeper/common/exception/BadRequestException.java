package com.keeper.common.exception;

import io.micronaut.http.HttpStatus;

public class BadRequestException extends KeeperException {
  public BadRequestException(String detail) {
    super(HttpStatus.BAD_REQUEST, detail);
  }
}
