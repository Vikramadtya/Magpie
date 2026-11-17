package com.keeper.imports;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

/** Which CSV column (by header text) holds what; used instead of auto-detection. */
@Serdeable
public record ColumnMapping(
    @NotBlank @Size(max = 200) String dateCol,
    @Nullable @Size(max = 200) String amountCol,
    @Nullable @Size(max = 200) String debitCol,
    @Nullable @Size(max = 200) String creditCol,
    @Nullable @Size(max = 200) String descCol) {

  private static boolean has(String s) {
    return s != null && !s.isBlank();
  }

  boolean valid() {
    return has(dateCol) && (has(amountCol) || has(debitCol) || has(creditCol));
  }

  private static String at(List<String> cells, Map<String, Integer> header, String col) {
    if (!has(col)) return "";
    Integer i = header.get(col.toLowerCase().trim());
    return i != null && i < cells.size() ? cells.get(i) : "";
  }

  CsvImportStrategy.RawRow read(List<String> cells, Map<String, Integer> header) {
    String amount;
    if (has(amountCol)) {
      amount = at(cells, header, amountCol);
    } else {
      String debit = at(cells, header, debitCol);
      String credit = at(cells, header, creditCol);
      amount = !debit.isBlank() ? "-" + debit.replace("-", "") : credit;
    }
    return new CsvImportStrategy.RawRow(
        at(cells, header, dateCol), amount, at(cells, header, descCol));
  }
}
