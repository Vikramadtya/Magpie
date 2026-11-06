package com.keeper.sample;

import com.keeper.account.AccountRepository;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.payee.PayeeRepository;
import com.keeper.transaction.EntryOrigin;
import com.keeper.transaction.TransactionController;
import com.keeper.transaction.TransactionService;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** A believable few months of activity so a new user can look around, and a one-step clean-up. */
@Singleton
public class SampleDataService {
  static final String PREFIX = "Sample · ";

  @Serdeable
  public record Result(int accounts, int transactions) {}

  private record Spend(String payee, String category, long minor, int dayOffset, int accountIdx) {}

  private static final List<Spend> MONTHLY =
      List.of(
          new Spend("Big Basket", "Groceries", 3_200_00, 3, 1),
          new Spend("Swiggy", "Dining Out", 640_00, 6, 1),
          new Spend("Uber", "Public Transit", 280_00, 8, 1),
          new Spend("Landlord", "Rent", 18_000_00, 2, 0),
          new Spend("Netflix", "Entertainment", 649_00, 11, 1),
          new Spend("Zomato", "Dining Out", 520_00, 14, 1),
          new Spend("Reliance Fresh", "Groceries", 2_450_00, 17, 1),
          new Spend("Shell", "Fuel", 1_800_00, 20, 1));

  private final Db db;
  private final AccountRepository accounts;
  private final TransactionService transactions;
  private final PayeeRepository payees;

  public SampleDataService(
      Db db, AccountRepository accounts, TransactionService transactions, PayeeRepository payees) {
    this.db = db;
    this.accounts = accounts;
    this.transactions = transactions;
    this.payees = payees;
  }

  public Result load(UUID ws, UUID actor) {
    if (db.count("SELECT count(*) FROM accounts WHERE workspace_id = ? AND NOT memo", ws) > 0)
      throw new BusinessRuleException("Sample data is only for an empty ledger");
    String currency =
        db.one("SELECT base_currency FROM workspaces WHERE id = ?", rs -> rs.getString(1), ws)
            .orElse("USD");
    UUID bank = accounts.insert(ws, PREFIX + "Everyday account", "CHECKING", currency, 50_000_00);
    UUID card = accounts.insert(ws, PREFIX + "Credit card", "CREDIT_CARD", currency, 0);
    accounts.insert(ws, PREFIX + "Savings", "SAVINGS", currency, 2_00_000_00);
    UUID[] used = {bank, card};

    int count = 0;
    LocalDate today = LocalDate.now();
    for (int m = 2; m >= 0; m--) {
      LocalDate first = today.minusMonths(m).withDayOfMonth(1);
      count +=
          entry(
              ws, actor, bank, "INCOME", "Employer", "Salary", 85_000_00, first.plusDays(0), today);
      for (Spend s : MONTHLY) {
        LocalDate on = first.plusDays(s.dayOffset());
        count +=
            entry(
                ws,
                actor,
                used[s.accountIdx()],
                "EXPENSE",
                s.payee(),
                s.category(),
                s.minor() + m * 7_00,
                on,
                today);
      }
    }
    return new Result(3, count);
  }

  private int entry(
      UUID ws,
      UUID actor,
      UUID account,
      String type,
      String payee,
      String category,
      long minor,
      LocalDate on,
      LocalDate today) {
    if (on.isAfter(today)) return 0;
    UUID categoryId =
        db.one(
                "SELECT id FROM categories WHERE workspace_id = ? AND lower(name) = lower(?) AND kind = ? LIMIT 1",
                rs -> rs.getObject(1, UUID.class),
                ws,
                category,
                type)
            .orElse(null);
    UUID payeeId = payees.upsert(ws, payee, null).id();
    transactions.insertEntry(
        ws,
        actor,
        null,
        new TransactionController.Request(
            account, type, minor, on, categoryId, payeeId, null, List.of(), null, null, null),
        EntryOrigin.NONE);
    return 1;
  }

  /** Removes the sample accounts and everything recorded in them. */
  public Result clear(UUID ws) {
    List<UUID> ids =
        db.list(
            "SELECT id FROM accounts WHERE workspace_id = ? AND name LIKE ?",
            rs -> rs.getObject(1, UUID.class),
            ws,
            PREFIX + "%");
    int removed = 0;
    for (UUID id : ids) {
      removed += db.update("DELETE FROM transactions WHERE account_id = ?", id);
      db.update("DELETE FROM accounts WHERE id = ?", id);
    }
    return new Result(ids.size(), removed);
  }
}
