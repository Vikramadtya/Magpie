package com.keeper.common.exception;

import io.micronaut.http.HttpStatus;

public class TooManyRequestsException extends KeeperException {
  public TooManyRequestsException(String detail) {
    super(HttpStatus.TOO_MANY_REQUESTS, detail);
  }
}
