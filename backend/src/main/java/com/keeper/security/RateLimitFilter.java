package com.keeper.security;

import io.micronaut.core.order.Ordered;
import io.micronaut.http.HttpMethod;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.RequestFilter;
import io.micronaut.http.annotation.ServerFilter;
import io.micronaut.http.filter.ServerFilterPhase;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Fixed-window limiter: 10/min/IP on auth endpoints, 240/min/IP on everything else mutating. */
@ServerFilter("/api/**")
public class RateLimitFilter implements Ordered {
  private static final long WINDOW_MS = 60_000;

  private record Window(long start, int count) {}

  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  @RequestFilter
  @io.micronaut.core.annotation.Nullable
  public HttpResponse<?> limit(HttpRequest<?> request) {
    boolean auth = request.getPath().startsWith("/api/v1/auth/");
    boolean mutating =
        request.getMethod() != HttpMethod.GET && request.getMethod() != HttpMethod.HEAD;
    if (!auth && !mutating) {
      return null;
    }
    int max = auth ? 10 : 240;
    String key = (auth ? "auth:" : "write:") + clientIp(request);
    long now = System.currentTimeMillis();
    Window w =
        windows.merge(
            key,
            new Window(now, 1),
            (old, fresh) ->
                now - old.start > WINDOW_MS ? fresh : new Window(old.start, old.count + 1));
    if (w.count > max) {
      return HttpResponse.status(HttpStatus.TOO_MANY_REQUESTS)
          .header("Retry-After", "60")
          .body(Map.of("status", 429, "title", "Too Many Requests"));
    }
    if (windows.size() > 10_000) {
      windows.entrySet().removeIf(e -> now - e.getValue().start > WINDOW_MS);
    }
    return null;
  }

  private static String clientIp(HttpRequest<?> request) {
    String forwarded = request.getHeaders().get("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    return request.getRemoteAddress().getAddress().getHostAddress();
  }

  @Override
  public int getOrder() {
    return ServerFilterPhase.FIRST.order();
  }
}
