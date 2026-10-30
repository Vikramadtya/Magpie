package com.keeper.transaction;

import java.util.UUID;

/**
 * Published after a transaction is edited, deleted, restored or undone, so linked copies can
 * follow.
 */
public record TransactionChanged(UUID workspaceId, UUID transactionId) {}
