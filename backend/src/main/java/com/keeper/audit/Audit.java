package com.keeper.audit;

import io.micronaut.context.event.ApplicationEventPublisher;
import jakarta.inject.Singleton;
import java.util.UUID;

/** Small facade so services record activity in one line. */
@Singleton
public class Audit {
  private final ApplicationEventPublisher<AuditEvent> publisher;

  public Audit(ApplicationEventPublisher<AuditEvent> publisher) {
    this.publisher = publisher;
  }

  public void record(UUID ws, UUID user, String entity, UUID id, String action, String summary) {
    publisher.publishEvent(new AuditEvent(ws, user, entity, id, action, summary));
  }
}
