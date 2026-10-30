package com.keeper.audit;

import java.util.UUID;

/** Published by services after a change; {@link AuditListener} persists it (Observer pattern). */
public record AuditEvent(
    UUID workspaceId, UUID userId, String entity, UUID entityId, String action, String summary) {}
