package com.keeper;

import io.micronaut.core.type.Argument;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.client.BlockingHttpClient;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import io.micronaut.test.support.TestPropertyProvider;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.TestInstance;
import org.testcontainers.containers.PostgreSQLContainer;

/** Boots the whole app against a real Postgres (same engine as production). */
@MicronautTest(environments = "test", transactional = false)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class ApiTestBase implements TestPropertyProvider {

  /** Set TEST_DB_URL (jdbc:...) to reuse a running Postgres instead of starting a container. */
  private static final String EXTERNAL_URL = System.getenv("TEST_DB_URL");

  private static final PostgreSQLContainer<?> POSTGRES =
      EXTERNAL_URL == null ? new PostgreSQLContainer<>("postgres:16-alpine") : null;

  static {
    if (POSTGRES != null) {
      POSTGRES.start();
    }
  }

  @Override
  public Map<String, String> getProperties() {
    if (POSTGRES == null) {
      return Map.of(
          "datasources.default.url", EXTERNAL_URL,
          "datasources.default.username", System.getenv().getOrDefault("TEST_DB_USER", "postgres"),
          "datasources.default.password",
              System.getenv().getOrDefault("TEST_DB_PASSWORD", "password"));
    }
    return Map.of(
        "datasources.default.url", POSTGRES.getJdbcUrl(),
        "datasources.default.username", POSTGRES.getUsername(),
        "datasources.default.password", POSTGRES.getPassword());
  }

  @Inject
  @Client("/")
  protected HttpClient httpClient;

  protected BlockingHttpClient http() {
    return httpClient.toBlocking();
  }

  /** A registered user with an access token and their personal workspace. */
  public record Session(String token, UUID userId, UUID workspaceId) {}

  protected Session register(String namePrefix) {
    String email = namePrefix + "-" + UUID.randomUUID() + "@example.com";
    Map<?, ?> body =
        http()
            .retrieve(
                HttpRequest.POST(
                    "/api/v1/auth/register",
                    Map.of("email", email, "password", "correct-horse-1", "name", namePrefix)),
                Map.class);
    String token = (String) body.get("accessToken");
    Map<?, ?> me = get(token, "/api/v1/me", Map.class);
    UUID userId = UUID.fromString((String) ((Map<?, ?>) me.get("user")).get("id"));
    UUID ws =
        UUID.fromString(
            (String) ((Map<?, ?>) ((java.util.List<?>) me.get("workspaces")).get(0)).get("id"));
    return new Session(token, userId, ws);
  }

  protected <T> T get(String token, String path, Class<T> type) {
    return http().retrieve(HttpRequest.GET(path).bearerAuth(token), type);
  }

  protected <T> T post(String token, String path, Object body, Class<T> type) {
    return http().retrieve(HttpRequest.POST(path, body).bearerAuth(token), type);
  }

  protected List<Map<String, Object>> getList(String token, String path) {
    return http()
        .retrieve(
            HttpRequest.GET(path).bearerAuth(token),
            Argument.listOf(Argument.mapOf(String.class, Object.class)));
  }

  protected List<Map<String, Object>> postList(String token, String path, Object body) {
    return http()
        .retrieve(
            HttpRequest.POST(path, body).bearerAuth(token),
            Argument.listOf(Argument.mapOf(String.class, Object.class)));
  }

  protected <T> T patch(String token, String path, Object body, Class<T> type) {
    return http().retrieve(HttpRequest.PATCH(path, body).bearerAuth(token), type);
  }

  protected <T> T put(String token, String path, Object body, Class<T> type) {
    return http().retrieve(HttpRequest.PUT(path, body).bearerAuth(token), type);
  }

  protected HttpResponse<?> exchange(HttpRequest<?> request) {
    try {
      return http().exchange(request, Argument.of(String.class), Argument.of(String.class));
    } catch (HttpClientResponseException e) {
      return e.getResponse();
    }
  }

  protected HttpStatus statusOf(HttpRequest<?> request) {
    return exchange(request).getStatus();
  }
}
