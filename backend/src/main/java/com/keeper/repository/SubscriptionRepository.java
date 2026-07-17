package com.keeper.repository;

import com.keeper.domain.Subscription;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface SubscriptionRepository extends CrudRepository<Subscription, com.keeper.domain.keys.WorkspaceIdKey> {
    List<Subscription> findByWorkspaceId(UUID workspaceId);
}
