package com.keeper.common.exception;

import io.micronaut.http.HttpStatus;
import lombok.Getter;

@Getter
public abstract class KeeperException extends RuntimeException {
  private final HttpStatus status;
  private final String detail;

  public KeeperException(HttpStatus status, String detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}
