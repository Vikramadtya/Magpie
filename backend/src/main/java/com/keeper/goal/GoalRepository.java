package com.keeper.goal;

import com.keeper.workspace.Workspace; // Replace with actual domain entity
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;
import java.util.UUID;

@Repository
public interface GoalRepository extends JpaRepository<Workspace, UUID> {}
