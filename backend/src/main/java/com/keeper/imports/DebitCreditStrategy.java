package com.keeper.imports;

import jakarta.inject.Singleton;
import java.util.List;
import java.util.Map;

/** Separate debit and credit columns (common in bank statements). */
@Singleton
public class DebitCreditStrategy implements CsvImportStrategy {
  @Override
  public String name() {
    return "date,debit,credit,description";
  }

  @Override
  public boolean supports(Map<String, Integer> header) {
    return header.containsKey("date")
        && (header.containsKey("debit") || header.containsKey("credit"));
  }

  @Override
  public RawRow read(List<String> cells, Map<String, Integer> header) {
    String debit = CsvImportStrategy.cell(cells, header, "debit", "withdrawal");
    String credit = CsvImportStrategy.cell(cells, header, "credit", "deposit");
    String amount = !debit.isBlank() ? "-" + debit.replace("-", "") : credit;
    return new RawRow(
        CsvImportStrategy.cell(cells, header, "date"),
        amount,
        CsvImportStrategy.cell(cells, header, "description", "payee", "memo", "name", "details"));
  }
}
