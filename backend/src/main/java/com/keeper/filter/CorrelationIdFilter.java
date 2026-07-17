package com.keeper.filter;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.filter.HttpServerFilter;
import io.micronaut.http.filter.ServerFilterChain;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Filter("/**")
public class CorrelationIdFilter implements HttpServerFilter {

    private static final String HEADER_X_REQUEST_ID = "X-Request-ID";

    @Override
    public Publisher<MutableHttpResponse<?>> doFilter(HttpRequest<?> request, ServerFilterChain chain) {
        String correlationId = request.getHeaders().get(HEADER_X_REQUEST_ID);
        
        if (correlationId == null || correlationId.isEmpty()) {
            correlationId = UUID.randomUUID().toString();
        }

        final String finalCorrelationId = correlationId;
        
        // Add to MDC for logging in a real reactive context
        // org.slf4j.MDC.put("requestId", finalCorrelationId);

        return Mono.from(chain.proceed(request)).map(response -> {
            response.header(HEADER_X_REQUEST_ID, finalCorrelationId);
            return response;
        });
    }
}
