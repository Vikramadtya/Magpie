package com.keeper.imports;

import com.keeper.account.Account;
import com.keeper.account.AccountRepository;
import com.keeper.audit.Audit;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.fx.CurrencyUnits;
import com.keeper.transaction.TransactionController;
import com.keeper.transaction.TransactionRepository;
import com.keeper.transaction.TransactionService;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Import pipeline (Template Method): parse CSV -> pick strategy -> normalize rows -> flag
 * duplicates -> (on commit) insert as one undoable batch.
 */
@Singleton
public class ImportService {
  private static final int MAX_ROWS = 10_000;

  @io.micronaut.serde.annotation.Serdeable
  public record Preview(String strategy, List<ParsedRow> rows, int skipped, int duplicates) {}

  @io.micronaut.serde.annotation.Serdeable
  public record Result(UUID batchId, int imported, int duplicates) {}

  private final List<CsvImportStrategy> strategies;
  private final AccountRepository accounts;
  private final TransactionRepository transactionRepo;
  private final TransactionService transactions;
  private final Audit audit;
  private final Db db;

  public ImportService(
      List<CsvImportStrategy> strategies,
      AccountRepository accounts,
      TransactionRepository transactionRepo,
      TransactionService transactions,
      Audit audit,
      Db db) {
    this.strategies = strategies;
    this.accounts = accounts;
    this.transactionRepo = transactionRepo;
    this.transactions = transactions;
    this.audit = audit;
    this.db = db;
  }

  public Preview preview(UUID ws, UUID accountId, String csv, String dateFormat) {
    Account account = account(ws, accountId);
    List<List<String>> table = CsvParser.parse(csv.startsWith("﻿") ? csv.substring(1) : csv);
    if (table.size() < 2) throw new BadRequestException("The file has no data rows");
    if (table.size() > MAX_ROWS + 1)
      throw new BadRequestException("At most " + MAX_ROWS + " rows per import");

    Map<String, Integer> header = new LinkedHashMap<>();
    List<String> head = table.get(0);
    for (int i = 0; i < head.size(); i++) header.put(head.get(i).toLowerCase().trim(), i);
    CsvImportStrategy strategy =
        strategies.stream()
            .filter(s -> s.supports(header))
            .findFirst()
            .orElseThrow(
                () ->
                    new BadRequestException(
                        "Unrecognized columns. Expected date + amount (or debit/credit)"));

    List<ParsedRow> rows = new ArrayList<>();
    int skipped = 0;
    int duplicates = 0;
    DateTimeFormatter fmt = formatter(dateFormat);
    for (List<String> cells : table.subList(1, table.size())) {
      try {
        var raw = strategy.read(cells, header);
        LocalDate date = LocalDate.parse(raw.date().trim(), fmt);
        long amount = parseAmount(raw.amount(), account.currency());
        if (amount == 0) throw new IllegalArgumentException("zero");
        String description = raw.description() == null ? "" : raw.description();
        boolean dup =
            transactionRepo.existsImportHash(accountId, hash(accountId, date, amount, description));
        if (dup) duplicates++;
        rows.add(new ParsedRow(date, amount, description, dup));
      } catch (DateTimeParseException | IllegalArgumentException e) {
        skipped++;
      }
    }
    return new Preview(strategy.name(), rows, skipped, duplicates);
  }

  public Result commit(UUID ws, UUID actor, UUID accountId, String fileName, List<ParsedRow> rows) {
    Account account = account(ws, accountId);
    if (rows.size() > MAX_ROWS)
      throw new BadRequestException("At most " + MAX_ROWS + " rows per import");
    UUID batchId = UUID.randomUUID();
    int[] counts = new int[2];
    db.tx(
        () -> {
          db.update(
              "INSERT INTO import_batches(id, workspace_id, account_id, file_name, row_count, created_by) VALUES (?,?,?,?,?,?)",
              batchId,
              ws,
              accountId,
              fileName,
              rows.size(),
              actor);
          for (ParsedRow row : rows) {
            String hash = hash(accountId, row.date(), row.amountMinor(), row.description());
            if (transactionRepo.existsImportHash(accountId, hash)) {
              counts[1]++;
              continue;
            }
            var request =
                new TransactionController.Request(
                    accountId,
                    row.amountMinor() > 0 ? "INCOME" : "EXPENSE",
                    Math.abs(row.amountMinor()),
                    row.date(),
                    null,
                    null,
                    row.description().isBlank() ? null : row.description(),
                    List.of(),
                    null,
                    null);
            transactions.insertEntry(ws, actor, null, request, null, hash, batchId);
            counts[0]++;
          }
        });
    audit.record(
        ws,
        actor,
        "import",
        batchId,
        "CREATE",
        fileName + ": " + counts[0] + " rows into " + account.name());
    return new Result(batchId, counts[0], counts[1]);
  }

  /** Soft-deletes every transaction of the batch and reverses its balance effect. */
  public int undo(UUID ws, UUID actor, UUID batchId) {
    List<UUID> ids =
        db.list(
            "SELECT id FROM transactions WHERE workspace_id = ? AND import_batch_id = ? AND deleted_at IS NULL",
            rs -> rs.getObject(1, UUID.class),
            ws,
            batchId);
    if (ids.isEmpty()
        && db.count(
                "SELECT count(*) FROM import_batches WHERE workspace_id = ? AND id = ?",
                ws,
                batchId)
            == 0) {
      throw new ResourceNotFoundException("Import", batchId.toString());
    }
    transactions.bulkDelete(ws, actor, ids);
    return ids.size();
  }

  private Account account(UUID ws, UUID id) {
    return accounts.find(ws, id).orElseThrow(() -> new BadRequestException("Unknown account"));
  }

  private static DateTimeFormatter formatter(String name) {
    return switch (name == null ? "ISO" : name) {
      case "DMY" -> DateTimeFormatter.ofPattern("d/M/uuuu");
      case "MDY" -> DateTimeFormatter.ofPattern("M/d/uuuu");
      default -> DateTimeFormatter.ISO_LOCAL_DATE;
    };
  }

  /**
   * Accepts "1,234.56", "-12", "(45.10)", "$9.99" and converts to minor units of the account
   * currency.
   */
  static long parseAmount(String text, String currency) {
    String s = text.trim();
    boolean negative = s.startsWith("(") && s.endsWith(")") || s.startsWith("-") || s.endsWith("-");
    s = s.replaceAll("[^0-9.]", "");
    if (s.isEmpty()) throw new IllegalArgumentException("no amount");
    BigDecimal value =
        new BigDecimal(s)
            .movePointRight(CurrencyUnits.exponent(currency))
            .setScale(0, RoundingMode.HALF_UP);
    return negative ? -value.longValueExact() : value.longValueExact();
  }

  static String hash(UUID accountId, LocalDate date, long amount, String description) {
    try {
      String key = accountId + "|" + date + "|" + amount + "|" + description.trim().toLowerCase();
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
