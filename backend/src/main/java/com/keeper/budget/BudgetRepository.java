package com.keeper.budget;

import com.keeper.workspace.Workspace; // Replace with actual domain entity
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;
import java.util.UUID;

@Repository
public interface BudgetRepository extends JpaRepository<Workspace, UUID> {}
