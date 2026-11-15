package com.keeper.billing;

import com.keeper.common.exception.KeeperException;
import io.micronaut.http.HttpStatus;

/** 402: the Free plan does not allow this; the message says what and how to get it. */
public class PlanLimitException extends KeeperException {
  public PlanLimitException(String detail) {
    super(HttpStatus.PAYMENT_REQUIRED, detail);
  }
}
