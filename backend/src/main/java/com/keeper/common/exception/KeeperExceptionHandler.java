package com.keeper.common.exception;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import jakarta.inject.Singleton;
import java.net.URI;
import org.zalando.problem.Problem;
import org.zalando.problem.Status;

@Produces
@Singleton
@Requires(classes = {KeeperException.class, ExceptionHandler.class})
public class KeeperExceptionHandler
    implements ExceptionHandler<KeeperException, HttpResponse<Problem>> {

  @Override
  public HttpResponse<Problem> handle(HttpRequest request, KeeperException exception) {
    Problem problem =
        Problem.builder()
            .withType(URI.create("https://keeper.app/errors/" + exception.getStatus().getCode()))
            .withTitle(exception.getStatus().getReason())
            .withStatus(Status.valueOf(exception.getStatus().getCode()))
            .withDetail(exception.getDetail())
            .with("path", request.getPath())
            .build();

    return HttpResponse.status(exception.getStatus()).body(problem);
  }
}
