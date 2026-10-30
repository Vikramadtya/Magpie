package com.keeper.account;

import com.keeper.audit.Audit;
import com.keeper.common.db.Db;
import com.keeper.common.exception.ResourceNotFoundException;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.UUID;

@Singleton
public class AccountService {
  private final AccountRepository accounts;
  private final Audit audit;
  private final Db db;

  public AccountService(AccountRepository accounts, Audit audit, Db db) {
    this.accounts = accounts;
    this.audit = audit;
    this.db = db;
  }

  public List<Account> list(UUID ws, boolean includeArchived) {
    return accounts.findAll(ws, includeArchived);
  }

  public Account get(UUID ws, UUID id) {
    return accounts
        .find(ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Account", id.toString()));
  }

  public Account create(UUID ws, UUID user, AccountController.CreateRequest r) {
    UUID id =
        accounts.insert(
            ws, r.name().trim(), r.type(), r.currency().toUpperCase(), r.openingBalanceMinor());
    audit.record(ws, user, "account", id, "CREATE", r.name());
    return get(ws, id);
  }

  public Account update(UUID ws, UUID user, UUID id, AccountController.UpdateRequest r) {
    Account current = get(ws, id);
    long opening =
        r.openingBalanceMinor() == null ? current.openingBalanceMinor() : r.openingBalanceMinor();
    accounts.update(
        ws,
        id,
        r.name() == null ? current.name() : r.name().trim(),
        r.type() == null ? current.type() : r.type(),
        r.archived() == null ? current.archived() : r.archived(),
        r.sortOrder() == null ? current.sortOrder() : r.sortOrder(),
        opening - current.openingBalanceMinor(),
        opening);
    audit.record(ws, user, "account", id, "UPDATE", current.name());
    return get(ws, id);
  }

  /** Accounts with history are archived (history stays intact); empty ones are removed. */
  public void delete(UUID ws, UUID user, UUID id) {
    Account current = get(ws, id);
    db.tx(
        () -> {
          if (accounts.transactionCount(ws, id) > 0) {
            accounts.update(
                ws,
                id,
                current.name(),
                current.type(),
                true,
                current.sortOrder(),
                0,
                current.openingBalanceMinor());
          } else {
            accounts.delete(ws, id);
          }
        });
    audit.record(ws, user, "account", id, "DELETE", current.name());
  }

  public Account recalculate(UUID ws, UUID id) {
    get(ws, id);
    accounts.recalculate(ws, id);
    return get(ws, id);
  }
}
