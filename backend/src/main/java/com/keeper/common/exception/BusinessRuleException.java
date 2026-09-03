package com.keeper.common.exception;

import io.micronaut.http.HttpStatus;

public class BusinessRuleException extends KeeperException {
  public BusinessRuleException(String detail) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, detail);
  }
}
