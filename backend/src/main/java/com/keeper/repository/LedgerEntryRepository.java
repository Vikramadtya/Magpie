package com.keeper.repository;

import com.keeper.domain.LedgerEntry;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface LedgerEntryRepository extends CrudRepository<LedgerEntry, com.keeper.domain.keys.LedgerEntryKey> {
    List<LedgerEntry> findByWorkspaceId(UUID workspaceId);
}
