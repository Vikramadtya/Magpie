package com.keeper.subscription;

import com.keeper.workspace.Workspace; // Replace with actual domain entity
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Workspace, UUID> {}
