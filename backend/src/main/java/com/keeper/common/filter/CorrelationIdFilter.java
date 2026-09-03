package com.keeper.common.filter;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.filter.HttpServerFilter;
import io.micronaut.http.filter.ServerFilterChain;
import java.util.UUID;
import org.reactivestreams.Publisher;
import org.slf4j.MDC;
import reactor.core.publisher.Flux;

@Filter("/**")
public class CorrelationIdFilter implements HttpServerFilter {

  private static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

  @Override
  public Publisher<MutableHttpResponse<?>> doFilter(
      HttpRequest<?> request, ServerFilterChain chain) {
    String correlationId = request.getHeaders().get(CORRELATION_ID_HEADER);

    if (correlationId == null || correlationId.isEmpty()) {
      correlationId = UUID.randomUUID().toString();
    }

    final String finalCorrelationId = correlationId;

    MDC.put("correlationId", finalCorrelationId);

    return Flux.from(chain.proceed(request))
        .doOnNext(response -> response.header(CORRELATION_ID_HEADER, finalCorrelationId))
        .doFinally(signalType -> MDC.remove("correlationId"));
  }
}
