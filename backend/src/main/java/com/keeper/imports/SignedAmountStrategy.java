package com.keeper.imports;

import jakarta.inject.Singleton;
import java.util.List;
import java.util.Map;

/** date, amount (negative = out), description. */
@Singleton
public class SignedAmountStrategy implements CsvImportStrategy {
  @Override
  public String name() {
    return "date,amount,description";
  }

  @Override
  public boolean supports(Map<String, Integer> header) {
    return header.containsKey("date") && header.containsKey("amount");
  }

  @Override
  public RawRow read(List<String> cells, Map<String, Integer> header) {
    return new RawRow(
        CsvImportStrategy.cell(cells, header, "date"),
        CsvImportStrategy.cell(cells, header, "amount"),
        CsvImportStrategy.cell(cells, header, "description", "payee", "memo", "name", "details"));
  }
}
