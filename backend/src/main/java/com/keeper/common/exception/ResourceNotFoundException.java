package com.keeper.common.exception;

import io.micronaut.http.HttpStatus;

public class ResourceNotFoundException extends KeeperException {
  public ResourceNotFoundException(String resource, String id) {
    super(HttpStatus.NOT_FOUND, String.format("%s with ID %s not found.", resource, id));
  }
}
